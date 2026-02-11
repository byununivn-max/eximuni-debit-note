"""대시보드 API

매출/매입/영업이익 KPI 집계 + 월별 추이 + 고객별 수익
"""
from datetime import date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.profit_calc import (
    get_kpi_summary,
    get_monthly_trend,
    get_customer_profit,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


# ============================================================
# Response Schemas (대시보드 전용, 별도 파일 불필요)
# ============================================================
class KpiResponse(BaseModel):
    """KPI 요약 응답"""
    total_selling_vnd: Decimal
    total_buying_vnd: Decimal
    gross_profit_vnd: Decimal
    gp_margin_pct: Decimal
    selling_count: int
    buying_count: int


class MonthlyTrendItem(BaseModel):
    """월별 추이 항목"""
    month: int
    selling: float
    buying: float
    profit: float


class CustomerProfitItem(BaseModel):
    """고객별 매출 항목"""
    customer_name: str
    total_vnd: float
    count: int


# ============================================================
# Endpoints
# ============================================================
@router.get("/kpi", response_model=KpiResponse)
async def dashboard_kpi(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI 요약: 매출/매입/영업이익/GP마진"""
    result = await get_kpi_summary(db, date_from, date_to)
    return KpiResponse(**result)


@router.get("/monthly-trend", response_model=List[MonthlyTrendItem])
async def dashboard_monthly_trend(
    year: Optional[int] = Query(None, description="연도 (기본: 올해)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 매출/매입/영업이익 추이"""
    result = await get_monthly_trend(db, year)
    return [MonthlyTrendItem(**item) for item in result]


@router.get(
    "/customer-profit",
    response_model=List[CustomerProfitItem],
)
async def dashboard_customer_profit(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """고객별 매출 TOP N"""
    result = await get_customer_profit(db, limit)
    return [CustomerProfitItem(**item) for item in result]
