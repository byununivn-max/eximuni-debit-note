"""거래처 및 템플릿 관리 모델 (FR-004 ~ FR-006, FR-036 ~ FR-038)"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Client(Base):
    """거래처 테이블 - 31개 거래처 관리"""
    __tablename__ = "clients"

    client_id = Column(Integer, primary_key=True, autoincrement=True)
    client_code = Column(String(50), unique=True, nullable=False)  # NEXCON, INZI 등
    client_name = Column(String(200), nullable=False)
    client_name_en = Column(String(200))
    address = Column(Text)
    contact_person = Column(String(200))
    contact_email = Column(String(200))
    contact_phone = Column(String(50))
    tax_id = Column(String(50))
    currency = Column(String(10), default="VND")  # VND, USD, Mixed
    complexity = Column(String(20), default="Medium")  # Low, Medium, High
    batch = Column(String(20))  # Batch 1, Batch 2
    structure_type = Column(String(50))  # Single sheet, Multi-sheet, IM/EX separated
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    templates = relationship("ClientTemplate", back_populates="client", cascade="all, delete-orphan")
    fee_mappings = relationship("ClientFeeMapping", back_populates="client", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="client")
    debit_notes = relationship("DebitNote", back_populates="client")
    exchange_rates = relationship("ClientExchangeRate", back_populates="client", cascade="all, delete-orphan")


class ClientTemplate(Base):
    """거래처별 Excel 템플릿 설정 (FR-005)"""
    __tablename__ = "client_templates"

    template_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    template_name = Column(String(200), nullable=False)
    sheet_type = Column(String(20), nullable=False)  # IMPORT, EXPORT
    sheet_name_pattern = Column(String(100))  # e.g., "IMPORT NEX MMYYYY"

    # 컬럼 매핑 설정
    column_range = Column(String(20))  # e.g., "A-BM", "A-AQ"
    total_columns = Column(Integer)  # 65, 43
    header_end_row = Column(Integer, default=15)  # 데이터 시작 전 마지막 헤더 행
    data_start_row = Column(Integer, default=16)  # 데이터 시작 행

    # 비용 컬럼 범위
    fee_column_start = Column(String(5))  # M
    fee_column_end = Column(String(5))  # AT (IMPORT), AH (EXPORT)

    # 합계 컬럼
    total_usd_column = Column(String(5))  # BC (IMPORT), AI (EXPORT)
    total_vnd_column = Column(String(5))  # BD (IMPORT), AJ (EXPORT)
    vat_column = Column(String(5))  # BE (IMPORT), AK (EXPORT)
    grand_total_column = Column(String(5))  # BF (IMPORT), AL (EXPORT)

    # 환율 셀
    exchange_rate_cell = Column(String(10))  # D9
    vat_rate = Column(Numeric(5, 2), default=8.00)  # VAT 8%

    # 상세 매핑 (JSON: 컬럼별 필드 매핑)
    column_mapping = Column(JSON)  # {"A": "no", "B": "delivery_date", ...}
    formula_mapping = Column(JSON)  # {"BC16": "=SUM(M16:AT16)", ...}

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="templates")


class ClientFeeMapping(Base):
    """거래처별 비용 항목 매핑 (FR-038)"""
    __tablename__ = "client_fee_mappings"

    mapping_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    fee_item_id = Column(Integer, ForeignKey("fee_items.fee_item_id", ondelete="CASCADE"), nullable=False)
    column_letter = Column(String(5), nullable=False)  # 해당 비용이 위치하는 Excel 컬럼
    sheet_type = Column(String(20), nullable=False)  # IMPORT or EXPORT
    display_name = Column(String(200))  # 거래처별 표시 이름
    is_vat_applicable = Column(Boolean, default=False)  # VAT 적용 여부
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="fee_mappings")
    fee_item = relationship("FeeItem", back_populates="client_mappings")
