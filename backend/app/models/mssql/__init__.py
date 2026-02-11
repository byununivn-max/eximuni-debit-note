"""MSSQL 레거시 테이블 모델 (읽기 전용/조회용)

UNI_DebitNote 데이터베이스의 기존 운영 테이블:
- T_Client: 고객사 정보
- T_Clearance: 통관 정보
- T_Shipment: 선적 정보
"""
from app.models.mssql.client import MssqlClient
from app.models.mssql.clearance import MssqlClearance
from app.models.mssql.shipment import MssqlShipment

__all__ = ["MssqlClient", "MssqlClearance", "MssqlShipment"]
