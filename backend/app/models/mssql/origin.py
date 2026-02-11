"""MSSQL origin 테이블 모델 — 원산지 코드"""
from sqlalchemy import Column, Integer, String
from app.core.database import MSSQLBase


class MssqlOrigin(MSSQLBase):
    """원산지 코드 테이블 (MSSQL UNI_DebitNote.dbo.origin)"""
    __tablename__ = "origin"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    ten_nuoc = Column(String(255), nullable=True)
    ghi_chu = Column(String(255), nullable=True)
