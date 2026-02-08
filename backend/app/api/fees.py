"""비용 항목 API (설계서 3.4)"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.fee import FeeCategory, FeeItem

router = APIRouter(prefix="/api/v1", tags=["fees"])


class FeeItemResponse(BaseModel):
    fee_item_id: int
    item_code: str
    item_name: str
    is_vat_applicable: bool
    vat_rate: Optional[Decimal] = None
    is_tax_inclusive: bool
    sort_order: int

    class Config:
        from_attributes = True


class FeeCategoryResponse(BaseModel):
    category_id: int
    category_code: str
    category_name: str
    category_name_vi: Optional[str] = None
    category_name_ko: Optional[str] = None
    is_vat_applicable: bool
    vat_rate: Optional[Decimal] = None
    fee_items: List[FeeItemResponse] = []

    class Config:
        from_attributes = True


@router.get("/fee-categories", response_model=List[FeeCategoryResponse])
async def list_fee_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FeeCategory)
        .options(selectinload(FeeCategory.fee_items))
        .where(FeeCategory.is_active == True)
        .order_by(FeeCategory.sort_order)
    )
    categories = result.scalars().unique().all()
    return categories


@router.get("/fee-items", response_model=List[FeeItemResponse])
async def list_fee_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FeeItem).where(FeeItem.is_active == True).order_by(FeeItem.sort_order)
    )
    return result.scalars().all()
