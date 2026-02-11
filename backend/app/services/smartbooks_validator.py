"""SmartBooks 임포트 검증 서비스

분개전표 차대 균형 + AR/AP 잔액 크로스체크
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal import JournalEntry, JournalLine


async def validate_journal_balance(
    db: AsyncSession,
    fiscal_year: Optional[int] = None,
) -> dict:
    """분개전표 전체 차대 균형 검증"""
    filters = []
    if fiscal_year:
        filters.append(JournalEntry.fiscal_year == fiscal_year)

    # 전표별 차대 합계
    q = select(
        JournalEntry.entry_id,
        JournalEntry.entry_number,
        JournalEntry.total_debit,
        JournalEntry.total_credit,
    )
    if filters:
        q = q.where(*filters)

    result = await db.execute(q)
    entries = result.all()

    balanced = 0
    unbalanced = 0
    details = []
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for entry_id, entry_number, td, tc in entries:
        td_dec = Decimal(str(td)) if td else Decimal("0")
        tc_dec = Decimal(str(tc)) if tc else Decimal("0")
        total_debit += td_dec
        total_credit += tc_dec

        if td_dec == tc_dec:
            balanced += 1
        else:
            unbalanced += 1
            diff = td_dec - tc_dec
            details.append(
                f"{entry_number}: Debit={td_dec:,.0f}, "
                f"Credit={tc_dec:,.0f}, Diff={diff:,.0f}"
            )

    return {
        "total_entries": len(entries),
        "balanced_entries": balanced,
        "unbalanced_entries": unbalanced,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": total_debit == total_credit,
        "details": details[:50],
    }


async def validate_account_balance(
    db: AsyncSession,
    account_code: str,
    fiscal_year: Optional[int] = None,
) -> dict:
    """특정 계정의 잔액 검증 — 분개라인 기준"""
    filters = [JournalLine.account_code == account_code]
    if fiscal_year:
        filters.append(JournalEntry.fiscal_year == fiscal_year)

    q = (
        select(
            func.coalesce(func.sum(JournalLine.debit_amount), 0),
            func.coalesce(func.sum(JournalLine.credit_amount), 0),
            func.count(JournalLine.line_id),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(*filters)
    )
    result = await db.execute(q)
    row = result.one()

    total_debit = Decimal(str(row[0]))
    total_credit = Decimal(str(row[1]))
    balance = total_debit - total_credit

    return {
        "account_code": account_code,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balance": balance,
        "transaction_count": row[2],
    }
