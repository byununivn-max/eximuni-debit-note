"""MSSQL companies 테이블 모델 — 회사 정보"""
from sqlalchemy import Column, Integer, String
from app.core.database import MSSQLBase


class MssqlCompany(MSSQLBase):
    """회사 정보 테이블 (MSSQL UNI_DebitNote.dbo.companies)"""
    __tablename__ = "companies"
    __table_args__ = {"schema": "dbo"}

    id_companies = Column(Integer, primary_key=True, autoincrement=True)
    name_companies = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    area = Column(String(255), nullable=True)
    nguoi_dai_dien = Column(String(255), nullable=True)
    chuc_vu = Column(String(255), nullable=True)
    ma_so_thue = Column(String(255), nullable=True)
    priority = Column(String(255), nullable=True)
