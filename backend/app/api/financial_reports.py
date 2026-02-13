"""재무제표 API

Sprint 13: SmartBooks 형식 호환 재무보고서
- B01-DN 대차대조표
- B02-DN 손익계산서
- 시산표 (기존 API 활용)
- 계정별 원장 (GL Detail)
- AR/AP 연령분석
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/reports", tags=["financial-reports"])


@router.get("/balance-sheet")
async def balance_sheet(
    fiscal_year: int = Query(..., description="회계연도"),
    fiscal_month: int = Query(..., ge=1, le=12, description="회계월"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """B01-DN 대차대조표"""
    from app.services.financial_report_generator import generate_balance_sheet
    return await generate_balance_sheet(db, fiscal_year, fiscal_month)


@router.get("/income-statement")
async def income_statement(
    fiscal_year: int = Query(...),
    fiscal_month: Optional[int] = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """B02-DN 손익계산서"""
    from app.services.financial_report_generator import (
        generate_income_statement,
    )
    return await generate_income_statement(db, fiscal_year, fiscal_month)


@router.get("/gl-detail")
async def gl_detail(
    fiscal_year: int = Query(...),
    fiscal_month: Optional[int] = Query(None, ge=1, le=12),
    account_code: Optional[str] = Query(None, description="계정코드 필터"),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """계정별 원장 — GL Detail All"""
    from app.services.financial_report_generator import generate_gl_detail
    return await generate_gl_detail(
        db, fiscal_year, fiscal_month, account_code, page, size,
    )


@router.get("/ar-aging")
async def ar_aging(
    fiscal_year: int = Query(...),
    fiscal_month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AR 연령분석 — Detail By All Customer"""
    from app.services.financial_report_generator import generate_ar_aging
    return await generate_ar_aging(db, fiscal_year, fiscal_month)


@router.get("/ap-aging")
async def ap_aging(
    fiscal_year: int = Query(...),
    fiscal_month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AP 연령분석 — Detail By All Vendor"""
    from app.services.financial_report_generator import generate_ap_aging
    return await generate_ap_aging(db, fiscal_year, fiscal_month)
