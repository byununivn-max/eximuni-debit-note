"""MSSQL T_Clearance 테이블 모델"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric
from app.core.database import MSSQLBase


class MssqlClearance(MSSQLBase):
    """통관 정보 테이블 (MSSQL UNI_DebitNote.dbo.T_Clearance)"""
    __tablename__ = "T_Clearance"
    __table_args__ = {"schema": "dbo"}

    clearance_id = Column("ClearanceID", Integer, primary_key=True, autoincrement=True)
    clearance_no = Column("ClearanceNo", String(100), unique=True, nullable=False)
    client_id = Column("ClientID", Integer, nullable=False)
    bl_no = Column("BLNo", String(100))
    vessel_name = Column("VesselName", String(200))
    port_of_loading = Column("PortOfLoading", String(200))
    port_of_discharge = Column("PortOfDischarge", String(200))
    eta_date = Column("ETADate", DateTime)
    clearance_date = Column("ClearanceDate", DateTime)
    status = Column("Status", String(50))
    total_amount = Column("TotalAmount", Numeric(18, 2))
    currency = Column("Currency", String(10))
    created_date = Column("CreatedDate", DateTime, default=datetime.utcnow)
