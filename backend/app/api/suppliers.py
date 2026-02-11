"""공급사 CRUD API (Sprint 3)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.buying import Supplier
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse,
)

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


@router.get("", response_model=SupplierListResponse)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(None, description="코드/이름 검색"),
    supplier_type: str = Query(None, description="공급사 유형 필터"),
    is_active: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """공급사 목록 조회"""
    query = select(Supplier)
    count_query = select(func.count(Supplier.supplier_id))

    if search:
        search_filter = (
            Supplier.supplier_code.ilike(f"%{search}%")
        ) | (
            Supplier.supplier_name.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if supplier_type:
        query = query.where(Supplier.supplier_type == supplier_type)
        count_query = count_query.where(
            Supplier.supplier_type == supplier_type
        )

    if is_active is not None:
        query = query.where(Supplier.is_active == is_active)
        count_query = count_query.where(Supplier.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Supplier.supplier_code).offset(skip).limit(limit)
    )
    suppliers = result.scalars().all()

    return SupplierListResponse(total=total, items=suppliers)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """공급사 상세 조회"""
    result = await db.execute(
        select(Supplier).where(Supplier.supplier_id == supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.post("", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """공급사 등록"""
    # 코드 중복 확인
    existing = await db.execute(
        select(Supplier).where(
            Supplier.supplier_code == data.supplier_code
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Supplier code '{data.supplier_code}' already exists",
        )

    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """공급사 수정"""
    result = await db.execute(
        select(Supplier).where(Supplier.supplier_id == supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supplier, key, value)

    await db.commit()
    await db.refresh(supplier)
    return supplier
