"""MSSQL 레거시 데이터 응답 스키마"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TypeVar, Generic
from pydantic import BaseModel, ConfigDict


# ============================================================
# Client Schemas
# ============================================================
class MssqlClientResponse(BaseModel):
    """고객사 기본 정보 응답"""
    client_id: int
    client_code: str
    client_name: str
    client_name_en: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class MssqlClientDetailResponse(MssqlClientResponse):
    """고객사 상세 정보 응답 (최근 통관 내역 포함)"""
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    created_date: Optional[datetime] = None
    recent_clearances: List["MssqlClearanceResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Clearance Schemas
# ============================================================
class MssqlClearanceResponse(BaseModel):
    """통관 정보 응답"""
    clearance_id: int
    clearance_no: str
    client_id: int
    bl_no: Optional[str] = None
    vessel_name: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    eta_date: Optional[datetime] = None
    clearance_date: Optional[datetime] = None
    status: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MssqlClearanceDetailResponse(MssqlClearanceResponse):
    """통관 상세 정보 응답 (선적 목록 포함)"""
    shipments: List["MssqlShipmentResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Shipment Schemas
# ============================================================
class MssqlShipmentResponse(BaseModel):
    """선적 정보 응답"""
    shipment_id: int
    shipment_no: str
    clearance_id: int
    client_id: int
    container_no: Optional[str] = None
    cargo_description: Optional[str] = None
    quantity: Optional[int] = None
    weight_kg: Optional[Decimal] = None
    cbm: Optional[Decimal] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Generic Pagination
# ============================================================
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션 응답 (제네릭)"""
    total: int
    items: List[T]

    model_config = ConfigDict(from_attributes=True)
