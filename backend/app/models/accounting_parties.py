"""회계 거래처 + 계정잔액 모듈 (PostgreSQL 신규 테이블)

Sprint 9: erp_accounting_vendors, erp_accounting_customers, erp_account_balances
Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, ForeignKey, Text, Index,
)
from app.core.database import Base


class AccountingVendor(Base):
    """회계 공급사 — SmartBooks Vendor 매핑"""
    __tablename__ = "erp_accounting_vendors"
    __table_args__ = (
        Index("ix_av_tax", "tax_id"),
        Index("ix_av_supplier_ref", "mssql_supplier_ref"),
    )

    vendor_id = Column(Integer, primary_key=True, autoincrement=True)
    tax_id = Column(
        String(20), unique=True, nullable=False,
        comment="사업자등록번호 (SmartBooks VendorID)",
    )
    vendor_name_vn = Column(String(255), nullable=True)
    vendor_name_en = Column(String(255), nullable=True)
    mssql_supplier_ref = Column(
        Integer, nullable=True,
        comment="erp_suppliers.supplier_id 참조 (FK 아님, NULL이면 미매핑)",
    )
    default_ap_account = Column(
        String(7), nullable=False, default="3311000",
        comment="기본 매입채무 계정",
    )
    default_expense_account = Column(String(7), nullable=True)
    payment_terms = Column(String(50), nullable=True)
    currency_code = Column(String(3), nullable=False, default="VND")
    is_active = Column(Boolean, default=True, nullable=False)
    source = Column(
        String(20), nullable=False, default="manual",
        comment="smartbooks_import/manual",
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )


class AccountingCustomer(Base):
    """회계 고객 — SmartBooks Customer 매핑"""
    __tablename__ = "erp_accounting_customers"
    __table_args__ = (
        Index("ix_ac_tax", "tax_id"),
        Index("ix_ac_client_ref", "mssql_client_ref"),
    )

    customer_id = Column(Integer, primary_key=True, autoincrement=True)
    tax_id = Column(
        String(20), unique=True, nullable=False,
        comment="사업자등록번호 (SmartBooks CustomerID)",
    )
    customer_name_vn = Column(String(255), nullable=True)
    customer_name_en = Column(String(255), nullable=True)
    mssql_client_ref = Column(
        Integer, nullable=True,
        comment="MSSQL clients.id 참조 (NULL이면 미매핑)",
    )
    default_ar_account = Column(
        String(7), nullable=False, default="1311000",
        comment="기본 매출채권 계정",
    )
    default_revenue_account = Column(
        String(7), nullable=False, default="5113001",
        comment="기본 매출 계정",
    )
    payment_terms = Column(String(50), nullable=True)
    currency_code = Column(String(3), nullable=False, default="VND")
    is_active = Column(Boolean, default=True, nullable=False)
    source = Column(
        String(20), nullable=False, default="manual",
        comment="smartbooks_import/manual",
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )


class AccountBalance(Base):
    """계정별 잔액 스냅샷 — 시산표 기초"""
    __tablename__ = "erp_account_balances"
    __table_args__ = (
        Index(
            "ix_ab_account_period", "account_code",
            "fiscal_year", "fiscal_month", unique=True,
        ),
    )

    balance_id = Column(Integer, primary_key=True, autoincrement=True)
    account_code = Column(String(7), nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_month = Column(Integer, nullable=False, comment="1~12, 0=기초잔액")
    opening_debit = Column(Numeric(18, 2), nullable=False, default=0)
    opening_credit = Column(Numeric(18, 2), nullable=False, default=0)
    period_debit = Column(Numeric(18, 2), nullable=False, default=0)
    period_credit = Column(Numeric(18, 2), nullable=False, default=0)
    closing_debit = Column(Numeric(18, 2), nullable=False, default=0)
    closing_credit = Column(Numeric(18, 2), nullable=False, default=0)
    currency_code = Column(String(3), nullable=False, default="VND")
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
