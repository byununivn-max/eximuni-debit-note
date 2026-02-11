"""회계 모듈: 계정과목, 회계기간, 비용센터 (PostgreSQL 신규 테이블)

Sprint 7: erp_chart_of_accounts, erp_fiscal_periods, erp_cost_centers
Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ChartOfAccount(Base):
    """계정과목표 — SmartBooks 7자리 계정코드 체계"""
    __tablename__ = "erp_chart_of_accounts"
    __table_args__ = (
        Index("ix_coa_type", "account_type"),
        Index("ix_coa_group", "account_group"),
        Index("ix_coa_parent", "parent_account_code"),
    )

    account_id = Column(Integer, primary_key=True, autoincrement=True)
    account_code = Column(
        String(7), unique=True, nullable=False, index=True,
        comment="SmartBooks 7자리 계정코드 (예: 1111000)",
    )
    account_name_vn = Column(String(200), nullable=False, comment="베트남어 계정명")
    account_name_en = Column(String(200), nullable=False, comment="영어 계정명")
    account_name_kr = Column(String(200), nullable=False, comment="한국어 계정명")
    account_type = Column(
        String(20), nullable=False,
        comment="asset/liability/equity/revenue/expense",
    )
    account_group = Column(
        String(3), nullable=False,
        comment="상위 3자리 그룹코드 (예: 111, 331)",
    )
    parent_account_code = Column(
        String(7), nullable=True,
        comment="계층 구조용 — NULL이면 최상위",
    )
    is_detail_account = Column(
        Boolean, default=True, nullable=False,
        comment="하위 없는 말단 계정 여부",
    )
    normal_balance = Column(
        String(10), nullable=False, default="debit",
        comment="정상 잔액 방향: debit/credit",
    )
    is_active = Column(Boolean, default=True, nullable=False)
    smartbooks_mapped = Column(
        Boolean, default=False, nullable=False,
        comment="SmartBooks에서 매핑된 계정 여부",
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )


class FiscalPeriod(Base):
    """회계기간 — 연/월 단위 기간 관리 + 마감"""
    __tablename__ = "erp_fiscal_periods"
    __table_args__ = (
        Index("ix_fp_year_month", "fiscal_year", "period_month", unique=True),
    )

    period_id = Column(Integer, primary_key=True, autoincrement=True)
    fiscal_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False, comment="1~12")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_closed = Column(Boolean, default=False, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(
        Integer, ForeignKey("users.id"), nullable=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )


class CostCenter(Base):
    """비용센터 — SmartBooks Cost Center 체계"""
    __tablename__ = "erp_cost_centers"

    center_id = Column(Integer, primary_key=True, autoincrement=True)
    center_code = Column(
        String(20), unique=True, nullable=False, index=True,
    )
    center_name_vn = Column(String(200), nullable=True)
    center_name_en = Column(String(200), nullable=True)
    center_name_kr = Column(String(200), nullable=True)
    center_type = Column(
        String(20), nullable=False, default="other",
        comment="logistic/general/other",
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )
