"""환율 관리 API (설계서 3.4)"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.exchange_rate import ExchangeRate

router = APIRouter(prefix="/api/v1/exchange-rates", tags=["exchange-rates"])


class ExchangeRateCreate(BaseModel):
    currency_from: str = "USD"
    currency_to: str = "VND"
    rate: Decimal
    rate_date: date
    source: str = "manual"


class ExchangeRateResponse(BaseModel):
    rate_id: int
    currency_from: str
    currency_to: str
    rate: Decimal
    rate_date: date
    source: Optional[str]

    class Config:
        from_attributes = True


@router.get("/latest", response_model=ExchangeRateResponse)
async def get_latest_rate(
    currency_from: str = "USD",
    currency_to: str = "VND",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ExchangeRate)
        .where(
            ExchangeRate.currency_from == currency_from,
            ExchangeRate.currency_to == currency_to,
            ExchangeRate.is_active == True,
        )
        .order_by(ExchangeRate.rate_date.desc())
        .limit(1)
    )
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(status_code=404, detail="Exchange rate not found")
    return rate


@router.get("", response_model=list[ExchangeRateResponse])
async def list_rates(
    skip: int = Query(0),
    limit: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ExchangeRate).order_by(ExchangeRate.rate_date.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=ExchangeRateResponse, status_code=201)
async def create_rate(
    data: ExchangeRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    rate = ExchangeRate(**data.model_dump(), created_by=current_user.user_id)
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    return rate
