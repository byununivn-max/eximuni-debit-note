"""재무제표 생성 엔진

Sprint 13: SmartBooks VAS 통달 200/2014/TT-BTC 형식 호환
- B01-DN: 대차대조표 (Balance Sheet)
- B02-DN: 손익계산서 (Income Statement)
- 시산표 (Trial Balance)
- 계정별 원장 (GL Detail)
- AR/AP 연령분석 (Aging)
"""
from decimal import Decimal
from typing import List, Optional
from datetime import date

from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import ChartOfAccount
from app.models.journal import JournalEntry, JournalLine
from app.models.accounting_parties import (
    AccountingVendor, AccountingCustomer, AccountBalance,
)


# VAS 계정 분류 기준 (상위 3자리)
BS_ASSET_GROUPS = ["111", "112", "113", "121", "128", "131", "133",
                   "136", "138", "141", "151", "152", "153", "154",
                   "155", "156", "157", "158", "211", "212", "213",
                   "214", "217", "221", "222", "228", "229", "241",
                   "242", "243", "244"]
BS_LIABILITY_GROUPS = ["311", "331", "333", "334", "335", "336", "337",
                       "338", "341", "342", "343", "344", "352", "353",
                       "356", "357"]
BS_EQUITY_GROUPS = ["411", "412", "413", "414", "418", "419", "421"]

IS_REVENUE_GROUPS = ["511", "512", "515", "521"]
IS_COGS_GROUPS = ["632"]
IS_EXPENSE_GROUPS = ["635", "641", "642"]
IS_OTHER_GROUPS = ["711", "811", "821"]


async def generate_balance_sheet(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> dict:
    """B01-DN 대차대조표 — 자산 = 부채 + 자본

    AccountBalance 테이블에서 closing 잔액 기준 집계
    """
    # 해당 월 잔액 조회
    q = (
        select(
            AccountBalance.account_code,
            AccountBalance.closing_debit,
            AccountBalance.closing_credit,
        )
        .where(
            AccountBalance.fiscal_year == fiscal_year,
            AccountBalance.fiscal_month == fiscal_month,
        )
    )
    result = await db.execute(q)
    balances = {r.account_code: r for r in result}

    # 계정과목 매핑
    coa_q = select(ChartOfAccount).where(ChartOfAccount.is_active.is_(True))
    coa_result = await db.execute(coa_q)
    accounts = {a.account_code: a for a in coa_result.scalars()}

    def sum_group(groups: List[str], side: str = "debit") -> Decimal:
        """계정 그룹별 잔액 합산"""
        total = Decimal("0")
        for code, bal in balances.items():
            if code[:3] in groups:
                if side == "debit":
                    total += Decimal(str(bal.closing_debit or 0))
                else:
                    total += Decimal(str(bal.closing_credit or 0))
        return total

    def group_details(groups: List[str]) -> List[dict]:
        """그룹별 계정 상세"""
        items = []
        for code, bal in sorted(balances.items()):
            if code[:3] in groups:
                acct = accounts.get(code)
                net = Decimal(str(bal.closing_debit or 0)) - Decimal(
                    str(bal.closing_credit or 0)
                )
                if net == 0:
                    continue
                items.append({
                    "account_code": code,
                    "account_name": acct.account_name_kr if acct else code,
                    "amount": float(abs(net)),
                    "side": "debit" if net > 0 else "credit",
                })
        return items

    # 자산
    current_assets = sum_group(
        [g for g in BS_ASSET_GROUPS if g[0] == "1"], "debit"
    )
    noncurrent_assets = sum_group(
        [g for g in BS_ASSET_GROUPS if g[0] == "2"], "debit"
    )
    total_assets = current_assets + noncurrent_assets

    # 부채
    current_liabilities = sum_group(
        [g for g in BS_LIABILITY_GROUPS if g[0] == "3"
         and int(g) < 340], "credit"
    )
    noncurrent_liabilities = sum_group(
        [g for g in BS_LIABILITY_GROUPS if int(g) >= 340], "credit"
    )
    total_liabilities = current_liabilities + noncurrent_liabilities

    # 자본
    total_equity = sum_group(BS_EQUITY_GROUPS, "credit")

    return {
        "report_type": "B01-DN",
        "title": "대차대조표 (Bảng cân đối kế toán)",
        "fiscal_year": fiscal_year,
        "fiscal_month": fiscal_month,
        "assets": {
            "current_assets": float(current_assets),
            "noncurrent_assets": float(noncurrent_assets),
            "total_assets": float(total_assets),
            "details": group_details(BS_ASSET_GROUPS),
        },
        "liabilities": {
            "current_liabilities": float(current_liabilities),
            "noncurrent_liabilities": float(noncurrent_liabilities),
            "total_liabilities": float(total_liabilities),
            "details": group_details(BS_LIABILITY_GROUPS),
        },
        "equity": {
            "total_equity": float(total_equity),
            "details": group_details(BS_EQUITY_GROUPS),
        },
        "balance_check": float(
            total_assets - total_liabilities - total_equity
        ),
    }


async def generate_income_statement(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: Optional[int] = None,
) -> dict:
    """B02-DN 손익계산서 — 매출 - 원가 - 판관비 = 순이익

    JournalLine에서 posted 전표 기준 집계
    - 수익 계정: 대변 합계
    - 비용 계정: 차변 합계
    """
    # 기본 필터: posted 전표
    filters = [
        JournalEntry.status == "posted",
        JournalEntry.fiscal_year == fiscal_year,
    ]
    if fiscal_month:
        filters.append(JournalEntry.fiscal_month <= fiscal_month)

    async def sum_accounts(
        groups: List[str], side: str = "credit"
    ) -> Decimal:
        """특정 그룹의 합산"""
        group_patterns = [f"{g}%" for g in groups]
        or_conditions = [
            JournalLine.account_code.like(p) for p in group_patterns
        ]

        if side == "credit":
            col = func.coalesce(func.sum(JournalLine.credit_amount), 0)
        else:
            col = func.coalesce(func.sum(JournalLine.debit_amount), 0)

        q = (
            select(col)
            .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
            .where(and_(*filters))
        )
        # OR 조건 추가
        from sqlalchemy import or_
        q = q.where(or_(*or_conditions))
        result = await db.execute(q)
        return Decimal(str(result.scalar() or 0))

    # 매출 (511% credit - 521% debit)
    revenue_gross = await sum_accounts(["511", "512"], "credit")
    revenue_deductions = await sum_accounts(["521"], "debit")
    net_revenue = revenue_gross - revenue_deductions

    # 매출원가
    cogs = await sum_accounts(["632"], "debit")

    # 매출총이익
    gross_profit = net_revenue - cogs

    # 판매비 + 관리비
    selling_expenses = await sum_accounts(["641"], "debit")
    admin_expenses = await sum_accounts(["642"], "debit")

    # 영업이익
    operating_profit = gross_profit - selling_expenses - admin_expenses

    # 금융수익/비용
    financial_income = await sum_accounts(["515"], "credit")
    financial_expense = await sum_accounts(["635"], "debit")

    # 기타수익/비용
    other_income = await sum_accounts(["711"], "credit")
    other_expense = await sum_accounts(["811"], "debit")

    # 법인세 비용
    income_tax = await sum_accounts(["821"], "debit")

    # 세전이익
    profit_before_tax = (
        operating_profit
        + financial_income - financial_expense
        + other_income - other_expense
    )

    # 순이익
    net_profit = profit_before_tax - income_tax

    period_label = (
        f"{fiscal_year}년 1~{fiscal_month}월"
        if fiscal_month
        else f"{fiscal_year}년 연간"
    )

    return {
        "report_type": "B02-DN",
        "title": "손익계산서 (Báo cáo kết quả kinh doanh)",
        "fiscal_year": fiscal_year,
        "fiscal_month": fiscal_month,
        "period": period_label,
        "revenue": {
            "gross_revenue": float(revenue_gross),
            "deductions": float(revenue_deductions),
            "net_revenue": float(net_revenue),
        },
        "cogs": float(cogs),
        "gross_profit": float(gross_profit),
        "operating_expenses": {
            "selling": float(selling_expenses),
            "admin": float(admin_expenses),
            "total": float(selling_expenses + admin_expenses),
        },
        "operating_profit": float(operating_profit),
        "financial": {
            "income": float(financial_income),
            "expense": float(financial_expense),
            "net": float(financial_income - financial_expense),
        },
        "other": {
            "income": float(other_income),
            "expense": float(other_expense),
            "net": float(other_income - other_expense),
        },
        "profit_before_tax": float(profit_before_tax),
        "income_tax": float(income_tax),
        "net_profit": float(net_profit),
    }


async def generate_gl_detail(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: Optional[int] = None,
    account_code: Optional[str] = None,
    page: int = 1,
    size: int = 100,
) -> dict:
    """계정별 원장 — GLDetail All

    특정 계정의 분개 라인 상세 조회 (날짜순)
    """
    filters = [
        JournalEntry.status == "posted",
        JournalEntry.fiscal_year == fiscal_year,
    ]
    if fiscal_month:
        filters.append(JournalEntry.fiscal_month == fiscal_month)
    if account_code:
        filters.append(JournalLine.account_code == account_code)

    q = (
        select(
            JournalLine.line_id,
            JournalEntry.entry_number,
            JournalEntry.entry_date,
            JournalEntry.module,
            JournalLine.account_code,
            JournalLine.counter_account_code,
            JournalLine.description_vn,
            JournalLine.debit_amount,
            JournalLine.credit_amount,
            JournalLine.vendor_id,
            JournalLine.customer_id,
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(and_(*filters))
    )

    # 총 건수
    count_sq = q.subquery()
    count_q = select(func.count()).select_from(count_sq)
    total = (await db.execute(count_q)).scalar() or 0

    # 정렬 + 페이지네이션
    q = q.order_by(JournalEntry.entry_date, JournalEntry.entry_id)
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)

    items = []
    for r in result:
        items.append({
            "line_id": r.line_id,
            "entry_number": r.entry_number,
            "entry_date": str(r.entry_date) if r.entry_date else None,
            "module": r.module,
            "account_code": r.account_code,
            "counter_account": r.counter_account_code,
            "description": r.description_vn,
            "debit": float(r.debit_amount or 0),
            "credit": float(r.credit_amount or 0),
            "vendor_id": r.vendor_id,
            "customer_id": r.customer_id,
        })

    return {"items": items, "total": total}


async def generate_ar_aging(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> List[dict]:
    """AR 연령분석 — 고객별 매출채권 잔액

    AccountBalance에서 1311000(매출채권) 계정 기준,
    고객별 잔액을 AccountingCustomer와 매핑
    """
    # 1311000 계정 잔액을 가진 고객 조회 (JournalLine에서 customer_id 기준)
    q = (
        select(
            JournalLine.customer_id,
            func.sum(JournalLine.debit_amount).label("total_debit"),
            func.sum(JournalLine.credit_amount).label("total_credit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.status == "posted",
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month <= fiscal_month,
            JournalLine.account_code.like("131%"),
            JournalLine.customer_id.isnot(None),
        )
        .group_by(JournalLine.customer_id)
    )
    result = await db.execute(q)

    # 고객명 매핑
    cust_q = select(AccountingCustomer)
    cust_result = await db.execute(cust_q)
    cust_map = {c.tax_id: c for c in cust_result.scalars()}

    items = []
    for r in result:
        balance = Decimal(str(r.total_debit or 0)) - Decimal(
            str(r.total_credit or 0)
        )
        if balance == 0:
            continue

        cust = cust_map.get(r.customer_id)
        items.append({
            "customer_id": r.customer_id,
            "customer_name": (
                cust.customer_name_en if cust else r.customer_id
            ),
            "receivable": float(balance),
            "account": "1311000",
        })

    items.sort(key=lambda x: x["receivable"], reverse=True)
    return items


async def generate_ap_aging(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> List[dict]:
    """AP 연령분석 — 공급사별 매입채무 잔액

    JournalLine에서 3311000(매입채무) 계정 기준,
    공급사별 잔액을 AccountingVendor와 매핑
    """
    q = (
        select(
            JournalLine.vendor_id,
            func.sum(JournalLine.debit_amount).label("total_debit"),
            func.sum(JournalLine.credit_amount).label("total_credit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.status == "posted",
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month <= fiscal_month,
            JournalLine.account_code.like("331%"),
            JournalLine.vendor_id.isnot(None),
        )
        .group_by(JournalLine.vendor_id)
    )
    result = await db.execute(q)

    # 공급사명 매핑
    vendor_q = select(AccountingVendor)
    vendor_result = await db.execute(vendor_q)
    vendor_map = {v.tax_id: v for v in vendor_result.scalars()}

    items = []
    for r in result:
        balance = Decimal(str(r.total_credit or 0)) - Decimal(
            str(r.total_debit or 0)
        )
        if balance == 0:
            continue

        vendor = vendor_map.get(r.vendor_id)
        items.append({
            "vendor_id": r.vendor_id,
            "vendor_name": (
                vendor.vendor_name_en if vendor else r.vendor_id
            ),
            "payable": float(balance),
            "account": "3311000",
        })

    items.sort(key=lambda x: x["payable"], reverse=True)
    return items
