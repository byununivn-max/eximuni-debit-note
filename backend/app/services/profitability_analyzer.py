"""수익성 분석 서비스

건별(shipment) / 고객별(customer) / 월별(monthly) 수익성 계산
- 매출: erp_selling_records (MSSQL→PG 동기화 데이터)
- 매입: erp_purchase_orders (mssql_shipment_ref로 매출과 연결)
- GP = 매출 - 매입
"""
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.selling import SellingRecord
from app.models.buying import PurchaseOrder


async def get_customer_profitability(
    db: AsyncSession,
    year: Optional[int] = None,
    month: Optional[int] = None,
    limit: int = 50,
) -> List[dict]:
    """고객별 수익성 분석

    SellingRecord.customer_name 기준으로 매출 합산,
    연결된 PurchaseOrder로 매입 합산 → GP 계산
    """
    # 매출 집계: 고객별 매출 합계
    sell_q = (
        select(
            SellingRecord.customer_name,
            func.count(SellingRecord.selling_id).label("deal_count"),
            func.coalesce(
                func.sum(SellingRecord.total_selling_vnd), 0
            ).label("total_selling"),
        )
        .where(SellingRecord.customer_name.isnot(None))
    )

    if year:
        sell_q = sell_q.where(
            func.extract("year", SellingRecord.service_date) == year
        )
    if month:
        sell_q = sell_q.where(
            func.extract("month", SellingRecord.service_date) == month
        )

    sell_q = sell_q.group_by(SellingRecord.customer_name)
    sell_result = await db.execute(sell_q)
    sell_data = {
        r.customer_name: {
            "deal_count": r.deal_count,
            "total_selling": Decimal(str(r.total_selling)),
        }
        for r in sell_result
    }

    # 매입 집계: mssql_shipment_ref로 매출과 연결, 고객별 합산
    # PO에는 customer_name이 없으므로, selling_record를 통해 연결
    buy_q = (
        select(
            SellingRecord.customer_name,
            func.coalesce(
                func.sum(PurchaseOrder.total_amount), 0
            ).label("total_buying"),
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.mssql_shipment_ref == SellingRecord.mssql_source_id,
        )
        .where(
            SellingRecord.customer_name.isnot(None),
            PurchaseOrder.status != "CANCELLED",
        )
    )

    if year:
        buy_q = buy_q.where(
            func.extract("year", SellingRecord.service_date) == year
        )
    if month:
        buy_q = buy_q.where(
            func.extract("month", SellingRecord.service_date) == month
        )

    buy_q = buy_q.group_by(SellingRecord.customer_name)
    buy_result = await db.execute(buy_q)
    buy_data = {
        r.customer_name: Decimal(str(r.total_buying))
        for r in buy_result
    }

    # 합산
    results = []
    for customer, sell_info in sell_data.items():
        selling = sell_info["total_selling"]
        buying = buy_data.get(customer, Decimal("0"))
        gp = selling - buying
        gp_margin = (
            float(gp / selling * 100) if selling else 0
        )

        results.append({
            "customer_name": customer,
            "deal_count": sell_info["deal_count"],
            "total_selling": float(selling),
            "total_buying": float(buying),
            "gross_profit": float(gp),
            "gp_margin": round(gp_margin, 1),
        })

    # GP율 내림차순 정렬
    results.sort(key=lambda x: x["gross_profit"], reverse=True)
    return results[:limit]


async def get_shipment_profitability(
    db: AsyncSession,
    customer_name: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    page: int = 1,
    size: int = 50,
) -> dict:
    """건별(shipment) 수익성 분석

    SellingRecord 단위로 매출/매입/GP 계산
    """
    # 매출 건별 조회
    q = (
        select(
            SellingRecord.selling_id,
            SellingRecord.record_type,
            SellingRecord.customer_name,
            SellingRecord.invoice_no,
            SellingRecord.service_date,
            SellingRecord.total_selling_vnd.label("selling_amount"),
            SellingRecord.mssql_source_id,
            func.coalesce(
                func.sum(PurchaseOrder.total_amount), Decimal("0")
            ).label("buying_amount"),
        )
        .outerjoin(
            PurchaseOrder,
            PurchaseOrder.mssql_shipment_ref == SellingRecord.mssql_source_id,
        )
        .where(SellingRecord.customer_name.isnot(None))
    )

    if customer_name:
        q = q.where(SellingRecord.customer_name.ilike(f"%{customer_name}%"))
    if year:
        q = q.where(
            func.extract("year", SellingRecord.service_date) == year
        )
    if month:
        q = q.where(
            func.extract("month", SellingRecord.service_date) == month
        )

    q = q.group_by(
        SellingRecord.selling_id,
        SellingRecord.record_type,
        SellingRecord.customer_name,
        SellingRecord.invoice_no,
        SellingRecord.service_date,
        SellingRecord.total_selling_vnd,
        SellingRecord.mssql_source_id,
    )

    # 총 건수 (subquery)
    count_sq = q.subquery()
    count_q = select(func.count()).select_from(count_sq)
    total = (await db.execute(count_q)).scalar() or 0

    # 페이지네이션 + 정렬
    q = q.order_by(desc(SellingRecord.service_date))
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)

    items = []
    for r in result:
        selling = float(r.selling_amount or 0)
        buying = float(r.buying_amount or 0)
        gp = selling - buying
        gp_margin = (gp / selling * 100) if selling else 0

        items.append({
            "selling_id": r.selling_id,
            "record_type": r.record_type,
            "customer_name": r.customer_name,
            "invoice_no": r.invoice_no,
            "service_date": str(r.service_date) if r.service_date else None,
            "selling_amount": selling,
            "buying_amount": buying,
            "gross_profit": gp,
            "gp_margin": round(gp_margin, 1),
        })

    return {"items": items, "total": total}


async def get_monthly_profitability(
    db: AsyncSession,
    fiscal_year: int,
) -> List[dict]:
    """월별 수익성 추이"""
    q = (
        select(
            func.extract("month", SellingRecord.service_date).label("month"),
            func.coalesce(
                func.sum(SellingRecord.total_selling_vnd), 0
            ).label("selling"),
        )
        .where(
            func.extract("year", SellingRecord.service_date) == fiscal_year,
            SellingRecord.customer_name.isnot(None),
        )
        .group_by(func.extract("month", SellingRecord.service_date))
        .order_by(func.extract("month", SellingRecord.service_date))
    )
    sell_result = await db.execute(q)
    sell_by_month = {
        int(r.month): Decimal(str(r.selling)) for r in sell_result
    }

    # 매입 — 매출 건 기준 월별 집계
    buy_q = (
        select(
            func.extract("month", SellingRecord.service_date).label("month"),
            func.coalesce(
                func.sum(PurchaseOrder.total_amount), 0
            ).label("buying"),
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.mssql_shipment_ref == SellingRecord.mssql_source_id,
        )
        .where(
            func.extract("year", SellingRecord.service_date) == fiscal_year,
            SellingRecord.customer_name.isnot(None),
            PurchaseOrder.status != "CANCELLED",
        )
        .group_by(func.extract("month", SellingRecord.service_date))
    )
    buy_result = await db.execute(buy_q)
    buy_by_month = {
        int(r.month): Decimal(str(r.buying)) for r in buy_result
    }

    results = []
    for m in range(1, 13):
        selling = float(sell_by_month.get(m, Decimal("0")))
        buying = float(buy_by_month.get(m, Decimal("0")))
        gp = selling - buying
        gp_margin = (gp / selling * 100) if selling else 0

        results.append({
            "fiscal_month": m,
            "selling": selling,
            "buying": buying,
            "gross_profit": gp,
            "gp_margin": round(gp_margin, 1),
        })

    return results
