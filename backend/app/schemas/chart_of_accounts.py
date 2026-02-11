"""계정과목 + 회계기간 + 비용센터 Pydantic 스키마"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# 계정과목 (Chart of Accounts)
# ============================================================
class CoABase(BaseModel):
    """계정과목 공통 필드"""
    account_code: str = Field(..., max_length=7, description="7자리 계정코드")
    account_name_vn: str = Field(..., max_length=200)
    account_name_en: str = Field(..., max_length=200)
    account_name_kr: str = Field(..., max_length=200)
    account_type: str = Field(
        ..., description="asset/liability/equity/revenue/expense",
    )
    account_group: str = Field(..., max_length=3, description="상위 3자리 그룹")
    parent_account_code: Optional[str] = None
    is_detail_account: bool = True
    normal_balance: str = Field(
        default="debit", description="debit/credit",
    )
    is_active: bool = True
    smartbooks_mapped: bool = False


class CoACreate(CoABase):
    """계정과목 생성 요청"""
    pass


class CoAUpdate(BaseModel):
    """계정과목 수정 요청"""
    account_name_vn: Optional[str] = None
    account_name_en: Optional[str] = None
    account_name_kr: Optional[str] = None
    parent_account_code: Optional[str] = None
    is_detail_account: Optional[bool] = None
    normal_balance: Optional[str] = None
    is_active: Optional[bool] = None


class CoAResponse(CoABase):
    """계정과목 응답"""
    account_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CoATreeItem(BaseModel):
    """계정과목 트리 노드"""
    account_id: int
    account_code: str
    account_name_vn: str
    account_name_en: str
    account_name_kr: str
    account_type: str
    account_group: str
    normal_balance: str
    is_active: bool
    smartbooks_mapped: bool
    children: List["CoATreeItem"] = []

    model_config = {"from_attributes": True}


CoATreeItem.model_rebuild()


# ============================================================
# 회계기간 (Fiscal Period)
# ============================================================
class FiscalPeriodBase(BaseModel):
    """회계기간 공통 필드"""
    fiscal_year: int
    period_month: int = Field(..., ge=1, le=12)
    start_date: date
    end_date: date


class FiscalPeriodCreate(FiscalPeriodBase):
    """회계기간 생성 요청"""
    pass


class FiscalPeriodResponse(FiscalPeriodBase):
    """회계기간 응답"""
    period_id: int
    is_closed: bool
    closed_at: Optional[datetime] = None
    closed_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FiscalPeriodListResponse(BaseModel):
    """회계기간 목록 응답"""
    items: List[FiscalPeriodResponse]
    total: int


# ============================================================
# 비용센터 (Cost Center)
# ============================================================
class CostCenterBase(BaseModel):
    """비용센터 공통 필드"""
    center_code: str = Field(..., max_length=20)
    center_name_vn: Optional[str] = None
    center_name_en: Optional[str] = None
    center_name_kr: Optional[str] = None
    center_type: str = Field(default="other", description="logistic/general/other")
    is_active: bool = True


class CostCenterCreate(CostCenterBase):
    """비용센터 생성 요청"""
    pass


class CostCenterResponse(CostCenterBase):
    """비용센터 응답"""
    center_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
