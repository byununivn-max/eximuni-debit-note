"""MSSQL customer_config 테이블 모델 — 고객별 자동입력 설정"""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime
from app.core.database import MSSQLBase


class MssqlCustomerConfig(MSSQLBase):
    """고객별 자동입력 설정 테이블 (MSSQL UNI_DebitNote.dbo.customer_config)

    고객/서비스 유형별 기본 비용 값 설정
    """
    __tablename__ = "customer_config"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer = Column(String(255), nullable=False)
    co_cd_type = Column(String(20), nullable=True)
    form_type = Column(String(255), nullable=True)
    phan_luong = Column(String(100), nullable=True)
    field_name = Column(String(200), nullable=False)
    field_value = Column(Numeric(15, 2), nullable=True)
    priority = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
