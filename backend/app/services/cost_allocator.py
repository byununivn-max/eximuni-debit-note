"""비용 집계 + 일할 안분 서비스

월별로 분개장의 비용 계정(642x 등)을 집계하고,
비용 분류(고정비/변동비)에 따라 일할 안분 금액을 계산한다.
"""
import calendar
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import List

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal import JournalEntry, JournalLine
from app.models.cost_management import CostClassification, MonthlyCostSummary


# ============================================================
# 642x 초기 비용 분류 시드 데이터
# ============================================================
COST_CLASSIFICATION_SEED = [
    {
        "account_code": "6421000",
        "cost_type": "fixed",
        "cost_category": "salary",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí nhân viên (lương)",
        "description_en": "Staff salary expenses",
    },
    {
        "account_code": "6422000",
        "cost_type": "variable",
        "cost_category": "material",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí vật liệu",
        "description_en": "Material expenses",
    },
    {
        "account_code": "6423000",
        "cost_type": "fixed",
        "cost_category": "depreciation",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí khấu hao tài sản cố định",
        "description_en": "Fixed asset depreciation",
    },
    {
        "account_code": "6424000",
        "cost_type": "semi_variable",
        "cost_category": "maintenance",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí bảo dưỡng, sửa chữa",
        "description_en": "Maintenance & repair expenses",
    },
    {
        "account_code": "6425000",
        "cost_type": "fixed",
        "cost_category": "tax",
        "allocation_method": "monthly_lump",
        "description_vn": "Chi phí thuế, phí, lệ phí",
        "description_en": "Tax & fee expenses",
    },
    {
        "account_code": "6426000",
        "cost_type": "fixed",
        "cost_category": "prepaid",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí phân bổ trước",
        "description_en": "Prepaid expense amortization",
    },
    {
        "account_code": "6427000",
        "cost_type": "variable",
        "cost_category": "outsourced",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí dịch vụ thuê ngoài",
        "description_en": "Outsourced service expenses",
    },
    {
        "account_code": "6428000",
        "cost_type": "semi_variable",
        "cost_category": "other",
        "allocation_method": "daily_prorate",
        "description_vn": "Chi phí khác bằng tiền",
        "description_en": "Other selling & admin expenses",
    },
]


async def seed_cost_classifications(db: AsyncSession) -> dict:
    """642x 초기 비용 분류 시딩"""
    created = 0
    skipped = 0

    for item in COST_CLASSIFICATION_SEED:
        existing = await db.execute(
            select(CostClassification).where(
                CostClassification.account_code == item["account_code"],
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        cc = CostClassification(**item)
        db.add(cc)
        created += 1

    await db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "total": len(COST_CLASSIFICATION_SEED),
    }


async def calculate_monthly_cost(
    db: AsyncSession,
    fiscal_year: int,
    fiscal_month: int,
) -> dict:
    """월별 비용 집계 + 일할 안분 계산

    1. 분개장에서 비용 계정(6xxx) 차변 합계 집계
    2. 비용 분류 테이블과 조인하여 고정/변동/반변동 분류
    3. 해당월 역일수로 일할 안분 금액 계산
    4. erp_monthly_cost_summary에 upsert
    """
    # 해당월 역일수
    days_in_month = calendar.monthrange(fiscal_year, fiscal_month)[1]

    # 분개장에서 비용 계정(6xxx) 차변 집계
    q = (
        select(
            JournalLine.account_code,
            func.coalesce(
                func.sum(JournalLine.debit_amount), 0
            ).label("total_debit"),
        )
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.entry_id)
        .where(
            JournalEntry.fiscal_year == fiscal_year,
            JournalEntry.fiscal_month == fiscal_month,
            JournalEntry.status.in_(["posted", "draft"]),
            JournalLine.account_code.like("6%"),
        )
        .group_by(JournalLine.account_code)
    )
    result = await db.execute(q)
    cost_data = {r.account_code: Decimal(str(r.total_debit)) for r in result}

    # 비용 분류 테이블 조회
    cc_q = select(CostClassification).where(
        CostClassification.is_active.is_(True),
    )
    cc_result = await db.execute(cc_q)
    classifications = {
        c.account_code: c for c in cc_result.scalars().all()
    }

    # 기존 해당월 요약 삭제 후 재생성
    await db.execute(
        delete(MonthlyCostSummary).where(
            MonthlyCostSummary.fiscal_year == fiscal_year,
            MonthlyCostSummary.fiscal_month == fiscal_month,
        )
    )

    created = 0
    for account_code, total in cost_data.items():
        if total <= 0:
            continue

        cc = classifications.get(account_code)
        cost_type = cc.cost_type if cc else "variable"
        cost_center = cc.cost_center_code if cc else None

        # 일할 안분: monthly_lump는 일할하지 않음
        if cc and cc.allocation_method == "monthly_lump":
            daily = total
        else:
            daily = (total / Decimal(str(days_in_month))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP,
            )

        summary = MonthlyCostSummary(
            fiscal_year=fiscal_year,
            fiscal_month=fiscal_month,
            account_code=account_code,
            cost_type=cost_type,
            cost_center_code=cost_center,
            total_amount=total,
            daily_allocated_amount=daily,
            working_days=days_in_month,
        )
        db.add(summary)
        created += 1

    await db.commit()
    return {
        "fiscal_year": fiscal_year,
        "fiscal_month": fiscal_month,
        "days_in_month": days_in_month,
        "accounts_processed": created,
    }
