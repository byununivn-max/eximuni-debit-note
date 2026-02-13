"""MSSQL ops 테이블 모델 — Ops 비용 상세"""
from sqlalchemy import Column, Integer, Float, String
from app.core.database import MSSQLBase


class MssqlOps(MSSQLBase):
    """Ops 비용 상세 테이블 (MSSQL UNI_DebitNote.dbo.ops)

    scheme_ops와 1:1 관계 (scheme_ops.id_ops → ops.id_ops)
    """
    __tablename__ = "ops"
    __table_args__ = {"schema": "dbo"}

    id_ops = Column(Integer, primary_key=True, autoincrement=True)
    customs_clearance_fee = Column(Float, nullable=True)
    inspection = Column(Float, nullable=True)
    le_phi_tk = Column(Float, nullable=True)
    thue_nhap_khau = Column(Float, nullable=True)
    bien_lai = Column(String(255), nullable=True)
    phi_tach_bill = Column(Float, nullable=True)
    hoa_don_tach_bill = Column(String(255), nullable=True)
    phu_cap_cho_ops = Column(Float, nullable=True)
    cang_ha = Column(String(255), nullable=True)
    phi_luu_cont = Column(Float, nullable=True)
    hoa_don_phi_luu_con = Column(String(255), nullable=True)
    phi_luu_kho = Column(Float, nullable=True)
    hoa_don_luu_kho = Column(String(255), nullable=True)
    phi_lam_hang = Column(Float, nullable=True)
    note = Column(String(255), nullable=True)
    phi_co_a_thai = Column(Float, nullable=True)
    phi_co_c_thao = Column(Float, nullable=True)
