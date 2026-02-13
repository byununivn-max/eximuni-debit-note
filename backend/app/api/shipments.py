"""거래 데이터 API (설계서 3.4 - FR-007~FR-011)

중복 HBL/MBL/INV/CD 감지 포함
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.shipment import Shipment, ShipmentFeeDetail, DuplicateDetection
from app.models.fee import FeeItem
from app.schemas.shipment import (
    ShipmentCreate, ShipmentUpdate, ShipmentResponse,
    ShipmentListResponse, FeeDetailResponse, DuplicateWarning,
)
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/v1/shipments", tags=["shipments"])


async def detect_duplicates(db: AsyncSession, shipment: Shipment) -> list[DuplicateWarning]:
    """중복 HBL, MBL, INV, CD 감지 (FR-009)"""
    warnings = []
    checks = [
        ("HBL", shipment.hbl),
        ("MBL", shipment.mbl),
        ("INV", shipment.invoice_no),
        ("CD", shipment.cd_no),
    ]

    for dup_type, value in checks:
        if not value:
            continue
        field = getattr(Shipment, {
            "HBL": "hbl", "MBL": "mbl", "INV": "invoice_no", "CD": "cd_no"
        }[dup_type])

        query = select(Shipment).where(
            field == value,
            Shipment.client_id == shipment.client_id,
            Shipment.status != "CANCELLED",
        )
        if shipment.shipment_id:
            query = query.where(Shipment.shipment_id != shipment.shipment_id)

        result = await db.execute(query)
        duplicates = result.scalars().all()

        for dup in duplicates:
            warnings.append(DuplicateWarning(
                duplicate_type=dup_type,
                duplicate_value=value,
                existing_shipment_id=dup.shipment_id,
            ))

            # 기록 저장
            detection = DuplicateDetection(
                shipment_id=shipment.shipment_id,
                duplicate_shipment_id=dup.shipment_id,
                duplicate_type=dup_type,
                duplicate_value=value,
            )
            db.add(detection)

    if warnings:
        shipment.is_duplicate = True

    return warnings


@router.get("", response_model=ShipmentListResponse)
async def list_shipments(
    client_id: int = Query(None),
    shipment_type: str = Query(None),
    status: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Shipment).options(selectinload(Shipment.fee_details))

    if client_id:
        query = query.where(Shipment.client_id == client_id)
    if shipment_type:
        query = query.where(Shipment.shipment_type == shipment_type)
    if status:
        query = query.where(Shipment.status == status)

    query = query.order_by(Shipment.delivery_date.desc())
    total, shipments = await paginate(db, query, skip, limit)

    items = []
    for s in shipments:
        resp = ShipmentResponse.model_validate(s)
        resp.fee_details = [FeeDetailResponse.model_validate(fd) for fd in s.fee_details]
        items.append(resp)

    return ShipmentListResponse(total=total, items=items)


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Shipment).options(selectinload(Shipment.fee_details))
        .where(Shipment.shipment_id == shipment_id)
    )
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    resp = ShipmentResponse.model_validate(shipment)
    resp.fee_details = [FeeDetailResponse.model_validate(fd) for fd in shipment.fee_details]
    return resp


@router.post("", response_model=ShipmentResponse, status_code=201)
async def create_shipment(
    data: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment_data = data.model_dump(exclude={"fee_details"})
    shipment = Shipment(**shipment_data, created_by=current_user.user_id)
    db.add(shipment)
    await db.flush()

    # Fee details
    for fd in data.fee_details or []:
        fee_detail = ShipmentFeeDetail(
            shipment_id=shipment.shipment_id,
            **fd.model_dump(),
        )
        # 세후→세전 자동 변환 (FR-017: Handling/D/O ÷1.08)
        if fd.is_tax_inclusive and fd.amount_usd > 0:
            fee_detail.pre_tax_amount = fd.amount_usd / 1.08
        db.add(fee_detail)

    await db.flush()

    # 중복 감지
    warnings = await detect_duplicates(db, shipment)

    await db.commit()
    await db.refresh(shipment)

    # Reload with fee_details
    result = await db.execute(
        select(Shipment).options(selectinload(Shipment.fee_details))
        .where(Shipment.shipment_id == shipment.shipment_id)
    )
    shipment = result.scalar_one()

    resp = ShipmentResponse.model_validate(shipment)
    resp.fee_details = [FeeDetailResponse.model_validate(fd) for fd in shipment.fee_details]
    resp.duplicates = warnings
    return resp


@router.put("/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: int,
    data: ShipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Shipment).options(selectinload(Shipment.fee_details))
        .where(Shipment.shipment_id == shipment_id)
    )
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if shipment.status == "BILLED":
        raise HTTPException(status_code=400, detail="Cannot modify billed shipment")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(shipment, key, value)

    await db.commit()
    await db.refresh(shipment)

    resp = ShipmentResponse.model_validate(shipment)
    resp.fee_details = [FeeDetailResponse.model_validate(fd) for fd in shipment.fee_details]
    return resp


@router.delete("/{shipment_id}", status_code=204)
async def delete_shipment(
    shipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Shipment).where(Shipment.shipment_id == shipment_id))
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if shipment.status == "BILLED":
        raise HTTPException(status_code=400, detail="Cannot delete billed shipment")

    shipment.status = "CANCELLED"
    await db.commit()
