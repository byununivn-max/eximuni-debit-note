"""손익계산(P&L) 모듈 (PostgreSQL 신규 테이블)

Sprint 11: erp_daily_pnl, erp_monthly_pnl
매출-원가-판관비-순이익 실시간 산출 기반 테이블

Alembic 마이그레이션 대상 (Base 상속)
"""
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    Numeric, Index,
)
from app.core.database import Base


class DailyPnL(Base):
    """일별 손익계산"""
    __tablename__ = "erp_daily_pnl"
    __table_args__ = (
        Index("ix_dpnl_date", "pnl_date", unique=True),
        Index("ix_dpnl_year_month", "fiscal_year", "fiscal_month"),
    )

    pnl_id = Column(Integer, primary_key=True, autoincrement=True)
    pnl_date = Column(Date, nullable=False, unique=True, comment="손익 일자")
    fiscal_year = Column(Integer, nullable=False)
    fiscal_month = Column(Integer, nullable=False, comment="1~12")

    # 매출 (Revenue) — 5113xxx 계정
    revenue_total = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="매출 합계",
    )
    revenue_logistics = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="물류 매출 (5113001)",
    )
    revenue_bcqt = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="BCQT 매출 (5113002)",
    )
    revenue_other = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="기타 매출 (5113008 등)",
    )

    # 매출원가 (COGS) — 6320000 계정
    cogs_total = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="매출원가 합계",
    )

    # 매출총이익 (Gross Profit)
    gross_profit = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="매출총이익 = revenue - cogs",
    )

    # 판관비 (SGA)
    fixed_cost_allocated = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="고정비 일할 안분",
    )
    variable_cost_total = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="변동비 합계",
    )

    # 영업이익 (Operating Profit)
    operating_profit = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="영업이익 = GP - 고정비 - 변동비",
    )

    # 영업외 항목
    financial_income = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="금융수익 (5158xxx)",
    )
    financial_expense = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="금융비용 + 환차손익 (6358xxx)",
    )
    other_income_expense = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="기타 수익/비용",
    )

    # 순이익 (Net Profit)
    net_profit = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="순이익",
    )

    cost_center_code = Column(
        String(20), nullable=True,
        comment="비용센터 (NULL이면 전사)",
    )
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MonthlyPnL(Base):
    """월별 손익계산 — 일별 집계"""
    __tablename__ = "erp_monthly_pnl"
    __table_args__ = (
        Index(
            "ix_mpnl_period", "fiscal_year", "fiscal_month",
            unique=True,
        ),
    )

    pnl_id = Column(Integer, primary_key=True, autoincrement=True)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_month = Column(Integer, nullable=False, comment="1~12")

    # 당월 실적
    revenue_total = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_logistics = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_bcqt = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_other = Column(Numeric(18, 2), nullable=False, default=0)
    cogs_total = Column(Numeric(18, 2), nullable=False, default=0)
    gross_profit = Column(Numeric(18, 2), nullable=False, default=0)
    fixed_cost_allocated = Column(Numeric(18, 2), nullable=False, default=0)
    variable_cost_total = Column(Numeric(18, 2), nullable=False, default=0)
    operating_profit = Column(Numeric(18, 2), nullable=False, default=0)
    financial_income = Column(Numeric(18, 2), nullable=False, default=0)
    financial_expense = Column(Numeric(18, 2), nullable=False, default=0)
    other_income_expense = Column(Numeric(18, 2), nullable=False, default=0)
    net_profit = Column(Numeric(18, 2), nullable=False, default=0)

    # 누계 (YTD)
    ytd_revenue = Column(Numeric(18, 2), nullable=False, default=0)
    ytd_cogs = Column(Numeric(18, 2), nullable=False, default=0)
    ytd_gross_profit = Column(Numeric(18, 2), nullable=False, default=0)
    ytd_operating_profit = Column(Numeric(18, 2), nullable=False, default=0)
    ytd_net_profit = Column(Numeric(18, 2), nullable=False, default=0)

    cost_center_code = Column(String(20), nullable=True)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
