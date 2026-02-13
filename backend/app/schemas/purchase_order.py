"""매입주문 Pydantic 스키마 (Sprint 3)"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ============================================================
# Purchase Item (매입 상세)
# ============================================================
class PurchaseItemBase(BaseModel):
    """매입 상세 공통 필드"""
    description: str
    cost_category: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_price: Decimal = Decimal("0")
    currency: str = "VND"
    amount: Decimal = Decimal("0")
    is_vat_applicable: bool = False
    notes: Optional[str] = None


class PurchaseItemCreate(PurchaseItemBase):
    """매입 상세 생성 요청"""
    pass


class PurchaseItemResponse(PurchaseItemBase):
    """매입 상세 응답"""
    item_id: int
    po_id: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Purchase Order (매입 기록)
# ============================================================
class PurchaseOrderBase(BaseModel):
    """매입주문 공통 필드"""
    supplier_id: int
    mssql_shipment_ref: Optional[int] = None
    service_type: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    amount: Decimal = Decimal("0")
    currency: str = "VND"
    exchange_rate: Optional[Decimal] = None
    amount_vnd: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = Decimal("0")
    vat_amount: Optional[Decimal] = Decimal("0")
    total_amount: Decimal = Decimal("0")
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    """매입주문 생성 요청 (상세 항목 포함)"""
    items: List[PurchaseItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    """매입주문 수정 요청 (부분 업데이트)"""
    supplier_id: Optional[int] = None
    mssql_shipment_ref: Optional[int] = None
    service_type: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    amount_vnd: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseItemCreate]] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    """매입주문 응답"""
    po_id: int
    po_number: str
    payment_status: str
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseItemResponse] = []
    supplier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderListResponse(BaseModel):
    """매입주문 목록 응답"""
    total: int
    items: List[PurchaseOrderResponse]
