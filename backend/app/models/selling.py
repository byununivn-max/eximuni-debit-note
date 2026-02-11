"""Selling 모듈: 매출 집계, 매출 상세 (PostgreSQL 신규 테이블)

Sprint 4: erp_selling_records, erp_selling_items
MSSQL 기존 매출 데이터(clearance/ops/co)를 구조화하여 저장
Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, DateTime, Date,
    Numeric, ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class SellingRecord(Base):
    """매출 집계 테이블 — MSSQL 데이터 구조화 저장"""
    __tablename__ = "erp_selling_records"
    __table_args__ = (
        Index("ix_selling_type", "record_type"),
        Index("ix_selling_customer", "customer_name"),
        Index("ix_selling_date", "service_date"),
        Index("ix_selling_source", "record_type", "mssql_source_id", unique=True),
    )

    selling_id = Column(Integer, primary_key=True, autoincrement=True)
    record_type = Column(
        String(20), nullable=False,
        comment="clearance/ops/co",
    )
    mssql_source_id = Column(
        Integer, nullable=False,
        comment="MSSQL scheme PK (scheme_clearance.id_scheme_cd 등)",
    )
    mssql_cost_id = Column(
        Integer, nullable=True,
        comment="MSSQL cost detail PK (clearance.id_clearance 등)",
    )
    customer_name = Column(String(255), nullable=True)
    invoice_no = Column(String(255), nullable=True)
    service_date = Column(Date, nullable=True)
    total_selling_vnd = Column(
        Numeric(15, 2), nullable=False, default=0,
        comment="매출 합계 (VND)",
    )
    item_count = Column(Integer, nullable=False, default=0)
    sync_status = Column(
        String(20), nullable=False, default="SYNCED",
        comment="SYNCED/ERROR",
    )
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )

    items = relationship(
        "SellingItem", back_populates="selling_record",
        cascade="all, delete-orphan", lazy="joined",
    )


class SellingItem(Base):
    """매출 상세 항목 테이블"""
    __tablename__ = "erp_selling_items"
    __table_args__ = (
        Index("ix_si_selling", "selling_id"),
    )

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    selling_id = Column(
        Integer,
        ForeignKey("erp_selling_records.selling_id", ondelete="CASCADE"),
        nullable=False,
    )
    fee_name = Column(String(100), nullable=False, comment="비용 항목명 (한글)")
    fee_category = Column(
        String(50), nullable=True,
        comment="customs/transport/handling/co/other",
    )
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="VND")
    mssql_source_column = Column(
        String(100), nullable=True,
        comment="원본 MSSQL 컬럼명 (예: phi_thong_quan)",
    )

    selling_record = relationship("SellingRecord", back_populates="items")
