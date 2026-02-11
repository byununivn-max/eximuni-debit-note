"""회계 거래처 + 계정잔액 Pydantic 스키마"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# 회계 공급사 (Accounting Vendor)
# ============================================================
class AccVendorBase(BaseModel):
    tax_id: str = Field(..., max_length=20, description="사업자등록번호")
    vendor_name_vn: Optional[str] = None
    vendor_name_en: Optional[str] = None
    default_ap_account: str = "3311000"
    default_expense_account: Optional[str] = None
    payment_terms: Optional[str] = None
    currency_code: str = "VND"
    is_active: bool = True


class AccVendorCreate(AccVendorBase):
    pass


class AccVendorResponse(AccVendorBase):
    vendor_id: int
    mssql_supplier_ref: Optional[int] = None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccVendorListResponse(BaseModel):
    items: List[AccVendorResponse]
    total: int


# ============================================================
# 회계 고객 (Accounting Customer)
# ============================================================
class AccCustomerBase(BaseModel):
    tax_id: str = Field(..., max_length=20, description="사업자등록번호")
    customer_name_vn: Optional[str] = None
    customer_name_en: Optional[str] = None
    default_ar_account: str = "1311000"
    default_revenue_account: str = "5113001"
    payment_terms: Optional[str] = None
    currency_code: str = "VND"
    is_active: bool = True


class AccCustomerCreate(AccCustomerBase):
    pass


class AccCustomerResponse(AccCustomerBase):
    customer_id: int
    mssql_client_ref: Optional[int] = None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccCustomerListResponse(BaseModel):
    items: List[AccCustomerResponse]
    total: int


# ============================================================
# 계정 잔액 (Account Balance)
# ============================================================
class AccountBalanceResponse(BaseModel):
    balance_id: int
    account_code: str
    fiscal_year: int
    fiscal_month: int
    opening_debit: Decimal
    opening_credit: Decimal
    period_debit: Decimal
    period_credit: Decimal
    closing_debit: Decimal
    closing_credit: Decimal
    currency_code: str
    calculated_at: datetime

    model_config = {"from_attributes": True}


class TrialBalanceItem(BaseModel):
    """시산표 항목"""
    account_code: str
    account_name_kr: Optional[str] = None
    account_name_en: Optional[str] = None
    account_type: Optional[str] = None
    opening_debit: Decimal = Decimal("0")
    opening_credit: Decimal = Decimal("0")
    period_debit: Decimal = Decimal("0")
    period_credit: Decimal = Decimal("0")
    closing_debit: Decimal = Decimal("0")
    closing_credit: Decimal = Decimal("0")


class TrialBalanceResponse(BaseModel):
    """시산표 응답"""
    fiscal_year: int
    fiscal_month: int
    items: List[TrialBalanceItem]
    totals: TrialBalanceItem


class MatchResult(BaseModel):
    """거래처 매칭 결과"""
    matched: int
    unmatched: int
    details: List[str] = []
