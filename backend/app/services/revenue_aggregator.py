"""매출 집계 서비스

분개장(JournalLine)에서 매출 계정(5113xxx)을 집계하여
물류/BCQT/기타 매출로 세분화한다.
"""
from decimal import Decimal
from datetime import date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal import JournalEntry, JournalLine


# 매출 계정 매핑
REVENUE_LOGISTICS = "5113001"  # 물류 매출
REVENUE_BCQT = "5113002"      # BCQT 매출
REVENUE_OTHER_PREFIX = "5113"  # 기타 매출 (5113008 등)

# 매출원가 계정
COGS_ACCOUNT = "6320000"

# 금융수익/비용 계정 접두사
FINANCIAL_INCOME_PREFIX = "515"   # 금융수익
FINANCIAL_EXPENSE_PREFIX = "635"  # 금융비용


async def aggregate_revenue_by_month(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> dict:
    """월별 매출 집계 — 분개장 대변(credit) 합계"""
    q = (
        select(
            JournalLine.account_code,
            func.coalesce(func.sum(JournalLine.credit_amount), 0).label("credit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
            JournalLine.account_code.like("511%"),
        )
        .group_by(JournalLine.account_code)
    )
    result = await db.execute(q)
    revenue_map = {r.account_code: Decimal(str(r.credit)) for r in result}

    logistics = revenue_map.get(REVENUE_LOGISTICS, Decimal("0"))
    bcqt = revenue_map.get(REVENUE_BCQT, Decimal("0"))
    other = sum(
        v for k, v in revenue_map.items()
        if k != REVENUE_LOGISTICS and k != REVENUE_BCQT
    )
    total = logistics + bcqt + other

    return {
        "revenue_total": total,
        "revenue_logistics": logistics,
        "revenue_bcqt": bcqt,
        "revenue_other": other,
    }


async def aggregate_cogs_by_month(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> Decimal:
    """월별 매출원가 집계 — 분개장 차변(debit) 합계"""
    q = (
        select(
            func.coalesce(func.sum(JournalLine.debit_amount), 0).label("debit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
            JournalLine.account_code.like("632%"),
        )
    )
    result = await db.execute(q)
    row = result.one()
    return Decimal(str(row.debit))


async def aggregate_financial_by_month(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> dict:
    """월별 금융수익/비용 집계"""
    # 금융수익 (515xxx) — 대변
    inc_q = (
        select(
            func.coalesce(func.sum(JournalLine.credit_amount), 0).label("credit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
            JournalLine.account_code.like(f"{FINANCIAL_INCOME_PREFIX}%"),
        )
    )
    inc_result = await db.execute(inc_q)
    financial_income = Decimal(str(inc_result.one().credit))

    # 금융비용 (635xxx) — 차변
    exp_q = (
        select(
            func.coalesce(func.sum(JournalLine.debit_amount), 0).label("debit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
            JournalLine.account_code.like(f"{FINANCIAL_EXPENSE_PREFIX}%"),
        )
    )
    exp_result = await db.execute(exp_q)
    financial_expense = Decimal(str(exp_result.one().debit))

    return {
        "financial_income": financial_income,
        "financial_expense": financial_expense,
    }
