"""회계 공급사 API

Sprint 9: 회계 공급사 CRUD + SmartBooks 추출 + ERP 매칭
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.accounting_parties import AccountingVendor
from app.schemas.accounting_parties import (
    AccVendorCreate, AccVendorResponse, AccVendorListResponse, MatchResult,
)

router = APIRouter(prefix="/api/v1/accounting-vendors", tags=["accounting-vendors"])


@router.get("", response_model=AccVendorListResponse)
async def list_vendors(
    search: Optional[str] = Query(None),
    is_mapped: Optional[bool] = Query(None, description="ERP 공급사 매핑 여부"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계 공급사 목록"""
    q = select(AccountingVendor).order_by(AccountingVendor.tax_id)

    if search:
        like = f"%{search}%"
        q = q.where(
            (AccountingVendor.tax_id.ilike(like))
            | (AccountingVendor.vendor_name_vn.ilike(like))
            | (AccountingVendor.vendor_name_en.ilike(like))
        )
    if is_mapped is True:
        q = q.where(AccountingVendor.mssql_supplier_ref.isnot(None))
    elif is_mapped is False:
        q = q.where(AccountingVendor.mssql_supplier_ref.is_(None))

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return AccVendorListResponse(items=result.scalars().all(), total=total)


@router.get("/{vendor_id}", response_model=AccVendorResponse)
async def get_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계 공급사 상세"""
    result = await db.execute(
        select(AccountingVendor).where(AccountingVendor.vendor_id == vendor_id)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(404, f"Accounting vendor {vendor_id} not found")
    return vendor


@router.post("", response_model=AccVendorResponse, status_code=201)
async def create_vendor(
    payload: AccVendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """회계 공급사 생성"""

    existing = await db.execute(
        select(AccountingVendor).where(AccountingVendor.tax_id == payload.tax_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Tax ID {payload.tax_id} already exists")

    vendor = AccountingVendor(**payload.model_dump(), source="manual")
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.post("/extract-from-journal")
async def extract_vendors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """분개장에서 Vendor ID 추출 → 회계 공급사 시딩"""

    from app.services.party_matcher import extract_vendors_from_journal
    return await extract_vendors_from_journal(db)


@router.post("/match-suppliers", response_model=MatchResult)
async def match_suppliers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """회계 공급사 ↔ ERP 공급사 자동 매칭 (tax_id 기준)"""

    from app.services.party_matcher import match_vendors_to_suppliers
    result = await match_vendors_to_suppliers(db)
    return MatchResult(**result)
