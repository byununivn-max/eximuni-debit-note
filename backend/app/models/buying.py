"""Buying 모듈: 공급사, 매입주문, 매입상세 (PostgreSQL 신규 테이블)

Sprint 3: erp_suppliers, erp_purchase_orders, erp_purchase_items
Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Supplier(Base):
    """공급사 마스터 테이블"""
    __tablename__ = "erp_suppliers"

    supplier_id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_code = Column(String(50), unique=True, nullable=False, index=True)
    supplier_name = Column(String(200), nullable=False)
    supplier_type = Column(
        String(50), nullable=False, default="other",
        comment="shipping_line/trucking/customs_broker/co_agent/other",
    )
    contact_person = Column(String(100), nullable=True)
    contact_email = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    tax_id = Column(String(50), nullable=True)
    bank_account = Column(String(100), nullable=True)
    bank_name = Column(String(200), nullable=True)
    payment_terms = Column(String(100), nullable=True, comment="예: NET30, COD")
    currency = Column(String(10), nullable=False, default="VND")
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )

    purchase_orders = relationship(
        "PurchaseOrder", back_populates="supplier", lazy="dynamic",
    )


class PurchaseOrder(Base):
    """매입 기록 테이블"""
    __tablename__ = "erp_purchase_orders"
    __table_args__ = (
        Index("ix_po_supplier", "supplier_id"),
        Index("ix_po_status", "status"),
        Index("ix_po_payment", "payment_status"),
    )

    po_id = Column(Integer, primary_key=True, autoincrement=True)
    po_number = Column(
        String(50), unique=True, nullable=False, index=True,
        comment="형식: PO-YYYYMM-XXXXX",
    )
    supplier_id = Column(
        Integer, ForeignKey("erp_suppliers.supplier_id"), nullable=False,
    )
    mssql_shipment_ref = Column(
        Integer, nullable=True,
        comment="MSSQL debit_sharepoint.id_invoice 참조 (FK 아님)",
    )
    service_type = Column(
        String(50), nullable=True,
        comment="freight/handling/customs/trucking/co",
    )
    invoice_no = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=True)
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="VND")
    exchange_rate = Column(Numeric(15, 4), nullable=True)
    amount_vnd = Column(Numeric(15, 2), nullable=True)
    vat_rate = Column(Numeric(5, 2), nullable=True, default=0)
    vat_amount = Column(Numeric(15, 2), nullable=True, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    payment_status = Column(
        String(20), nullable=False, default="UNPAID",
        comment="UNPAID/PARTIAL/PAID",
    )
    status = Column(
        String(20), nullable=False, default="DRAFT",
        comment="DRAFT/CONFIRMED/CANCELLED",
    )
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship(
        "PurchaseItem", back_populates="purchase_order",
        cascade="all, delete-orphan", lazy="joined",
    )


class PurchaseItem(Base):
    """매입 상세 항목 테이블"""
    __tablename__ = "erp_purchase_items"
    __table_args__ = (
        Index("ix_pi_po", "po_id"),
    )

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    po_id = Column(
        Integer, ForeignKey("erp_purchase_orders.po_id", ondelete="CASCADE"),
        nullable=False,
    )
    description = Column(String(300), nullable=False)
    cost_category = Column(
        String(50), nullable=True,
        comment="freight/handling/customs/trucking/co",
    )
    quantity = Column(Numeric(10, 2), nullable=False, default=1)
    unit_price = Column(Numeric(15, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="VND")
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    is_vat_applicable = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
