from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class DebitNoteCreate(BaseModel):
    client_id: int
    period_from: date
    period_to: date
    exchange_rate: Decimal
    sheet_type: str = "ALL"  # IMPORT, EXPORT, ALL
    notes: Optional[str] = None


class DebitNoteLineResponse(BaseModel):
    line_id: int
    shipment_id: int
    line_no: Optional[int] = None
    total_usd: Decimal
    total_vnd: Decimal
    vat_amount: Decimal
    grand_total_vnd: Decimal
    freight_usd: Decimal
    local_charges_usd: Decimal

    class Config:
        from_attributes = True


class DebitNoteResponse(BaseModel):
    debit_note_id: int
    debit_note_number: Optional[str] = None
    client_id: int
    client_name: Optional[str] = None
    period_from: date
    period_to: date
    billing_date: Optional[date] = None
    total_usd: Decimal
    total_vnd: Decimal
    total_vat: Decimal
    grand_total_vnd: Decimal
    exchange_rate: Optional[Decimal] = None
    status: str
    sheet_type: Optional[str] = None
    total_lines: int
    created_by: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[DebitNoteLineResponse] = []

    class Config:
        from_attributes = True


class DebitNoteListResponse(BaseModel):
    total: int
    items: List[DebitNoteResponse]


class WorkflowAction(BaseModel):
    comment: Optional[str] = None


class DebitNoteWorkflowResponse(BaseModel):
    workflow_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    performed_by: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
