"""MSSQL T_Shipment 테이블 모델"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric
from app.core.database import MSSQLBase


class MssqlShipment(MSSQLBase):
    """선적 정보 테이블 (MSSQL UNI_DebitNote.dbo.T_Shipment)"""
    __tablename__ = "T_Shipment"
    __table_args__ = {"schema": "dbo"}

    shipment_id = Column("ShipmentID", Integer, primary_key=True, autoincrement=True)
    shipment_no = Column("ShipmentNo", String(100), nullable=False)
    clearance_id = Column("ClearanceID", Integer, nullable=False)
    client_id = Column("ClientID", Integer, nullable=False)
    container_no = Column("ContainerNo", String(100))
    cargo_description = Column("CargoDescription", String(500))
    quantity = Column("Quantity", Integer)
    weight_kg = Column("WeightKG", Numeric(18, 3))
    cbm = Column("CBM", Numeric(18, 3))
    status = Column("Status", String(50))
    created_date = Column("CreatedDate", DateTime, default=datetime.utcnow)
