"""공급사 Pydantic 스키마 (Sprint 3)"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    """공급사 공통 필드"""
    supplier_code: str
    supplier_name: str
    supplier_type: str = "other"
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: str = "VND"
    address: Optional[str] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    """공급사 생성 요청"""
    pass


class SupplierUpdate(BaseModel):
    """공급사 수정 요청 (부분 업데이트)"""
    supplier_name: Optional[str] = None
    supplier_type: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    """공급사 응답"""
    supplier_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierListResponse(BaseModel):
    """공급사 목록 응답"""
    total: int
    items: List[SupplierResponse]
