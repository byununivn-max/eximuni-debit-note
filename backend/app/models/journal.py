"""분개장 모듈: 분개전표 헤더 + 상세 라인 (PostgreSQL 신규 테이블)

Sprint 8: erp_journal_entries, erp_journal_lines
Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class JournalEntry(Base):
    """분개전표 헤더 — SmartBooks GLTran 기반"""
    __tablename__ = "erp_journal_entries"
    __table_args__ = (
        Index("ix_je_module", "module"),
        Index("ix_je_fiscal", "fiscal_year", "fiscal_month"),
        Index("ix_je_status", "status"),
        Index("ix_je_source", "source"),
        Index("ix_je_date", "entry_date"),
        Index("ix_je_batch", "smartbooks_batch_nbr"),
    )

    entry_id = Column(Integer, primary_key=True, autoincrement=True)
    entry_number = Column(
        String(20), unique=True, nullable=False, index=True,
        comment="전표번호 (예: GL25/120001)",
    )
    module = Column(
        String(5), nullable=False,
        comment="SmartBooks 모듈: GL/AP/AR/CA/OF",
    )
    fiscal_year = Column(Integer, nullable=False)
    fiscal_month = Column(Integer, nullable=False, comment="1~12")
    entry_date = Column(Date, nullable=False)
    voucher_date = Column(Date, nullable=True)
    description_vn = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    description_kr = Column(Text, nullable=True)
    currency_code = Column(String(3), nullable=False, default="VND")
    exchange_rate = Column(Numeric(18, 4), nullable=True, default=1)
    total_debit = Column(Numeric(18, 2), nullable=False, default=0)
    total_credit = Column(Numeric(18, 2), nullable=False, default=0)
    status = Column(
        String(10), nullable=False, default="draft",
        comment="draft/posted/reversed",
    )
    source = Column(
        String(20), nullable=False, default="manual",
        comment="manual/smartbooks_import/auto_sync",
    )
    smartbooks_batch_nbr = Column(
        String(20), nullable=True,
        comment="SmartBooks 원본 배치번호",
    )
    vendor_id = Column(String(20), nullable=True)
    customer_id = Column(String(20), nullable=True)
    employee_id = Column(String(20), nullable=True)
    cost_center_id = Column(
        Integer, ForeignKey("erp_cost_centers.center_id"), nullable=True,
    )
    invoice_no = Column(String(50), nullable=True)
    invoice_date = Column(Date, nullable=True)
    serial_no = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    posted_at = Column(DateTime, nullable=True)
    posted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )

    lines = relationship(
        "JournalLine", back_populates="entry",
        cascade="all, delete-orphan", lazy="joined",
    )


class JournalLine(Base):
    """분개전표 상세 라인"""
    __tablename__ = "erp_journal_lines"
    __table_args__ = (
        Index("ix_jl_entry", "entry_id"),
        Index("ix_jl_account", "account_code"),
    )

    line_id = Column(Integer, primary_key=True, autoincrement=True)
    entry_id = Column(
        Integer, ForeignKey("erp_journal_entries.entry_id", ondelete="CASCADE"),
        nullable=False,
    )
    line_number = Column(Integer, nullable=False, default=1)
    account_code = Column(
        String(7), nullable=False,
        comment="계정코드 (erp_chart_of_accounts 참조)",
    )
    counter_account_code = Column(
        String(7), nullable=True,
        comment="대변/차변 상대 계정",
    )
    description_vn = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    debit_amount = Column(Numeric(18, 2), nullable=False, default=0)
    credit_amount = Column(Numeric(18, 2), nullable=False, default=0)
    currency_amount = Column(
        Numeric(18, 2), nullable=True,
        comment="원화 금액 (외화 전표 시)",
    )
    currency_code = Column(String(3), nullable=True)
    exchange_rate = Column(Numeric(18, 4), nullable=True)
    vendor_id = Column(String(20), nullable=True)
    customer_id = Column(String(20), nullable=True)
    employee_id = Column(String(20), nullable=True)
    cost_center_id = Column(
        Integer, ForeignKey("erp_cost_centers.center_id"), nullable=True,
    )
    job_center = Column(String(20), nullable=True)
    profit_center = Column(String(20), nullable=True)
    tax_code = Column(String(10), nullable=True)
    tax_amount = Column(Numeric(18, 2), nullable=True, default=0)
    tax_account = Column(String(7), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )

    entry = relationship("JournalEntry", back_populates="lines")
