"""MSSQL npl_code 테이블 모델 — NPL 코드"""
from sqlalchemy import Column, Integer, String
from app.core.database import MSSQLBase


class MssqlNplCode(MSSQLBase):
    """NPL 코드 테이블 (MSSQL UNI_DebitNote.dbo.npl_code)"""
    __tablename__ = "npl_code"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    ma_code = Column(String(255), nullable=True)
    ten = Column(String(255), nullable=True)
