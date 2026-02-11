"""비용 분류 + 월별 비용 집계 Pydantic 스키마"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# 비용 분류 (Cost Classification)
# ============================================================
COST_TYPE_CHOICES = ["fixed", "variable", "semi_variable"]
ALLOCATION_METHOD_CHOICES = ["daily_prorate", "monthly_lump", "revenue_based"]
COST_CATEGORY_CHOICES = [
    "salary", "material", "depreciation", "maintenance",
    "tax", "prepaid", "outsourced", "other",
]


class CostClassificationBase(BaseModel):
    account_code: str = Field(..., max_length=7, description="계정코드 (7자리)")
    cost_type: str = Field(
        ..., description="fixed/variable/semi_variable",
    )
    cost_category: str = Field(
        ..., description="salary/material/depreciation/maintenance/tax/prepaid/outsourced/other",
    )
    allocation_method: str = Field(
        default="daily_prorate",
        description="daily_prorate/monthly_lump/revenue_based",
    )
    cost_center_code: Optional[str] = Field(
        None, description="비용센터 (NULL이면 전사)",
    )
    description_vn: Optional[str] = None
    description_en: Optional[str] = None
    is_active: bool = True
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None


class CostClassificationCreate(CostClassificationBase):
    pass


class CostClassificationUpdate(BaseModel):
    cost_type: Optional[str] = None
    cost_category: Optional[str] = None
    allocation_method: Optional[str] = None
    cost_center_code: Optional[str] = None
    description_vn: Optional[str] = None
    description_en: Optional[str] = None
    is_active: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None


class CostClassificationResponse(CostClassificationBase):
    classification_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CostClassificationListResponse(BaseModel):
    items: List[CostClassificationResponse]
    total: int


# ============================================================
# 월별 비용 집계 (Monthly Cost Summary)
# ============================================================
class MonthlyCostSummaryResponse(BaseModel):
    summary_id: int
    fiscal_year: int
    fiscal_month: int
    account_code: str
    cost_type: str
    cost_center_code: Optional[str] = None
    total_amount: Decimal
    daily_allocated_amount: Decimal
    working_days: int
    calculated_at: datetime

    model_config = {"from_attributes": True}


class MonthlyCostSummaryListResponse(BaseModel):
    items: List[MonthlyCostSummaryResponse]
    total: int


class CostSummaryByType(BaseModel):
    """유형별 비용 집계"""
    cost_type: str
    total_amount: Decimal
    daily_allocated: Decimal
    account_count: int


class MonthlyCostOverview(BaseModel):
    """월별 비용 개요"""
    fiscal_year: int
    fiscal_month: int
    working_days: int
    by_type: List[CostSummaryByType]
    grand_total: Decimal
    grand_daily: Decimal


# ============================================================
# 비용 분류 시딩 (642x 초기 데이터)
# ============================================================
class SeedResult(BaseModel):
    created: int
    skipped: int
    total: int
