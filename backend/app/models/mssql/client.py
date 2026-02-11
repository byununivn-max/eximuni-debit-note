"""MSSQL clients 테이블 모델"""
from sqlalchemy import Column, Integer, String, Boolean, Date, Text
from app.core.database import MSSQLBase


class MssqlClient(MSSQLBase):
    """고객사 테이블 (MSSQL UNI_DebitNote.dbo.clients)"""
    __tablename__ = "clients"
    __table_args__ = {"schema": "dbo"}

    id_clients = Column(Integer, primary_key=True, autoincrement=True)
    id_sharepoint = Column(Integer, nullable=True)
    gender = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    phone_number = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    clients_type = Column(String(255), nullable=True)
    language = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    service = Column(Text, nullable=True)
    subscribe = Column(Boolean, nullable=True)
    active = Column(Boolean, nullable=True)
    position = Column(Text, nullable=True)
    industry = Column(String(255), nullable=True)
    fdi = Column(String(255), nullable=True)
    province = Column(String(255), nullable=True)
    key_contact = Column(Boolean, nullable=True)
    campaign = Column(String(255), nullable=True)
    unsubcribe_reason = Column(String(255), nullable=True)
    date_unsubcribe = Column(Date, nullable=True)
    date_subcribe = Column(Date, nullable=True)
