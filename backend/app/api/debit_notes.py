"""Debit Note 생성/검토/승인 API (설계서 3.4 - FR-015~FR-032)

핵심 계산 로직:
- BC = SUM(M:AT) → total_usd
- BD = BC * 환율 → total_vnd
- BE = SUM(Z:AT) * 환율 * 8% → vat_amount (현지비용만 VAT)
- BF = BD + BE → grand_total_vnd
"""
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.client import Client
from app.models.shipment import Shipment, ShipmentFeeDetail
from app.models.fee import FeeItem
from app.models.debit_note import DebitNote, DebitNoteLine, DebitNoteWorkflow
from app.schemas.debit_note import (
    DebitNoteCreate, DebitNoteResponse, DebitNoteListResponse,
    DebitNoteLineResponse, WorkflowAction, DebitNoteWorkflowResponse,
)
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/v1/debit-notes", tags=["debit-notes"])

VAT_RATE = Decimal("0.08")


def generate_debit_note_number(debit_note_id: int) -> str:
    """DN-YYYYMM-XXXXX 형식 자동 생성"""
    now = date.today()
    return f"DN-{now.strftime('%Y%m')}-{debit_note_id:05d}"


async def calculate_line(
    shipment: Shipment,
    exchange_rate: Decimal,
    db: AsyncSession,
) -> dict:
    """선적 1건의 비용 계산 (NEXCON 기술사양서 수식 체계)

    IMPORT:
      BC = SUM(M:AT)  → freight + local charges
      BD = BC * 환율
      BE = SUM(Z:AT) * 환율 * 8%   (현지비용만 VAT)
      BF = BD + BE
    """
    # fee_details 로드
    result = await db.execute(
        select(ShipmentFeeDetail)
        .options(selectinload(ShipmentFeeDetail.fee_item))
        .where(ShipmentFeeDetail.shipment_id == shipment.shipment_id)
    )
    fee_details = result.scalars().all()

    freight_usd = Decimal("0")
    local_charges_usd = Decimal("0")
    pay_on_behalf = Decimal("0")

    for fd in fee_details:
        amount = fd.amount_usd or Decimal("0")
        if fd.fee_item and fd.fee_item.item_code == "PAY_ON_BEHALF":
            pay_on_behalf += amount
        elif fd.fee_item and not fd.fee_item.is_vat_applicable:
            freight_usd += amount  # Freight (VAT 0%)
        else:
            local_charges_usd += amount  # Local charges (VAT 8%)

    total_usd = freight_usd + local_charges_usd + pay_on_behalf  # BC
    total_vnd = int(total_usd * exchange_rate)  # BD
    vat_amount = int(local_charges_usd * exchange_rate * VAT_RATE)  # BE
    grand_total_vnd = total_vnd + vat_amount  # BF

    return {
        "total_usd": total_usd,
        "total_vnd": total_vnd,
        "vat_amount": vat_amount,
        "grand_total_vnd": grand_total_vnd,
        "freight_usd": freight_usd,
        "local_charges_usd": local_charges_usd,
        "pay_on_behalf": pay_on_behalf,
    }


@router.post("", response_model=DebitNoteResponse, status_code=201)
async def create_debit_note(
    data: DebitNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """Debit Note 생성 (FR-015, FR-020)

    1. 거래처별 거래 필터링
    2. 환율 적용 및 계산
    3. DRAFT 상태 생성
    """
    # 거래처 확인
    client = (await db.execute(
        select(Client).where(Client.client_id == data.client_id)
    )).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 거래처별 기간 내 ACTIVE 거래 필터링 (FR-015)
    shipment_query = select(Shipment).where(
        Shipment.client_id == data.client_id,
        Shipment.status == "ACTIVE",
        Shipment.delivery_date >= data.period_from,
        Shipment.delivery_date <= data.period_to,
    )
    if data.sheet_type != "ALL":
        shipment_query = shipment_query.where(Shipment.shipment_type == data.sheet_type)

    result = await db.execute(shipment_query.order_by(Shipment.delivery_date))
    shipments = result.scalars().all()

    if not shipments:
        raise HTTPException(status_code=400, detail="No active shipments found for the given period")

    # Debit Note 헤더 생성
    debit_note = DebitNote(
        client_id=data.client_id,
        period_from=data.period_from,
        period_to=data.period_to,
        exchange_rate=data.exchange_rate,
        sheet_type=data.sheet_type,
        status="DRAFT",
        created_by=current_user.user_id,
        notes=data.notes,
    )
    db.add(debit_note)
    await db.flush()

    # 자동 번호 생성
    debit_note.debit_note_number = generate_debit_note_number(debit_note.debit_note_id)

    # 라인별 계산 (FR-016 ~ FR-019)
    sum_usd = Decimal("0")
    sum_vnd = Decimal("0")
    sum_vat = Decimal("0")
    sum_grand = Decimal("0")

    for idx, shipment in enumerate(shipments, 1):
        calc = await calculate_line(shipment, data.exchange_rate, db)

        line = DebitNoteLine(
            debit_note_id=debit_note.debit_note_id,
            shipment_id=shipment.shipment_id,
            line_no=idx,
            **calc,
        )
        db.add(line)

        sum_usd += calc["total_usd"]
        sum_vnd += calc["total_vnd"]
        sum_vat += calc["vat_amount"]
        sum_grand += calc["grand_total_vnd"]

        # 거래 상태를 BILLED로 변경
        shipment.status = "BILLED"

    # 헤더 합계 업데이트 (FR-018)
    debit_note.total_usd = sum_usd
    debit_note.total_vnd = sum_vnd
    debit_note.total_vat = sum_vat
    debit_note.grand_total_vnd = sum_grand
    debit_note.total_lines = len(shipments)

    # 워크플로우 기록
    workflow = DebitNoteWorkflow(
        debit_note_id=debit_note.debit_note_id,
        action="CREATED",
        from_status=None,
        to_status="DRAFT",
        performed_by=current_user.user_id,
    )
    db.add(workflow)

    await db.commit()

    # Reload
    result = await db.execute(
        select(DebitNote).options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note.debit_note_id)
    )
    dn = result.scalar_one()

    resp = DebitNoteResponse.model_validate(dn)
    resp.client_name = client.client_name
    resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
    return resp


@router.get("", response_model=DebitNoteListResponse)
async def list_debit_notes(
    client_id: int = Query(None),
    status: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(DebitNote).options(selectinload(DebitNote.lines))

    if client_id:
        query = query.where(DebitNote.client_id == client_id)
    if status:
        query = query.where(DebitNote.status == status)

    query = query.order_by(DebitNote.created_at.desc())
    total, debit_notes = await paginate(db, query, skip, limit)

    items = []
    for dn in debit_notes:
        resp = DebitNoteResponse.model_validate(dn)
        resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
        items.append(resp)

    return DebitNoteListResponse(total=total, items=items)


@router.get("/{debit_note_id}", response_model=DebitNoteResponse)
async def get_debit_note(
    debit_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DebitNote).options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note_id)
    )
    dn = result.scalar_one_or_none()
    if not dn:
        raise HTTPException(status_code=404, detail="Debit Note not found")

    resp = DebitNoteResponse.model_validate(dn)
    resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
    return resp


@router.post("/{debit_note_id}/submit-for-review", response_model=DebitNoteResponse)
async def submit_for_review(
    debit_note_id: int,
    body: WorkflowAction = WorkflowAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """검토 제출 (DRAFT → PENDING_REVIEW)"""
    result = await db.execute(
        select(DebitNote).options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note_id)
    )
    dn = result.scalar_one_or_none()
    if not dn:
        raise HTTPException(status_code=404, detail="Debit Note not found")
    if dn.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot submit: current status is {dn.status}")

    dn.status = "PENDING_REVIEW"

    workflow = DebitNoteWorkflow(
        debit_note_id=dn.debit_note_id,
        action="SUBMITTED",
        from_status="DRAFT",
        to_status="PENDING_REVIEW",
        performed_by=current_user.user_id,
        comment=body.comment,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(dn)

    resp = DebitNoteResponse.model_validate(dn)
    resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
    return resp


@router.post("/{debit_note_id}/approve", response_model=DebitNoteResponse)
async def approve_debit_note(
    debit_note_id: int,
    body: WorkflowAction = WorkflowAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "pic")),
):
    """승인 (PENDING_REVIEW → APPROVED) - 생성자 ≠ 승인자 (이중 승인)"""
    result = await db.execute(
        select(DebitNote).options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note_id)
    )
    dn = result.scalar_one_or_none()
    if not dn:
        raise HTTPException(status_code=404, detail="Debit Note not found")
    if dn.status != "PENDING_REVIEW":
        raise HTTPException(status_code=400, detail=f"Cannot approve: current status is {dn.status}")
    if dn.created_by == current_user.user_id:
        raise HTTPException(status_code=400, detail="Creator cannot approve their own Debit Note")

    dn.status = "APPROVED"
    dn.approved_by = current_user.user_id
    dn.approved_at = datetime.utcnow()

    workflow = DebitNoteWorkflow(
        debit_note_id=dn.debit_note_id,
        action="APPROVED",
        from_status="PENDING_REVIEW",
        to_status="APPROVED",
        performed_by=current_user.user_id,
        comment=body.comment,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(dn)

    resp = DebitNoteResponse.model_validate(dn)
    resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
    return resp


@router.post("/{debit_note_id}/reject", response_model=DebitNoteResponse)
async def reject_debit_note(
    debit_note_id: int,
    body: WorkflowAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "pic")),
):
    """거절 (PENDING_REVIEW → REJECTED)"""
    result = await db.execute(
        select(DebitNote).options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note_id)
    )
    dn = result.scalar_one_or_none()
    if not dn:
        raise HTTPException(status_code=404, detail="Debit Note not found")
    if dn.status != "PENDING_REVIEW":
        raise HTTPException(status_code=400, detail=f"Cannot reject: current status is {dn.status}")

    dn.status = "REJECTED"
    dn.rejection_reason = body.comment

    # REJECTED 시 관련 거래를 다시 ACTIVE로 복원
    for line in dn.lines:
        shipment_result = await db.execute(
            select(Shipment).where(Shipment.shipment_id == line.shipment_id)
        )
        shipment = shipment_result.scalar_one_or_none()
        if shipment:
            shipment.status = "ACTIVE"

    workflow = DebitNoteWorkflow(
        debit_note_id=dn.debit_note_id,
        action="REJECTED",
        from_status="PENDING_REVIEW",
        to_status="REJECTED",
        performed_by=current_user.user_id,
        comment=body.comment,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(dn)

    resp = DebitNoteResponse.model_validate(dn)
    resp.lines = [DebitNoteLineResponse.model_validate(l) for l in dn.lines]
    return resp


@router.get("/{debit_note_id}/workflows", response_model=list[DebitNoteWorkflowResponse])
async def get_workflows(
    debit_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """워크플로우 이력 조회 (FR-032)"""
    result = await db.execute(
        select(DebitNoteWorkflow)
        .where(DebitNoteWorkflow.debit_note_id == debit_note_id)
        .order_by(DebitNoteWorkflow.created_at)
    )
    workflows = result.scalars().all()
    return [DebitNoteWorkflowResponse.model_validate(w) for w in workflows]
