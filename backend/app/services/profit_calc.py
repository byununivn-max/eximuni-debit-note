"""수익 계산 서비스: Selling - Buying = Gross Profit

PostgreSQL의 erp_selling_records(매출)와 erp_purchase_orders(매입)를
집계하여 매출, 매입, 영업이익(GP)을 계산한다.
"""
from decimal import Decimal
from typing import Optional
from datetime import date

from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.selling import SellingRecord
from app.models.buying import PurchaseOrder


async def get_kpi_summary(
    db: AsyncSession,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    """KPI 요약: 매출 합계, 매입 합계, 영업이익, 건수"""
    # 매출 집계
    sell_q = select(
        func.coalesce(func.sum(SellingRecord.total_selling_vnd), 0),
        func.count(SellingRecord.selling_id),
    )
    sell_filters = []
    if date_from:
        sell_filters.append(SellingRecord.service_date >= date_from)
    if date_to:
        sell_filters.append(SellingRecord.service_date <= date_to)
    if sell_filters:
        sell_q = sell_q.where(and_(*sell_filters))
    sell_result = await db.execute(sell_q)
    sell_row = sell_result.one()
    total_selling = Decimal(str(sell_row[0]))
    selling_count = sell_row[1]

    # 매입 집계 (CONFIRMED 상태만)
    buy_q = select(
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0),
        func.count(PurchaseOrder.po_id),
    ).where(PurchaseOrder.status == "CONFIRMED")
    buy_filters = []
    if date_from:
        buy_filters.append(PurchaseOrder.invoice_date >= date_from)
    if date_to:
        buy_filters.append(PurchaseOrder.invoice_date <= date_to)
    if buy_filters:
        buy_q = buy_q.where(and_(*buy_filters))
    buy_result = await db.execute(buy_q)
    buy_row = buy_result.one()
    total_buying = Decimal(str(buy_row[0]))
    buying_count = buy_row[1]

    gross_profit = total_selling - total_buying
    gp_margin = (
        (gross_profit / total_selling * 100)
        if total_selling > 0 else Decimal("0")
    )

    return {
        "total_selling_vnd": total_selling,
        "total_buying_vnd": total_buying,
        "gross_profit_vnd": gross_profit,
        "gp_margin_pct": round(gp_margin, 1),
        "selling_count": selling_count,
        "buying_count": buying_count,
    }


async def get_monthly_trend(
    db: AsyncSession,
    year: Optional[int] = None,
) -> list:
    """월별 매출/매입 추이 (최근 12개월)"""
    from datetime import datetime
    if year is None:
        year = datetime.utcnow().year

    # 매출 월별 집계
    sell_q = (
        select(
            extract("month", SellingRecord.service_date).label("month"),
            func.coalesce(
                func.sum(SellingRecord.total_selling_vnd), 0
            ).label("total"),
        )
        .where(
            extract("year", SellingRecord.service_date) == year,
            SellingRecord.service_date.isnot(None),
        )
        .group_by(extract("month", SellingRecord.service_date))
    )
    sell_result = await db.execute(sell_q)
    sell_by_month = {int(r.month): Decimal(str(r.total)) for r in sell_result}

    # 매입 월별 집계
    buy_q = (
        select(
            extract("month", PurchaseOrder.invoice_date).label("month"),
            func.coalesce(
                func.sum(PurchaseOrder.total_amount), 0
            ).label("total"),
        )
        .where(
            PurchaseOrder.status == "CONFIRMED",
            extract("year", PurchaseOrder.invoice_date) == year,
            PurchaseOrder.invoice_date.isnot(None),
        )
        .group_by(extract("month", PurchaseOrder.invoice_date))
    )
    buy_result = await db.execute(buy_q)
    buy_by_month = {int(r.month): Decimal(str(r.total)) for r in buy_result}

    months = []
    for m in range(1, 13):
        selling = sell_by_month.get(m, Decimal("0"))
        buying = buy_by_month.get(m, Decimal("0"))
        months.append({
            "month": m,
            "selling": float(selling),
            "buying": float(buying),
            "profit": float(selling - buying),
        })

    return months


async def get_customer_profit(
    db: AsyncSession,
    limit: int = 20,
) -> list:
    """고객별 매출 TOP N"""
    q = (
        select(
            SellingRecord.customer_name,
            func.coalesce(
                func.sum(SellingRecord.total_selling_vnd), 0
            ).label("total"),
            func.count(SellingRecord.selling_id).label("count"),
        )
        .where(SellingRecord.customer_name.isnot(None))
        .group_by(SellingRecord.customer_name)
        .order_by(func.sum(SellingRecord.total_selling_vnd).desc())
        .limit(limit)
    )
    result = await db.execute(q)
    return [
        {
            "customer_name": r.customer_name,
            "total_vnd": float(Decimal(str(r.total))),
            "count": r.count,
        }
        for r in result
    ]
