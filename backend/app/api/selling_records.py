"""매출 종합 API

erp_selling_records CRUD + MSSQL 동기화 트리거
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db, get_mssql_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.selling import SellingRecord, SellingItem
from app.schemas.selling import (
    SellingRecordResponse,
    SellingRecordListItem,
    SellingRecordListResponse,
    SyncResultResponse,
    SellingSummaryItem,
    SellingSummaryResponse,
)
from app.services.selling_sync import sync_selling_records

router = APIRouter(prefix="/api/v1/selling-records", tags=["selling"])


@router.get("", response_model=SellingRecordListResponse)
async def list_selling_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    record_type: Optional[str] = Query(
        None, description="유형 필터 (clearance/ops/co)",
    ),
    customer: Optional[str] = Query(None, description="고객명 검색"),
    date_from: Optional[date] = Query(None, description="시작일"),
    date_to: Optional[date] = Query(None, description="종료일"),
    search: Optional[str] = Query(
        None, description="고객명/인보이스 검색",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매출 레코드 목록 조회 (필터, 검색, 페이지네이션)"""
    query = select(SellingRecord)

    filters = []
    if record_type:
        filters.append(SellingRecord.record_type == record_type)
    if customer:
        filters.append(
            SellingRecord.customer_name.ilike(f"%{customer}%")
        )
    if date_from:
        filters.append(SellingRecord.service_date >= date_from)
    if date_to:
        filters.append(SellingRecord.service_date <= date_to)
    if search:
        filters.append(or_(
            SellingRecord.customer_name.ilike(f"%{search}%"),
            SellingRecord.invoice_no.ilike(f"%{search}%"),
        ))

    if filters:
        query = query.where(and_(*filters))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    query = (
        query.order_by(SellingRecord.selling_id.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    records = result.unique().scalars().all()

    return SellingRecordListResponse(
        total=total,
        items=[SellingRecordListItem.model_validate(r) for r in records],
    )


@router.get("/summary", response_model=SellingSummaryResponse)
async def selling_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """유형별 매출 집계"""
    query = select(
        SellingRecord.record_type,
        func.count(SellingRecord.selling_id).label("count"),
        func.coalesce(
            func.sum(SellingRecord.total_selling_vnd), 0
        ).label("total_vnd"),
    ).group_by(SellingRecord.record_type)

    filters = []
    if date_from:
        filters.append(SellingRecord.service_date >= date_from)
    if date_to:
        filters.append(SellingRecord.service_date <= date_to)
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    rows = result.all()

    items = [
        SellingSummaryItem(
            record_type=row.record_type,
            count=row.count,
            total_vnd=Decimal(str(row.total_vnd)),
        )
        for row in rows
    ]

    grand_total = sum(i.total_vnd for i in items)
    total_records = sum(i.count for i in items)

    return SellingSummaryResponse(
        items=items,
        grand_total_vnd=grand_total,
        total_records=total_records,
    )


@router.get("/{selling_id}", response_model=SellingRecordResponse)
async def get_selling_record(
    selling_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매출 레코드 상세 조회 (items 포함)"""
    query = (
        select(SellingRecord)
        .options(selectinload(SellingRecord.items))
        .where(SellingRecord.selling_id == selling_id)
    )
    result = await db.execute(query)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Selling record {selling_id} not found",
        )

    return SellingRecordResponse.model_validate(record)


@router.post("/sync", response_model=SyncResultResponse)
async def trigger_sync(
    mssql_db: Session = Depends(get_mssql_db),
    pg_db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """MSSQL → PostgreSQL 매출 데이터 전체 동기화"""
    result = await sync_selling_records(mssql_db, pg_db)
    return SyncResultResponse(**result)
