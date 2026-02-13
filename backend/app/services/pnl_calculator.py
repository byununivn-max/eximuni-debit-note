"""P&L 계산 엔진

월별 손익계산:
  매출(Revenue) → 매출원가(COGS) → 매출총이익(GP)
  → 고정비(일할) → 변동비 → 영업이익
  → 금융수익/비용 → 순이익

Sprint 10의 비용분류(cost_allocator)와 연동하여
고정비 일할/변동비를 자동 반영한다.
"""
from decimal import Decimal
from datetime import datetime

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pnl import MonthlyPnL
from app.models.cost_management import MonthlyCostSummary
from app.services.revenue_aggregator import (
    aggregate_revenue_by_month,
    aggregate_cogs_by_month,
    aggregate_financial_by_month,
)


async def calculate_monthly_pnl(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> dict:
    """월별 P&L 계산 + erp_monthly_pnl 저장

    1. 매출 집계 (revenue_aggregator)
    2. 매출원가 집계 (COGS)
    3. 비용 집계 (Sprint 10 monthly_cost_summary 활용)
    4. 금융수익/비용 집계
    5. 손익 계산
    6. YTD 누계 계산
    7. erp_monthly_pnl에 upsert
    """
    # 1. 매출 집계
    revenue = await aggregate_revenue_by_month(db, fiscal_year, fiscal_month)

    # 2. 매출원가
    cogs = await aggregate_cogs_by_month(db, fiscal_year, fiscal_month)

    # 3. 매출총이익
    gp = revenue["revenue_total"] - cogs

    # 4. 비용 집계 — Sprint 10 MonthlyCostSummary에서 가져오기
    cost_q = (
        select(
            MonthlyCostSummary.cost_type,
            func.coalesce(
                func.sum(MonthlyCostSummary.total_amount), 0
            ).label("total"),
        )
        .where(
            MonthlyCostSummary.fiscal_year == fiscal_year,
            MonthlyCostSummary.fiscal_month == fiscal_month,
        )
        .group_by(MonthlyCostSummary.cost_type)
    )
    cost_result = await db.execute(cost_q)
    cost_by_type = {
        r.cost_type: Decimal(str(r.total)) for r in cost_result
    }

    fixed_cost = cost_by_type.get("fixed", Decimal("0"))
    variable_cost = cost_by_type.get("variable", Decimal("0"))
    semi_variable = cost_by_type.get("semi_variable", Decimal("0"))
    # 반변동비는 변동비에 포함
    variable_total = variable_cost + semi_variable

    # 5. 영업이익
    operating = gp - fixed_cost - variable_total

    # 6. 금융수익/비용
    financial = await aggregate_financial_by_month(db, fiscal_year, fiscal_month)
    fin_income = financial["financial_income"]
    fin_expense = financial["financial_expense"]

    # 기타 수익/비용 (현재는 0, 향후 확장)
    other = Decimal("0")

    # 7. 순이익
    net = operating + fin_income - fin_expense + other

    # 8. YTD 누계 — 1월~(month-1)월 기존 MonthlyPnL 합산
    ytd_q = (
        select(
            func.coalesce(func.sum(MonthlyPnL.revenue_total), 0).label("rev"),
            func.coalesce(func.sum(MonthlyPnL.cogs_total), 0).label("cogs"),
            func.coalesce(func.sum(MonthlyPnL.gross_profit), 0).label("gp"),
            func.coalesce(func.sum(MonthlyPnL.operating_profit), 0).label("op"),
            func.coalesce(func.sum(MonthlyPnL.net_profit), 0).label("net"),
        )
        .where(
            MonthlyPnL.fiscal_year == fiscal_year,
            MonthlyPnL.fiscal_month < fiscal_month,
        )
    )
    ytd_result = await db.execute(ytd_q)
    ytd = ytd_result.one()

    ytd_revenue = Decimal(str(ytd.rev)) + revenue["revenue_total"]
    ytd_cogs = Decimal(str(ytd.cogs)) + cogs
    ytd_gp = Decimal(str(ytd.gp)) + gp
    ytd_op = Decimal(str(ytd.op)) + operating
    ytd_net = Decimal(str(ytd.net)) + net

    # 9. 기존 해당월 삭제 후 재생성
    await db.execute(
        delete(MonthlyPnL).where(
            MonthlyPnL.fiscal_year == fiscal_year,
            MonthlyPnL.fiscal_month == fiscal_month,
        )
    )

    pnl = MonthlyPnL(
        fiscal_year=fiscal_year,
        fiscal_month=fiscal_month,
        revenue_total=revenue["revenue_total"],
        revenue_logistics=revenue["revenue_logistics"],
        revenue_bcqt=revenue["revenue_bcqt"],
        revenue_other=revenue["revenue_other"],
        cogs_total=cogs,
        gross_profit=gp,
        fixed_cost_allocated=fixed_cost,
        variable_cost_total=variable_total,
        operating_profit=operating,
        financial_income=fin_income,
        financial_expense=fin_expense,
        other_income_expense=other,
        net_profit=net,
        ytd_revenue=ytd_revenue,
        ytd_cogs=ytd_cogs,
        ytd_gross_profit=ytd_gp,
        ytd_operating_profit=ytd_op,
        ytd_net_profit=ytd_net,
    )
    db.add(pnl)
    await db.commit()

    return {
        "fiscal_year": fiscal_year,
        "fiscal_month": fiscal_month,
        "revenue_total": float(revenue["revenue_total"]),
        "cogs_total": float(cogs),
        "gross_profit": float(gp),
        "gp_margin": float(
            (gp / revenue["revenue_total"] * 100)
            if revenue["revenue_total"] else Decimal("0")
        ),
        "fixed_cost": float(fixed_cost),
        "variable_cost": float(variable_total),
        "operating_profit": float(operating),
        "net_profit": float(net),
        "ytd_net_profit": float(ytd_net),
    }
