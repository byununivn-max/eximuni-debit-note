"""MSSQL customer_clearance 테이블 모델 — 고객별 통관 동적 폼 설정"""
from sqlalchemy import Column, Integer, String, Text
from app.core.database import MSSQLBase


class MssqlCustomerClearance(MSSQLBase):
    """고객별 통관 동적 폼 테이블 (MSSQL UNI_DebitNote.dbo.customer_clearance)

    Inputs 컬럼에 JSON 형식으로 고객별 동적 입력 필드 정의
    """
    __tablename__ = "customer_clearance"
    __table_args__ = {"schema": "dbo"}

    id_customer = Column(Integer, primary_key=True, autoincrement=True)
    name_customer = Column(String(255), nullable=True)
    inputs = Column("Inputs", Text, nullable=True)
