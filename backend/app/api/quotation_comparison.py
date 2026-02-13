"""견적-실적 비교 API

Sprint 13: 견적 금액 vs 실제 매출/매입 비교 + CRUD
"""
from typing import Optional, List
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.quotation import QuotationActual

router = APIRouter(
    prefix="/api/v1/quotation-comparison",
    tags=["quotation-comparison"],
)


# --- Pydantic 스키마 (인라인) ---

class QuotationCreate(BaseModel):
    """견적-실적 생성 요청"""
    mssql_shipment_ref: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    service_type: str = "clearance"
    quotation_amount: float = 0
    actual_selling: float = 0
    actual_buying: float = 0
    invoice_no: Optional[str] = None
    analysis_date: Optional[date] = None
    notes: Optional[str] = None


class QuotationUpdate(BaseModel):
    """견적-실적 수정 요청"""
    quotation_amount: Optional[float] = None
    actual_selling: Optional[float] = None
    actual_buying: Optional[float] = None
    notes: Optional[str] = None


class QuotationResponse(BaseModel):
    """견적-실적 응답"""
    model_config = ConfigDict(from_attributes=True)

    comparison_id: int
    mssql_shipment_ref: Optional[str]
    customer_id: Optional[int]
    customer_name: Optional[str]
    service_type: str
    quotation_amount: float
    actual_selling: float
    actual_buying: float
    variance_selling: float
    variance_buying: float
    variance_gp: float
    invoice_no: Optional[str]
    analysis_date: Optional[date]
    notes: Optional[str]


# --- 엔드포인트 ---

@router.get("", response_model=List[QuotationResponse])
async def list_quotation_actuals(
    year: Optional[int] = Query(None),
    service_type: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """견적-실적 비교 목록 조회"""
    q = select(QuotationActual)

    if year:
        q = q.where(
            func.extract("year", QuotationActual.analysis_date) == year
        )
    if service_type:
        q = q.where(QuotationActual.service_type == service_type)
    if customer_name:
        q = q.where(
            QuotationActual.customer_name.ilike(f"%{customer_name}%")
        )

    q = q.order_by(desc(QuotationActual.analysis_date))
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/summary")
async def quotation_summary(
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """견적-실적 요약 통계"""
    q = select(
        func.count(QuotationActual.comparison_id).label("total_count"),
        func.sum(QuotationActual.quotation_amount).label("total_quotation"),
        func.sum(QuotationActual.actual_selling).label("total_selling"),
        func.sum(QuotationActual.actual_buying).label("total_buying"),
        func.sum(QuotationActual.variance_selling).label("total_var_sell"),
        func.sum(QuotationActual.variance_gp).label("total_var_gp"),
    )
    if year:
        q = q.where(
            func.extract("year", QuotationActual.analysis_date) == year
        )
    result = await db.execute(q)
    row = result.one()

    total_q = float(row.total_quotation or 0)
    total_s = float(row.total_selling or 0)
    total_b = float(row.total_buying or 0)

    return {
        "total_count": row.total_count or 0,
        "total_quotation": total_q,
        "total_selling": total_s,
        "total_buying": total_b,
        "total_gp": total_s - total_b,
        "variance_selling": float(row.total_var_sell or 0),
        "variance_gp": float(row.total_var_gp or 0),
        "accuracy_rate": (
            round(
                min(total_q, total_s) / max(total_q, total_s) * 100, 1
            )
            if total_q and total_s else 0
        ),
    }


@router.post("", response_model=QuotationResponse)
async def create_quotation_actual(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """견적-실적 비교 데이터 생성"""
    q_amt = Decimal(str(data.quotation_amount))
    s_amt = Decimal(str(data.actual_selling))
    b_amt = Decimal(str(data.actual_buying))

    record = QuotationActual(
        mssql_shipment_ref=data.mssql_shipment_ref,
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        service_type=data.service_type,
        quotation_amount=q_amt,
        actual_selling=s_amt,
        actual_buying=b_amt,
        variance_selling=s_amt - q_amt,
        variance_buying=b_amt,
        variance_gp=(s_amt - b_amt) - (q_amt - b_amt),
        invoice_no=data.invoice_no,
        analysis_date=data.analysis_date or date.today(),
        notes=data.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.put("/{comparison_id}", response_model=QuotationResponse)
async def update_quotation_actual(
    comparison_id: int,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """견적-실적 비교 데이터 수정"""
    result = await db.execute(
        select(QuotationActual).where(
            QuotationActual.comparison_id == comparison_id
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")

    if data.quotation_amount is not None:
        record.quotation_amount = Decimal(str(data.quotation_amount))
    if data.actual_selling is not None:
        record.actual_selling = Decimal(str(data.actual_selling))
    if data.actual_buying is not None:
        record.actual_buying = Decimal(str(data.actual_buying))
    if data.notes is not None:
        record.notes = data.notes

    # variance 재계산
    record.variance_selling = record.actual_selling - record.quotation_amount
    record.variance_gp = (
        (record.actual_selling - record.actual_buying)
        - (record.quotation_amount - record.actual_buying)
    )

    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{comparison_id}")
async def delete_quotation_actual(
    comparison_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """견적-실적 비교 데이터 삭제"""
    result = await db.execute(
        select(QuotationActual).where(
            QuotationActual.comparison_id == comparison_id
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")

    await db.delete(record)
    await db.commit()
    return {"message": "Deleted", "comparison_id": comparison_id}
