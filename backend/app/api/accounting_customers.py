"""회계 고객 API

Sprint 9: 회계 고객 CRUD + SmartBooks 추출
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.accounting_parties import AccountingCustomer
from app.schemas.accounting_parties import (
    AccCustomerCreate, AccCustomerResponse, AccCustomerListResponse,
)

router = APIRouter(prefix="/api/v1/accounting-customers", tags=["accounting-customers"])


@router.get("", response_model=AccCustomerListResponse)
async def list_customers(
    search: Optional[str] = Query(None),
    is_mapped: Optional[bool] = Query(None, description="MSSQL clients 매핑 여부"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계 고객 목록"""
    q = select(AccountingCustomer).order_by(AccountingCustomer.tax_id)

    if search:
        like = f"%{search}%"
        q = q.where(
            (AccountingCustomer.tax_id.ilike(like))
            | (AccountingCustomer.customer_name_vn.ilike(like))
            | (AccountingCustomer.customer_name_en.ilike(like))
        )
    if is_mapped is True:
        q = q.where(AccountingCustomer.mssql_client_ref.isnot(None))
    elif is_mapped is False:
        q = q.where(AccountingCustomer.mssql_client_ref.is_(None))

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return AccCustomerListResponse(items=result.scalars().all(), total=total)


@router.get("/{customer_id}", response_model=AccCustomerResponse)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계 고객 상세"""
    result = await db.execute(
        select(AccountingCustomer).where(
            AccountingCustomer.customer_id == customer_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, f"Accounting customer {customer_id} not found")
    return customer


@router.post("", response_model=AccCustomerResponse, status_code=201)
async def create_customer(
    payload: AccCustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계 고객 생성"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 생성 가능")

    existing = await db.execute(
        select(AccountingCustomer).where(
            AccountingCustomer.tax_id == payload.tax_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Tax ID {payload.tax_id} already exists")

    customer = AccountingCustomer(**payload.model_dump(), source="manual")
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.post("/extract-from-journal")
async def extract_customers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개장에서 Customer ID 추출 → 회계 고객 시딩"""
    if current_user.role != "admin":
        raise HTTPException(403, "admin만 추출 실행 가능")

    from app.services.party_matcher import extract_customers_from_journal
    return await extract_customers_from_journal(db)
