"""계정과목 + 비용센터 API

Sprint 7: 계정과목 CRUD + 트리 구조 + 비용센터 목록 + 시딩
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.redis_client import cache_get, cache_set
from app.models.user import User
from app.models.accounting import ChartOfAccount, CostCenter
from app.schemas.chart_of_accounts import (
    CoACreate, CoAUpdate, CoAResponse, CoATreeItem,
    CostCenterCreate, CostCenterResponse,
)
from app.services.smartbooks_import import (
    seed_chart_of_accounts, seed_cost_centers,
)

router = APIRouter(prefix="/api/v1/chart-of-accounts", tags=["chart-of-accounts"])


# ============================================================
# 계정과목 CRUD
# ============================================================
@router.get("", response_model=List[CoAResponse])
async def list_accounts(
    account_type: Optional[str] = Query(
        None, description="asset/liability/equity/revenue/expense",
    ),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, description="코드 또는 이름 검색"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """계정과목 목록 조회 (필터 지원, 30분 캐시)"""
    cache_key = f"coa:list:{account_type}:{is_active}:{search}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    q = select(ChartOfAccount).order_by(ChartOfAccount.account_code)

    if account_type:
        q = q.where(ChartOfAccount.account_type == account_type)
    if is_active is not None:
        q = q.where(ChartOfAccount.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.where(
            (ChartOfAccount.account_code.ilike(like))
            | (ChartOfAccount.account_name_vn.ilike(like))
            | (ChartOfAccount.account_name_en.ilike(like))
            | (ChartOfAccount.account_name_kr.ilike(like))
        )

    result = await db.execute(q)
    items = result.scalars().all()
    # ORM 객체를 dict로 변환하여 캐시 저장
    items_data = [
        CoAResponse.model_validate(item).model_dump(mode="json")
        for item in items
    ]
    await cache_set(cache_key, items_data, ttl=1800)  # 30분
    return items


@router.get("/tree", response_model=List[CoATreeItem])
async def get_account_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """계정과목 트리 구조 조회 — account_type별 그룹핑"""
    result = await db.execute(
        select(ChartOfAccount)
        .where(ChartOfAccount.is_active.is_(True))
        .order_by(ChartOfAccount.account_code)
    )
    accounts = result.scalars().all()

    # account_type별 그룹핑하여 트리 구성
    type_order = ["asset", "liability", "equity", "revenue", "expense"]
    type_labels = {
        "asset": ("Tài sản", "Assets", "자산"),
        "liability": ("Nợ phải trả", "Liabilities", "부채"),
        "equity": ("Vốn chủ sở hữu", "Equity", "자본"),
        "revenue": ("Doanh thu", "Revenue", "수익"),
        "expense": ("Chi phí", "Expenses", "비용"),
    }

    tree = []
    for acc_type in type_order:
        label = type_labels[acc_type]
        children = [
            CoATreeItem(
                account_id=a.account_id,
                account_code=a.account_code,
                account_name_vn=a.account_name_vn,
                account_name_en=a.account_name_en,
                account_name_kr=a.account_name_kr,
                account_type=a.account_type,
                account_group=a.account_group,
                normal_balance=a.normal_balance,
                is_active=a.is_active,
                smartbooks_mapped=a.smartbooks_mapped,
                children=[],
            )
            for a in accounts
            if a.account_type == acc_type
        ]
        if children:
            tree.append(CoATreeItem(
                account_id=0,
                account_code=acc_type,
                account_name_vn=label[0],
                account_name_en=label[1],
                account_name_kr=label[2],
                account_type=acc_type,
                account_group="",
                normal_balance="debit" if acc_type in ("asset", "expense") else "credit",
                is_active=True,
                smartbooks_mapped=False,
                children=children,
            ))

    return tree


@router.get("/summary")
async def account_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """계정과목 요약 통계"""
    result = await db.execute(
        select(
            ChartOfAccount.account_type,
            func.count(ChartOfAccount.account_id),
        )
        .group_by(ChartOfAccount.account_type)
    )
    rows = result.all()
    total = sum(r[1] for r in rows)
    return {
        "by_type": {r[0]: r[1] for r in rows},
        "total": total,
    }


@router.get("/{account_code}", response_model=CoAResponse)
async def get_account(
    account_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """계정과목 상세 조회"""
    result = await db.execute(
        select(ChartOfAccount).where(
            ChartOfAccount.account_code == account_code,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, f"Account {account_code} not found")
    return account


@router.post("", response_model=CoAResponse, status_code=201)
async def create_account(
    payload: CoACreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """계정과목 생성"""

    existing = await db.execute(
        select(ChartOfAccount).where(
            ChartOfAccount.account_code == payload.account_code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Account code {payload.account_code} already exists")

    account = ChartOfAccount(**payload.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.patch("/{account_code}", response_model=CoAResponse)
async def update_account(
    account_code: str,
    payload: CoAUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """계정과목 수정"""

    result = await db.execute(
        select(ChartOfAccount).where(
            ChartOfAccount.account_code == account_code,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, f"Account {account_code} not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    await db.commit()
    await db.refresh(account)
    return account


@router.post("/seed", status_code=200)
async def seed_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """SmartBooks 54개 계정과목 + 비용센터 시딩"""

    coa_result = await seed_chart_of_accounts(db)
    cc_result = await seed_cost_centers(db)
    return {
        "chart_of_accounts": coa_result,
        "cost_centers": cc_result,
    }


# ============================================================
# 비용센터 (Cost Center)
# ============================================================
@router.get(
    "/cost-centers/list",
    response_model=List[CostCenterResponse],
    tags=["cost-centers"],
)
async def list_cost_centers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """비용센터 목록 조회"""
    result = await db.execute(
        select(CostCenter).order_by(CostCenter.center_code)
    )
    return result.scalars().all()


@router.post(
    "/cost-centers",
    response_model=CostCenterResponse,
    status_code=201,
    tags=["cost-centers"],
)
async def create_cost_center(
    payload: CostCenterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """비용센터 생성"""

    existing = await db.execute(
        select(CostCenter).where(CostCenter.center_code == payload.center_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Cost center {payload.center_code} already exists")

    center = CostCenter(**payload.model_dump())
    db.add(center)
    await db.commit()
    await db.refresh(center)
    return center
