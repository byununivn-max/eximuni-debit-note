"""MSSQL scheme_ops 테이블 모델 — Ops 건 마스터"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import MSSQLBase


class MssqlSchemeOps(MSSQLBase):
    """Ops 스킴 테이블 (MSSQL UNI_DebitNote.dbo.scheme_ops)

    운영 건별 기본 정보. ops 테이블과 1:1 관계 (id_ops FK)
    """
    __tablename__ = "scheme_ops"
    __table_args__ = {"schema": "dbo"}

    id_scheme_ops = Column(Integer, primary_key=True, autoincrement=True)
    id_ops = Column(Integer, nullable=True)
    name = Column(String(255), nullable=True)
    create_at = Column(DateTime, nullable=True)
    type = Column(String(50), nullable=True)
    customer = Column(String(255), nullable=True)
    so_cont = Column(String(255), nullable=True)
    so_kien = Column(String(255), nullable=True)
    so_tk = Column(String(255), nullable=True)
    ma_loai_hinh = Column(String(255), nullable=True)
    phan_luong = Column(String(255), nullable=True)
    so_invoice = Column(String(255), nullable=True)
    booking = Column(String(255), nullable=True)
    so_co = Column(String(255), nullable=True)
    hbl = Column(String(255), nullable=True)
    mbl = Column(String(255), nullable=True)
    form = Column(String(255), nullable=True)
    ecis = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=True)
