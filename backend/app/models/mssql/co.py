"""MSSQL co 테이블 모델 — CO 비용 상세"""
from sqlalchemy import Column, Integer, String
from app.core.database import MSSQLBase


class MssqlCo(MSSQLBase):
    """CO 비용 상세 테이블 (MSSQL UNI_DebitNote.dbo.co)

    scheme_co와 1:1 관계 (scheme_co.id_co → co.id_co)
    """
    __tablename__ = "co"
    __table_args__ = {"schema": "dbo"}

    id_co = Column(Integer, primary_key=True, autoincrement=True)
    id_contract = Column(Integer, nullable=True)
    le_phi_co = Column(Integer, nullable=True)
    le_phi_bo_cong_thuong = Column(Integer, nullable=True)
    phi_cap_moi_cap_lai = Column(String(255), nullable=True)
    note = Column(String(255), nullable=True)
    trang_thai = Column(String(255), nullable=True)
    phi_dv_sua_doi = Column(Integer, nullable=True)
