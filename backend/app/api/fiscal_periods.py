"""회계기간 관리 API

Sprint 7: 회계기간 CRUD + 마감/마감해제 + 연도별 자동 생성
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.accounting import FiscalPeriod
from app.schemas.chart_of_accounts import (
    FiscalPeriodCreate,
    FiscalPeriodResponse,
    FiscalPeriodListResponse,
)
from app.services.smartbooks_import import seed_fiscal_periods

router = APIRouter(prefix="/api/v1/fiscal-periods", tags=["fiscal-periods"])


@router.get("", response_model=FiscalPeriodListResponse)
async def list_periods(
    year: Optional[int] = Query(None, description="회계연도"),
    is_closed: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계기간 목록 조회"""
    q = select(FiscalPeriod).order_by(
        FiscalPeriod.fiscal_year.desc(),
        FiscalPeriod.period_month,
    )
    if year:
        q = q.where(FiscalPeriod.fiscal_year == year)
    if is_closed is not None:
        q = q.where(FiscalPeriod.is_closed == is_closed)

    result = await db.execute(q)
    items = result.scalars().all()
    return FiscalPeriodListResponse(items=items, total=len(items))


@router.get("/{period_id}", response_model=FiscalPeriodResponse)
async def get_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """회계기간 상세 조회"""
    result = await db.execute(
        select(FiscalPeriod).where(FiscalPeriod.period_id == period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(404, f"Fiscal period {period_id} not found")
    return period


@router.post("/generate", status_code=200)
async def generate_periods(
    year: int = Query(..., description="생성할 연도"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """특정 연도 12개월 회계기간 자동 생성"""

    result = await seed_fiscal_periods(db, year)
    return result


@router.post("/{period_id}/close", response_model=FiscalPeriodResponse)
async def close_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """회계기간 마감"""

    result = await db.execute(
        select(FiscalPeriod).where(FiscalPeriod.period_id == period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(404, f"Fiscal period {period_id} not found")
    if period.is_closed:
        raise HTTPException(400, "이미 마감된 기간입니다")

    period.is_closed = True
    period.closed_at = datetime.utcnow()
    period.closed_by = current_user.id
    await db.commit()
    await db.refresh(period)
    return period


@router.post("/{period_id}/reopen", response_model=FiscalPeriodResponse)
async def reopen_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """회계기간 마감 해제"""

    result = await db.execute(
        select(FiscalPeriod).where(FiscalPeriod.period_id == period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(404, f"Fiscal period {period_id} not found")
    if not period.is_closed:
        raise HTTPException(400, "마감되지 않은 기간입니다")

    period.is_closed = False
    period.closed_at = None
    period.closed_by = None
    await db.commit()
    await db.refresh(period)
    return period
