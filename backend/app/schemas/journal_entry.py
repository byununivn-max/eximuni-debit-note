"""분개전표 Pydantic 스키마"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# 분개 라인 (Journal Line)
# ============================================================
class JournalLineBase(BaseModel):
    """분개 라인 공통 필드"""
    line_number: int = 1
    account_code: str = Field(..., max_length=7)
    counter_account_code: Optional[str] = None
    description_vn: Optional[str] = None
    description_en: Optional[str] = None
    debit_amount: Decimal = Field(default=Decimal("0"))
    credit_amount: Decimal = Field(default=Decimal("0"))
    currency_amount: Optional[Decimal] = None
    currency_code: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    employee_id: Optional[str] = None
    cost_center_id: Optional[int] = None
    job_center: Optional[str] = None
    profit_center: Optional[str] = None
    tax_code: Optional[str] = None
    tax_amount: Optional[Decimal] = None
    tax_account: Optional[str] = None


class JournalLineCreate(JournalLineBase):
    """분개 라인 생성"""
    pass


class JournalLineResponse(JournalLineBase):
    """분개 라인 응답"""
    line_id: int
    entry_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# 분개 전표 (Journal Entry)
# ============================================================
class JournalEntryBase(BaseModel):
    """분개 전표 공통 필드"""
    entry_number: str = Field(..., max_length=20)
    module: str = Field(..., max_length=5, description="GL/AP/AR/CA/OF")
    fiscal_year: int
    fiscal_month: int = Field(..., ge=1, le=12)
    entry_date: date
    voucher_date: Optional[date] = None
    description_vn: Optional[str] = None
    description_en: Optional[str] = None
    description_kr: Optional[str] = None
    currency_code: str = "VND"
    exchange_rate: Optional[Decimal] = Decimal("1")
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    employee_id: Optional[str] = None
    cost_center_id: Optional[int] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    serial_no: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    """분개 전표 생성 요청"""
    lines: List[JournalLineCreate] = Field(
        ..., min_length=1, description="최소 1개 라인",
    )


class JournalEntryResponse(JournalEntryBase):
    """분개 전표 응답"""
    entry_id: int
    total_debit: Decimal
    total_credit: Decimal
    status: str
    source: str
    smartbooks_batch_nbr: Optional[str] = None
    created_by: Optional[int] = None
    posted_at: Optional[datetime] = None
    posted_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    lines: List[JournalLineResponse] = []

    model_config = {"from_attributes": True}


class JournalEntryListItem(BaseModel):
    """분개 전표 목록 항목 (라인 제외)"""
    entry_id: int
    entry_number: str
    module: str
    fiscal_year: int
    fiscal_month: int
    entry_date: date
    description_vn: Optional[str] = None
    description_kr: Optional[str] = None
    currency_code: str
    total_debit: Decimal
    total_credit: Decimal
    status: str
    source: str
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalEntryListResponse(BaseModel):
    """분개 전표 목록 응답"""
    items: List[JournalEntryListItem]
    total: int


class JournalImportResult(BaseModel):
    """SmartBooks 임포트 결과"""
    entries_created: int
    lines_created: int
    errors: List[str] = []
    skipped: int = 0


class JournalValidationResult(BaseModel):
    """분개 검증 결과"""
    total_entries: int
    balanced_entries: int
    unbalanced_entries: int
    total_debit: Decimal
    total_credit: Decimal
    is_balanced: bool
    details: List[str] = []
