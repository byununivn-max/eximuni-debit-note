"""MSSQL an_sharepoint 테이블 모델 — Arrival Notice SharePoint"""
from sqlalchemy import Column, Integer, Float, String
from app.core.database import MSSQLBase


class MssqlAnSharepoint(MSSQLBase):
    """AN(Arrival Notice) SharePoint 테이블 (MSSQL UNI_DebitNote.dbo.an_sharepoint)

    항공 화물 도착 통지 및 관련 비용
    """
    __tablename__ = "an_sharepoint"
    __table_args__ = {"schema": "dbo"}

    id_an_sharepoint = Column(Integer, primary_key=True, autoincrement=True)
    id_column = Column(Integer, nullable=True)
    mbl = Column(String(255), nullable=True)
    hbl = Column(String(255), nullable=True)
    charge_weight = Column(Float, nullable=True)
    af = Column(String(255), nullable=True)
    exw_charge = Column(Float, nullable=True)
    fca_charge = Column(Float, nullable=True)
    handling_over_sea = Column(Float, nullable=True)
    ams = Column(Float, nullable=True)
    fsc = Column(Float, nullable=True)
    ssc = Column(Float, nullable=True)
    xra = Column(Float, nullable=True)
    irc = Column(Float, nullable=True)
    do = Column(Float, nullable=True)
    handling_fee = Column(Float, nullable=True)
