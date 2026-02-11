"""MSSQL T_Client 테이블 모델"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import MSSQLBase


class MssqlClient(MSSQLBase):
    """고객사 테이블 (MSSQL UNI_DebitNote.dbo.T_Client)"""
    __tablename__ = "T_Client"
    __table_args__ = {"schema": "dbo"}

    client_id = Column("ClientID", Integer, primary_key=True, autoincrement=True)
    client_code = Column("ClientCode", String(50), unique=True, nullable=False)
    client_name = Column("ClientName", String(200), nullable=False)
    client_name_en = Column("ClientNameEN", String(200))
    country = Column("Country", String(100))
    address = Column("Address", String(500))
    contact_person = Column("ContactPerson", String(100))
    contact_email = Column("ContactEmail", String(200))
    contact_phone = Column("ContactPhone", String(50))
    is_active = Column("IsActive", Boolean, default=True)
    created_date = Column("CreatedDate", DateTime, default=datetime.utcnow)
    updated_date = Column("UpdatedDate", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
