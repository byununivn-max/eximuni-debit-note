from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class FeeDetailCreate(BaseModel):
    fee_item_id: int
    amount_usd: Decimal = Decimal("0")
    amount_vnd: Decimal = Decimal("0")
    currency: str = "USD"
    is_tax_inclusive: bool = False
    notes: Optional[str] = None


class FeeDetailResponse(BaseModel):
    detail_id: int
    fee_item_id: int
    amount_usd: Decimal
    amount_vnd: Decimal
    currency: str
    is_tax_inclusive: bool
    pre_tax_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True


class ShipmentBase(BaseModel):
    client_id: int
    shipment_type: str = "IMPORT"
    delivery_date: Optional[date] = None
    invoice_no: Optional[str] = None
    mbl: Optional[str] = None
    hbl: Optional[str] = None
    term: Optional[str] = None
    no_of_pkgs: Optional[int] = None
    gross_weight: Optional[Decimal] = None
    chargeable_weight: Optional[Decimal] = None
    cd_no: Optional[str] = None
    cd_type: Optional[str] = None
    air_ocean_rate: Optional[str] = None
    origin_destination: Optional[str] = None
    back_to_back_invoice: Optional[str] = None
    note: Optional[str] = None
    source_app: Optional[str] = None


class ShipmentCreate(ShipmentBase):
    fee_details: Optional[List[FeeDetailCreate]] = []


class ShipmentUpdate(BaseModel):
    delivery_date: Optional[date] = None
    invoice_no: Optional[str] = None
    mbl: Optional[str] = None
    hbl: Optional[str] = None
    term: Optional[str] = None
    no_of_pkgs: Optional[int] = None
    gross_weight: Optional[Decimal] = None
    chargeable_weight: Optional[Decimal] = None
    cd_no: Optional[str] = None
    cd_type: Optional[str] = None
    note: Optional[str] = None


class DuplicateWarning(BaseModel):
    duplicate_type: str
    duplicate_value: str
    existing_shipment_id: int


class ShipmentResponse(ShipmentBase):
    shipment_id: int
    line_no: Optional[int] = None
    status: str
    is_duplicate: bool
    created_at: datetime
    updated_at: datetime
    fee_details: List[FeeDetailResponse] = []
    duplicates: List[DuplicateWarning] = []

    class Config:
        from_attributes = True


class ShipmentListResponse(BaseModel):
    total: int
    items: List[ShipmentResponse]
