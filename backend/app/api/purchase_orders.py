"""매입주문 CRUD + 승인 API (Sprint 3)"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.buying import PurchaseOrder, PurchaseItem, Supplier
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate,
    PurchaseOrderResponse, PurchaseOrderListResponse,
)

router = APIRouter(prefix="/api/v1/purchase-orders", tags=["purchase-orders"])


async def _generate_po_number(db: AsyncSession) -> str:
    """PO 번호 자동 생성 (PO-YYYYMM-XXXXX)"""
    now = datetime.utcnow()
    prefix = f"PO-{now.strftime('%Y%m')}-"
    result = await db.execute(
        select(func.count(PurchaseOrder.po_id)).where(
            PurchaseOrder.po_number.like(f"{prefix}%")
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{(count + 1):05d}"


def _po_to_response(po: PurchaseOrder) -> PurchaseOrderResponse:
    """PO 모델 → 응답 변환 (supplier_name 포함)"""
    data = PurchaseOrderResponse.model_validate(po)
    if po.supplier:
        data.supplier_name = po.supplier.supplier_name
    return data


@router.get("", response_model=PurchaseOrderListResponse)
async def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    supplier_id: int = Query(None, description="공급사 ID 필터"),
    status: str = Query(None, description="상태 필터 (DRAFT/CONFIRMED/CANCELLED)"),
    payment_status: str = Query(None, description="결제 상태 (UNPAID/PARTIAL/PAID)"),
    search: str = Query(None, description="PO번호/Invoice 검색"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 목록 조회"""
    query = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.supplier),
        selectinload(PurchaseOrder.items),
    )
    count_query = select(func.count(PurchaseOrder.po_id))

    filters = []
    if supplier_id:
        filters.append(PurchaseOrder.supplier_id == supplier_id)
    if status:
        filters.append(PurchaseOrder.status == status)
    if payment_status:
        filters.append(PurchaseOrder.payment_status == payment_status)
    if search:
        filters.append(
            PurchaseOrder.po_number.ilike(f"%{search}%")
            | PurchaseOrder.invoice_no.ilike(f"%{search}%")
        )

    for f in filters:
        query = query.where(f)
        count_query = count_query.where(f)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(PurchaseOrder.po_id.desc())
        .offset(skip).limit(limit)
    )
    pos = result.scalars().unique().all()

    return PurchaseOrderListResponse(
        total=total,
        items=[_po_to_response(po) for po in pos],
    )


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 상세 조회"""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return _po_to_response(po)


@router.post("", response_model=PurchaseOrderResponse, status_code=201)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 생성"""
    # 공급사 존재 확인
    supplier = await db.execute(
        select(Supplier).where(Supplier.supplier_id == data.supplier_id)
    )
    if not supplier.scalar_one_or_none():
        raise HTTPException(
            status_code=404, detail="Supplier not found"
        )

    po_number = await _generate_po_number(db)
    items_data = data.items
    po_data = data.model_dump(exclude={"items"})

    po = PurchaseOrder(**po_data, po_number=po_number, created_by=current_user.user_id)
    db.add(po)
    await db.flush()

    for item_data in items_data:
        item = PurchaseItem(**item_data.model_dump(), po_id=po.po_id)
        db.add(item)

    await db.commit()

    # 생성된 PO 다시 로드 (supplier, items 포함)
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po.po_id)
    )
    po = result.scalar_one()
    return _po_to_response(po)


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: int,
    data: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 수정 (DRAFT 상태에서만)"""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT orders can be modified",
        )

    update_data = data.model_dump(exclude_unset=True, exclude={"items"})
    for key, value in update_data.items():
        setattr(po, key, value)

    # 항목 업데이트 (전체 교체)
    if data.items is not None:
        for item in po.items:
            await db.delete(item)
        await db.flush()
        for item_data in data.items:
            item = PurchaseItem(**item_data.model_dump(), po_id=po.po_id)
            db.add(item)

    await db.commit()

    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one()
    return _po_to_response(po)


@router.post("/{po_id}/confirm", response_model=PurchaseOrderResponse)
async def confirm_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 확정"""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm order in '{po.status}' status",
        )

    po.status = "CONFIRMED"
    po.approved_by = current_user.user_id
    po.approved_at = datetime.utcnow()

    await db.commit()

    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one()
    return _po_to_response(po)


@router.post("/{po_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매입주문 취소"""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == "CANCELLED":
        raise HTTPException(
            status_code=400, detail="Order already cancelled",
        )

    po.status = "CANCELLED"
    await db.commit()

    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
        )
        .where(PurchaseOrder.po_id == po_id)
    )
    po = result.scalar_one()
    return _po_to_response(po)
