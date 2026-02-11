"""MSSQL scheme_clearance 테이블 모델 — 통관 건 마스터"""
from sqlalchemy import Column, Integer, String, Date, Float, Boolean, DateTime
from app.core.database import MSSQLBase


class MssqlSchemeClearance(MSSQLBase):
    """통관 스킴 테이블 (MSSQL UNI_DebitNote.dbo.scheme_clearance)

    통관 건별 기본 정보. clearance 테이블과 1:1 관계 (id_clearance FK)
    """
    __tablename__ = "scheme_clearance"
    __table_args__ = {"schema": "dbo"}

    id_scheme_cd = Column(Integer, primary_key=True, autoincrement=True)
    id_clearance = Column(Integer, nullable=True)
    invoice = Column(String(255), nullable=True)
    invoice_date = Column(Date, nullable=True)
    im_ex = Column(String(255), nullable=True)
    arrival_date = Column(Date, nullable=True)
    company = Column(String(255), nullable=True)
    hbl = Column(String(255), nullable=True)
    phan_luong = Column(String(255), nullable=True)
    term = Column(String(255), nullable=True)
    clearance = Column(String(255), nullable=True)
    vessel = Column(String(255), nullable=True)
    loai_tk = Column(String(255), nullable=True)
    so_tk = Column(String(255), nullable=True)
    tk_nhanh = Column(String(255), nullable=True)
    ngay_tk = Column(Date, nullable=True)
    phuong_thuc_van_chuyen = Column(String(255), nullable=True)
    etd = Column(Date, nullable=True)
    so_kien = Column(String(255), nullable=True)
    trong_luong = Column(String(255), nullable=True)
    trong_luong_tinh_cuoc = Column(Float, nullable=True)
    mbl = Column(String(255), nullable=True)
    booking = Column(String(255), nullable=True)
    cbm = Column(String(255), nullable=True)
    ft_20 = Column(String(255), nullable=True)
    ft_40 = Column(String(255), nullable=True)
    from_to = Column(String(255), nullable=True)
    type_of_vehicle = Column(String(255), nullable=True)
    bien_so_xe = Column(String(255), nullable=True)
    noi_ha_rong = Column(String(255), nullable=True)
    ncc_cua_kh = Column(String(255), nullable=True)
    pol_pod = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=True)
