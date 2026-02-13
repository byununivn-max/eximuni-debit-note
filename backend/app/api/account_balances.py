"""계정잔액 + 시산표 API

Sprint 9: 계정잔액 조회 + 시산표 계산
"""
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.journal import JournalEntry, JournalLine
from app.models.accounting import ChartOfAccount
from app.schemas.accounting_parties import (
    TrialBalanceItem, TrialBalanceResponse,
)

router = APIRouter(prefix="/api/v1/account-balances", tags=["account-balances"])


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    fiscal_year: int = Query(..., description="회계연도"),
    fiscal_month: int = Query(..., ge=1, le=12, description="회계월"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """시산표 — 분개장 라인 기준 실시간 계산"""
    # 분개장 라인에서 계정별 차/대 집계 (해당 기간)
    q = (
        select(
            JournalLine.account_code,
            func.coalesce(func.sum(JournalLine.debit_amount), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit_amount), 0).label("credit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
        )
        .group_by(JournalLine.account_code)
        .order_by(JournalLine.account_code)
    )
    result = await db.execute(q)
    period_data = {r.account_code: (Decimal(str(r.debit)), Decimal(str(r.credit))) for r in result}

    # 기초잔액 = 해당 연도 1월~(month-1)월 누적
    opening_data: dict[str, tuple[Decimal, Decimal]] = {}
    if fiscal_month > 1:
        oq = (
            select(
                JournalLine.account_code,
                func.coalesce(func.sum(JournalLine.debit_amount), 0).label("debit"),
                func.coalesce(func.sum(JournalLine.credit_amount), 0).label("credit"),
            )
            .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
            .where(
                JournalEntry.fiscal_year == fiscal_year,
                JournalEntry.fiscal_month < fiscal_month,
                JournalEntry.status.in_(["posted", "draft"]),
            )
            .group_by(JournalLine.account_code)
        )
        o_result = await db.execute(oq)
        opening_data = {
            r.account_code: (Decimal(str(r.debit)), Decimal(str(r.credit)))
            for r in o_result
        }

    # 계정과목 정보 가져오기
    coa_q = select(ChartOfAccount).where(ChartOfAccount.is_active.is_(True))
    coa_result = await db.execute(coa_q)
    coa_map = {
        a.account_code: a for a in coa_result.scalars().all()
    }

    # 사용된 모든 계정코드
    all_codes = sorted(
        set(period_data.keys()) | set(opening_data.keys())
    )

    items = []
    tot = TrialBalanceItem(
        account_code="TOTAL", account_name_kr="합계",
        account_name_en="Total", account_type="",
    )

    for code in all_codes:
        coa = coa_map.get(code)
        o_dr, o_cr = opening_data.get(code, (Decimal("0"), Decimal("0")))
        p_dr, p_cr = period_data.get(code, (Decimal("0"), Decimal("0")))
        c_dr = o_dr + p_dr
        c_cr = o_cr + p_cr

        item = TrialBalanceItem(
            account_code=code,
            account_name_kr=coa.account_name_kr if coa else code,
            account_name_en=coa.account_name_en if coa else code,
            account_type=coa.account_type if coa else "",
            opening_debit=o_dr,
            opening_credit=o_cr,
            period_debit=p_dr,
            period_credit=p_cr,
            closing_debit=c_dr,
            closing_credit=c_cr,
        )
        items.append(item)

        tot.opening_debit += o_dr
        tot.opening_credit += o_cr
        tot.period_debit += p_dr
        tot.period_credit += p_cr
        tot.closing_debit += c_dr
        tot.closing_credit += c_cr

    return TrialBalanceResponse(
        fiscal_year=fiscal_year,
        fiscal_month=fiscal_month,
        items=items,
        totals=tot,
    )


@router.get("/summary")
async def balance_summary(
    fiscal_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """연도별 계정잔액 요약 — 유형별 차/대 합계"""
    q = (
        select(
            ChartOfAccount.account_type,
            func.coalesce(func.sum(JournalLine.debit_amount), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit_amount), 0).label("credit"),
        )
        .join(
            ChartOfAccount,
            JournalLine.account_code == ChartOfAccount.account_code,
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.status.in_(["posted", "draft"]),
        )
        .group_by(ChartOfAccount.account_type)
    )
    result = await db.execute(q)
    by_type = {
        r.account_type: {
            "debit": float(r.debit),
            "credit": float(r.credit),
        }
        for r in result
    }

    return {"fiscal_year": fiscal_year, "by_type": by_type}
