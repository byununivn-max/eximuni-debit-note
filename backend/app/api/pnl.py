"""P&L 손익계산 API

Sprint 11: 월별 P&L 조회 + 계산 실행 + YTD 누계
"""
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.pnl import MonthlyPnL

router = APIRouter(prefix="/api/v1/pnl", tags=["pnl"])


# ============================================================
# 응답 스키마 (API 파일 내 정의 — 모델 수가 적으므로)
# ============================================================
class MonthlyPnLResponse(BaseModel):
    """월별 P&L 응답"""
    pnl_id: int
    fiscal_year: int
    fiscal_month: int
    revenue_total: Decimal
    revenue_logistics: Decimal
    revenue_bcqt: Decimal
    revenue_other: Decimal
    cogs_total: Decimal
    gross_profit: Decimal
    fixed_cost_allocated: Decimal
    variable_cost_total: Decimal
    operating_profit: Decimal
    financial_income: Decimal
    financial_expense: Decimal
    other_income_expense: Decimal
    net_profit: Decimal
    ytd_revenue: Decimal
    ytd_cogs: Decimal
    ytd_gross_profit: Decimal
    ytd_operating_profit: Decimal
    ytd_net_profit: Decimal

    model_config = {"from_attributes": True}


class PnLSummaryItem(BaseModel):
    """P&L 요약 항목 (KPI용)"""
    fiscal_month: int
    revenue: float
    cogs: float
    gross_profit: float
    gp_margin: float
    operating_profit: float
    net_profit: float
    net_margin: float


class PnLYearSummary(BaseModel):
    """연간 P&L 요약"""
    fiscal_year: int
    months: List[PnLSummaryItem]
    ytd_revenue: float
    ytd_cogs: float
    ytd_gross_profit: float
    ytd_gp_margin: float
    ytd_operating_profit: float
    ytd_net_profit: float
    ytd_net_margin: float


# ============================================================
# API 엔드포인트
# ============================================================
@router.get("/monthly", response_model=List[MonthlyPnLResponse])
async def list_monthly_pnl(
    fiscal_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """연도별 월별 P&L 목록"""
    q = (
        select(MonthlyPnL)
        .where(MonthlyPnL.fiscal_year == fiscal_year)
        .order_by(MonthlyPnL.fiscal_month)
    )
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/monthly/{fiscal_year}/{fiscal_month}", response_model=MonthlyPnLResponse)
async def get_monthly_pnl(
    fiscal_year: int,
    fiscal_month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 월 P&L 상세"""
    result = await db.execute(
        select(MonthlyPnL).where(
            MonthlyPnL.fiscal_year == fiscal_year,
            MonthlyPnL.fiscal_month == fiscal_month,
        )
    )
    pnl = result.scalar_one_or_none()
    if not pnl:
        raise HTTPException(
            404,
            f"P&L for {fiscal_year}-{fiscal_month:02d} not found. Run calculate first.",
        )
    return pnl


@router.get("/year-summary", response_model=PnLYearSummary)
async def year_summary(
    fiscal_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """연간 P&L 요약 (월별 추이 + YTD)"""
    q = (
        select(MonthlyPnL)
        .where(MonthlyPnL.fiscal_year == fiscal_year)
        .order_by(MonthlyPnL.fiscal_month)
    )
    result = await db.execute(q)
    rows = result.scalars().all()

    months = []
    for r in rows:
        rev = float(r.revenue_total)
        cogs_val = float(r.cogs_total)
        gp_val = float(r.gross_profit)
        op_val = float(r.operating_profit)
        net_val = float(r.net_profit)
        months.append(PnLSummaryItem(
            fiscal_month=r.fiscal_month,
            revenue=rev,
            cogs=cogs_val,
            gross_profit=gp_val,
            gp_margin=(gp_val / rev * 100) if rev else 0,
            operating_profit=op_val,
            net_profit=net_val,
            net_margin=(net_val / rev * 100) if rev else 0,
        ))

    # YTD 합계
    ytd_rev = sum(m.revenue for m in months)
    ytd_cogs = sum(m.cogs for m in months)
    ytd_gp = sum(m.gross_profit for m in months)
    ytd_op = sum(m.operating_profit for m in months)
    ytd_net = sum(m.net_profit for m in months)

    return PnLYearSummary(
        fiscal_year=fiscal_year,
        months=months,
        ytd_revenue=ytd_rev,
        ytd_cogs=ytd_cogs,
        ytd_gross_profit=ytd_gp,
        ytd_gp_margin=(ytd_gp / ytd_rev * 100) if ytd_rev else 0,
        ytd_operating_profit=ytd_op,
        ytd_net_profit=ytd_net,
        ytd_net_margin=(ytd_net / ytd_rev * 100) if ytd_rev else 0,
    )


@router.post("/calculate")
async def calculate_pnl(
    fiscal_year: int = Query(...),
    fiscal_month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """월별 P&L 계산 실행"""

    from app.services.pnl_calculator import calculate_monthly_pnl
    return await calculate_monthly_pnl(db, fiscal_year, fiscal_month)


@router.post("/calculate-year")
async def calculate_year_pnl(
    fiscal_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """연간 P&L 일괄 계산 (1~12월 순차)"""

    from app.services.pnl_calculator import calculate_monthly_pnl
    results = []
    for m in range(1, 13):
        result = await calculate_monthly_pnl(db, fiscal_year, m)
        results.append(result)

    return {
        "fiscal_year": fiscal_year,
        "months_calculated": len(results),
        "results": results,
    }
