"""MSSQL scheme_co 테이블 모델 — CO 건 마스터"""
from sqlalchemy import Column, Integer, String, Date, Boolean
from app.core.database import MSSQLBase


class MssqlSchemeCo(MSSQLBase):
    """CO 스킴 테이블 (MSSQL UNI_DebitNote.dbo.scheme_co)

    CO(Certificate of Origin) 건별 기본 정보.
    co 테이블과 1:1 관계 (id_co FK)
    PK가 varchar(20) 타입 (자동증가 아님)
    """
    __tablename__ = "scheme_co"
    __table_args__ = {"schema": "dbo"}

    id_scheme_co = Column(String(20), primary_key=True)
    id_co = Column(Integer, nullable=True)
    form = Column(String(20), nullable=True)
    so_co = Column(String(20), nullable=True)
    ngay_cap = Column(Date, nullable=True)
    so_invoice = Column(String(255), nullable=True)
    so_to_khai = Column(String(255), nullable=True)
    so_bien_lai = Column(String(255), nullable=True)
    ma_tra_cuu = Column(String(255), nullable=True)
    ecis = Column(String(255), nullable=True)
    note = Column(String(255), nullable=True)
    ten_kh = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=True)
    nee = Column(String(255), nullable=True)
