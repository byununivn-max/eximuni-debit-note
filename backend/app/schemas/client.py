from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClientBase(BaseModel):
    client_code: str
    client_name: str
    client_name_en: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None
    currency: str = "VND"
    complexity: str = "Medium"
    batch: Optional[str] = None
    structure_type: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    client_name: Optional[str] = None
    client_name_en: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    client_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    total: int
    items: List[ClientResponse]
