"""비용 분류 + 월별 비용 집계 API

Sprint 10: 비용분류 CRUD + 642x 시딩 + 월별 집계 + 일할 안분
"""
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.cost_management import CostClassification, MonthlyCostSummary
from app.schemas.cost_classification import (
    CostClassificationCreate,
    CostClassificationUpdate,
    CostClassificationResponse,
    CostClassificationListResponse,
    MonthlyCostSummaryResponse,
    MonthlyCostSummaryListResponse,
    MonthlyCostOverview,
    CostSummaryByType,
    SeedResult,
)

router = APIRouter(
    prefix="/api/v1/cost-classifications",
    tags=["cost-classifications"],
)


# ============================================================
# 비용 분류 CRUD
# ============================================================
@router.get("", response_model=CostClassificationListResponse)
async def list_classifications(
    cost_type: Optional[str] = Query(None, description="fixed/variable/semi_variable"),
    cost_category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """비용 분류 목록"""
    q = select(CostClassification).order_by(CostClassification.account_code)

    if cost_type:
        q = q.where(CostClassification.cost_type == cost_type)
    if cost_category:
        q = q.where(CostClassification.cost_category == cost_category)
    if is_active is not None:
        q = q.where(CostClassification.is_active == is_active)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(q)
    return CostClassificationListResponse(
        items=result.scalars().all(), total=total,
    )


@router.get("/{classification_id}", response_model=CostClassificationResponse)
async def get_classification(
    classification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """비용 분류 상세"""
    result = await db.execute(
        select(CostClassification).where(
            CostClassification.classification_id == classification_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"Cost classification {classification_id} not found")
    return item


@router.post("", response_model=CostClassificationResponse, status_code=201)
async def create_classification(
    payload: CostClassificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """비용 분류 생성"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 생성 가능")

    # 동일 계정코드 중복 확인
    existing = await db.execute(
        select(CostClassification).where(
            CostClassification.account_code == payload.account_code,
            CostClassification.is_active.is_(True),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            409,
            f"Active classification for {payload.account_code} already exists",
        )

    item = CostClassification(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch(
    "/{classification_id}",
    response_model=CostClassificationResponse,
)
async def update_classification(
    classification_id: int,
    payload: CostClassificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """비용 분류 수정"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 수정 가능")

    result = await db.execute(
        select(CostClassification).where(
            CostClassification.classification_id == classification_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"Cost classification {classification_id} not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(item, k, v)

    await db.commit()
    await db.refresh(item)
    return item


@router.post("/seed", response_model=SeedResult)
async def seed_classifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """642x 초기 비용 분류 시딩"""
    if current_user.role != "admin":
        raise HTTPException(403, "admin만 시딩 실행 가능")

    from app.services.cost_allocator import seed_cost_classifications
    result = await seed_cost_classifications(db)
    return SeedResult(**result)


# ============================================================
# 월별 비용 집계
# ============================================================
@router.post("/calculate-monthly")
async def calculate_monthly(
    fiscal_year: int = Query(..., description="회계연도"),
    fiscal_month: int = Query(..., ge=1, le=12, description="회계월"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 비용 집계 실행 (분개장 → 월별 비용 요약)"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 집계 실행 가능")

    from app.services.cost_allocator import calculate_monthly_cost
    return await calculate_monthly_cost(db, fiscal_year, fiscal_month)


@router.get("/monthly-summary", response_model=MonthlyCostSummaryListResponse)
async def list_monthly_summary(
    fiscal_year: int = Query(...),
    fiscal_month: int = Query(..., ge=1, le=12),
    cost_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 비용 집계 목록"""
    q = (
        select(MonthlyCostSummary)
        .where(
            MonthlyCostSummary.fiscal_year == fiscal_year,
            MonthlyCostSummary.fiscal_month == fiscal_month,
        )
        .order_by(MonthlyCostSummary.account_code)
    )

    if cost_type:
        q = q.where(MonthlyCostSummary.cost_type == cost_type)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(q)
    return MonthlyCostSummaryListResponse(
        items=result.scalars().all(), total=total,
    )


@router.get("/monthly-overview", response_model=MonthlyCostOverview)
async def monthly_overview(
    fiscal_year: int = Query(...),
    fiscal_month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 비용 개요 — 유형별 집계"""
    q = (
        select(
            MonthlyCostSummary.cost_type,
            func.sum(MonthlyCostSummary.total_amount).label("total"),
            func.sum(MonthlyCostSummary.daily_allocated_amount).label("daily"),
            func.count().label("cnt"),
        )
        .where(
            MonthlyCostSummary.fiscal_year == fiscal_year,
            MonthlyCostSummary.fiscal_month == fiscal_month,
        )
        .group_by(MonthlyCostSummary.cost_type)
    )
    result = await db.execute(q)
    rows = result.all()

    by_type = []
    grand_total = Decimal("0")
    grand_daily = Decimal("0")
    working_days = 0

    for r in rows:
        total_amt = Decimal(str(r.total))
        daily_amt = Decimal(str(r.daily))
        by_type.append(CostSummaryByType(
            cost_type=r.cost_type,
            total_amount=total_amt,
            daily_allocated=daily_amt,
            account_count=r.cnt,
        ))
        grand_total += total_amt
        grand_daily += daily_amt

    # 해당월 역일수
    if not rows:
        import calendar
        working_days = calendar.monthrange(fiscal_year, fiscal_month)[1]
    else:
        # monthly_cost_summary에서 가져오기
        wd_q = (
            select(MonthlyCostSummary.working_days)
            .where(
                MonthlyCostSummary.fiscal_year == fiscal_year,
                MonthlyCostSummary.fiscal_month == fiscal_month,
            )
            .limit(1)
        )
        wd_result = await db.execute(wd_q)
        wd_row = wd_result.scalar_one_or_none()
        working_days = wd_row if wd_row else 0

    return MonthlyCostOverview(
        fiscal_year=fiscal_year,
        fiscal_month=fiscal_month,
        working_days=working_days,
        by_type=by_type,
        grand_total=grand_total,
        grand_daily=grand_daily,
    )
