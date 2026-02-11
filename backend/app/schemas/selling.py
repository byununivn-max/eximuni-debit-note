"""매출 (Selling) Pydantic 스키마

erp_selling_records, erp_selling_items 응답/요청 스키마
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ============================================================
# Selling Item (매출 상세 항목)
# ============================================================
class SellingItemResponse(BaseModel):
    """매출 상세 항목 응답"""
    model_config = ConfigDict(from_attributes=True)

    item_id: int
    selling_id: int
    fee_name: str
    fee_category: Optional[str] = None
    amount: Decimal
    currency: str = "VND"
    mssql_source_column: Optional[str] = None


# ============================================================
# Selling Record (매출 집계)
# ============================================================
class SellingRecordResponse(BaseModel):
    """매출 집계 응답 (items 포함)"""
    model_config = ConfigDict(from_attributes=True)

    selling_id: int
    record_type: str
    mssql_source_id: int
    mssql_cost_id: Optional[int] = None
    customer_name: Optional[str] = None
    invoice_no: Optional[str] = None
    service_date: Optional[date] = None
    total_selling_vnd: Decimal
    item_count: int
    sync_status: str
    synced_at: datetime
    created_at: datetime
    updated_at: datetime
    items: List[SellingItemResponse] = []


class SellingRecordListItem(BaseModel):
    """매출 목록용 응답 (items 미포함, 경량)"""
    model_config = ConfigDict(from_attributes=True)

    selling_id: int
    record_type: str
    mssql_source_id: int
    customer_name: Optional[str] = None
    invoice_no: Optional[str] = None
    service_date: Optional[date] = None
    total_selling_vnd: Decimal
    item_count: int
    sync_status: str
    synced_at: datetime


class SellingRecordListResponse(BaseModel):
    """매출 목록 페이지네이션 응답"""
    total: int
    items: List[SellingRecordListItem]


# ============================================================
# 동기화 결과
# ============================================================
class SyncResultResponse(BaseModel):
    """동기화 결과 응답"""
    total_synced: int
    clearance_count: int
    ops_count: int
    co_count: int
    errors: List[str] = []


# ============================================================
# 매출 요약 (Summary)
# ============================================================
class SellingSummaryItem(BaseModel):
    """유형별 매출 요약"""
    record_type: str
    count: int
    total_vnd: Decimal


class SellingSummaryResponse(BaseModel):
    """매출 요약 응답"""
    items: List[SellingSummaryItem]
    grand_total_vnd: Decimal
    total_records: int
