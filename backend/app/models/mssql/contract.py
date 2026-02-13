"""MSSQL contract 테이블 모델 — CO 계약 정보"""
from sqlalchemy import Column, Integer, String
from app.core.database import MSSQLBase


class MssqlContract(MSSQLBase):
    """CO 계약 테이블 (MSSQL UNI_DebitNote.dbo.contract)

    CO 서비스 요금 계약. co 테이블에서 id_contract로 참조
    """
    __tablename__ = "contract"
    __table_args__ = {"schema": "dbo"}

    id_contract = Column(Integer, primary_key=True, autoincrement=True)
    ten_khach = Column(String(50), nullable=True)
    co_fee = Column(String(50), nullable=True)
    amount = Column(Integer, nullable=True)
