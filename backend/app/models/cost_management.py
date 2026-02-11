"""비용 분류 + 월별 비용 집계 모듈 (PostgreSQL 신규 테이블)

Sprint 10: erp_cost_classifications, erp_monthly_cost_summary
판관비(642x) 계정을 고정비/변동비/반변동비로 분류하고
월별 비용 집계 + 일할 안분을 관리한다.

Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, Text, Index,
)
from app.core.database import Base


class CostClassification(Base):
    """비용 분류 — 계정별 고정비/변동비 분류"""
    __tablename__ = "erp_cost_classifications"
    __table_args__ = (
        Index("ix_cc_account", "account_code"),
        Index("ix_cc_cost_type", "cost_type"),
        Index("ix_cc_category", "cost_category"),
    )

    classification_id = Column(Integer, primary_key=True, autoincrement=True)
    account_code = Column(
        String(7), nullable=False,
        comment="erp_chart_of_accounts.account_code 참조",
    )
    cost_type = Column(
        String(20), nullable=False,
        comment="fixed/variable/semi_variable",
    )
    cost_category = Column(
        String(50), nullable=False,
        comment="salary/rent/utilities/outsourced/depreciation/tax/material/other",
    )
    allocation_method = Column(
        String(20), nullable=False, default="daily_prorate",
        comment="daily_prorate/monthly_lump/revenue_based",
    )
    cost_center_code = Column(
        String(20), nullable=True,
        comment="erp_cost_centers.center_code (NULL이면 전사)",
    )
    description_vn = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    effective_from = Column(Date, nullable=True, comment="적용 시작일")
    effective_to = Column(Date, nullable=True, comment="적용 종료일 (NULL이면 무기한)")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )


class MonthlyCostSummary(Base):
    """월별 비용 집계 — 분개장 기반 계산 결과"""
    __tablename__ = "erp_monthly_cost_summary"
    __table_args__ = (
        Index(
            "ix_mcs_period", "fiscal_year", "fiscal_month",
            "account_code", unique=True,
        ),
        Index("ix_mcs_cost_type", "cost_type"),
    )

    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_month = Column(Integer, nullable=False, comment="1~12")
    account_code = Column(
        String(7), nullable=False,
        comment="erp_chart_of_accounts.account_code 참조",
    )
    cost_type = Column(
        String(20), nullable=False,
        comment="fixed/variable/semi_variable (분류에서 복사)",
    )
    cost_center_code = Column(
        String(20), nullable=True,
        comment="비용센터 (NULL이면 전사)",
    )
    total_amount = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="해당월 비용 총액",
    )
    daily_allocated_amount = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="일할 안분 금액 = total ÷ 해당월 일수",
    )
    working_days = Column(
        Integer, nullable=False, default=0,
        comment="해당월 역일수 (영업일수)",
    )
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
