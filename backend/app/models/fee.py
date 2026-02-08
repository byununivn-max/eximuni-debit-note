"""비용 항목 관리 모델 (FR-012 ~ FR-014)"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class FeeCategory(Base):
    """비용 카테고리 - Freight, Handling, D/O, Trucking 등"""
    __tablename__ = "fee_categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_code = Column(String(50), unique=True, nullable=False)
    category_name = Column(String(200), nullable=False)
    category_name_vi = Column(String(200))  # 베트남어
    category_name_ko = Column(String(200))  # 한국어
    description = Column(Text)
    is_vat_applicable = Column(Boolean, default=False)  # 카테고리 기본 VAT 적용
    vat_rate = Column(Numeric(5, 2), default=0)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fee_items = relationship("FeeItem", back_populates="category", cascade="all, delete-orphan")


class FeeItem(Base):
    """비용 상세 항목"""
    __tablename__ = "fee_items"

    fee_item_id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("fee_categories.category_id", ondelete="CASCADE"), nullable=False)
    item_code = Column(String(50), unique=True, nullable=False)
    item_name = Column(String(200), nullable=False)
    item_name_vi = Column(String(200))
    item_name_ko = Column(String(200))
    description = Column(Text)
    default_currency = Column(String(10), default="USD")
    is_vat_applicable = Column(Boolean, default=False)  # 항목별 VAT 적용 여부 (FR-013)
    vat_rate = Column(Numeric(5, 2), default=0)
    calculation_rule = Column(Text)  # 계산 규칙 정의 (FR-014)
    is_tax_inclusive = Column(Boolean, default=False)  # 세후 값 여부 (Handling/D/O)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("FeeCategory", back_populates="fee_items")
    client_mappings = relationship("ClientFeeMapping", back_populates="fee_item")
    shipment_fee_details = relationship("ShipmentFeeDetail", back_populates="fee_item")
