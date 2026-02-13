"""수익성 분석 API

Sprint 12: 고객별/건별/월별 수익성 분석
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/profitability", tags=["profitability"])


@router.get("/by-customer")
async def customer_profitability(
    year: Optional[int] = Query(None, description="회계연도 필터"),
    month: Optional[int] = Query(None, ge=1, le=12, description="회계월 필터"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """고객별 수익성 분석 — GP 내림차순 랭킹"""
    from app.services.profitability_analyzer import get_customer_profitability
    return await get_customer_profitability(db, year, month, limit)


@router.get("/by-shipment")
async def shipment_profitability(
    customer_name: Optional[str] = Query(None, description="고객명 검색"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """건별(shipment) 수익성 분석"""
    from app.services.profitability_analyzer import get_shipment_profitability
    return await get_shipment_profitability(
        db, customer_name, year, month, page, size,
    )


@router.get("/monthly-trend")
async def monthly_trend(
    fiscal_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 수익성 추이"""
    from app.services.profitability_analyzer import get_monthly_profitability
    return await get_monthly_profitability(db, fiscal_year)
