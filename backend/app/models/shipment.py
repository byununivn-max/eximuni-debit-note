"""거래 데이터 모델 (FR-007 ~ FR-011) - Master Data"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Date, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Shipment(Base):
    """선적/거래 데이터 테이블 - Master Data (FR-007, FR-008)

    NEXCON 기준 컬럼: B(Delivery Date), C(Invoice No), D(MBL), E(HBL),
    F(Term), G(No. of pkgs), H(Gross weight), I(Chargable weight),
    J(CD No.), K(CD Type), L(Air rate/Ocean freight)
    """
    __tablename__ = "shipments"

    shipment_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=False)

    # 기본 선적 정보 (컬럼 A-L)
    line_no = Column(Integer)  # A: No.
    delivery_date = Column(Date)  # B: Delivery Date
    invoice_no = Column(String(100))  # C: Commercial Invoice No.
    mbl = Column(String(100))  # D: Master Bill of Lading
    hbl = Column(String(100))  # E: House Bill of Lading
    term = Column(String(50))  # F: 무역조건 (FOB, EXW, DAP 등)
    no_of_pkgs = Column(Integer)  # G: 포장 개수
    gross_weight = Column(Numeric(12, 3))  # H: 총 중량
    chargeable_weight = Column(Numeric(12, 3))  # I: 과금 중량
    cd_no = Column(String(100))  # J: 세관신고번호
    cd_type = Column(String(20))  # K: 세관문서유형 (A12, E21 등)
    air_ocean_rate = Column(String(100))  # L: 운임 요율 유형

    # 구분
    shipment_type = Column(String(20), nullable=False, default="IMPORT")  # IMPORT or EXPORT
    origin_destination = Column(String(200))  # 출발지/도착지 (EXPORT 컬럼 M)

    # 추가 정보
    back_to_back_invoice = Column(String(200))  # BG: 참조 문서
    note = Column(Text)  # BR: NOTE

    # 데이터 소스
    source_app = Column(String(50))  # OPS, Clearance+Trucking, C/O

    # 상태
    status = Column(String(50), default="ACTIVE")  # ACTIVE, BILLED, CANCELLED
    is_duplicate = Column(Boolean, default=False)  # 중복 여부

    # 메타
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="shipments")
    fee_details = relationship("ShipmentFeeDetail", back_populates="shipment", cascade="all, delete-orphan")
    debit_note_lines = relationship("DebitNoteLine", back_populates="shipment")


class ShipmentFeeDetail(Base):
    """선적별 비용 상세 - 각 비용 항목별 금액 (컬럼 M-AT)"""
    __tablename__ = "shipment_fee_details"

    detail_id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(Integer, ForeignKey("shipments.shipment_id", ondelete="CASCADE"), nullable=False)
    fee_item_id = Column(Integer, ForeignKey("fee_items.fee_item_id"), nullable=False)

    amount_usd = Column(Numeric(15, 2), default=0)  # USD 금액
    amount_vnd = Column(Numeric(15, 0), default=0)  # VND 금액
    currency = Column(String(10), default="USD")

    # 세전/세후
    is_tax_inclusive = Column(Boolean, default=False)
    pre_tax_amount = Column(Numeric(15, 2))  # 세전 금액 (Handling/D/O ÷1.08)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shipment = relationship("Shipment", back_populates="fee_details")
    fee_item = relationship("FeeItem", back_populates="shipment_fee_details")


class DuplicateDetection(Base):
    """중복 감지 기록 (FR-009)"""
    __tablename__ = "duplicate_detections"

    detection_id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(Integer, ForeignKey("shipments.shipment_id", ondelete="CASCADE"), nullable=False)
    duplicate_shipment_id = Column(Integer, ForeignKey("shipments.shipment_id"), nullable=False)
    duplicate_type = Column(String(20), nullable=False)  # HBL, MBL, INV, CD
    duplicate_value = Column(String(200), nullable=False)  # 중복된 실제 값
    status = Column(String(20), default="DETECTED")  # DETECTED, RESOLVED, IGNORED
    resolved_by = Column(Integer, ForeignKey("users.user_id"))
    resolved_at = Column(DateTime)
    notes = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)
