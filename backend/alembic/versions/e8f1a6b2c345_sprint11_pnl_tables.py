"""sprint11_pnl_tables

Revision ID: e8f1a6b2c345
Revises: d7e0f5a1b234
Create Date: 2026-02-11 23:30:00.000000

Sprint 11: 종합 P&L 대시보드
- erp_daily_pnl: 일별 손익계산
- erp_monthly_pnl: 월별 손익계산 + YTD 누계
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f1a6b2c345"
down_revision: Union[str, None] = "d7e0f5a1b234"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _numeric_col(name: str, comment: str = ""):
    """NUMERIC(18,2) NOT NULL DEFAULT 0 헬퍼"""
    kwargs = {
        "nullable": False,
        "server_default": "0",
    }
    if comment:
        kwargs["comment"] = comment
    return sa.Column(name, sa.Numeric(precision=18, scale=2), **kwargs)


def upgrade() -> None:
    # --- erp_daily_pnl ---
    op.create_table(
        "erp_daily_pnl",
        sa.Column("pnl_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pnl_date", sa.Date(), nullable=False, comment="손익 일자"),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("fiscal_month", sa.Integer(), nullable=False, comment="1~12"),
        _numeric_col("revenue_total", "매출 합계"),
        _numeric_col("revenue_logistics", "물류 매출 (5113001)"),
        _numeric_col("revenue_bcqt", "BCQT 매출 (5113002)"),
        _numeric_col("revenue_other", "기타 매출"),
        _numeric_col("cogs_total", "매출원가 합계"),
        _numeric_col("gross_profit", "매출총이익"),
        _numeric_col("fixed_cost_allocated", "고정비 일할"),
        _numeric_col("variable_cost_total", "변동비 합계"),
        _numeric_col("operating_profit", "영업이익"),
        _numeric_col("financial_income", "금융수익"),
        _numeric_col("financial_expense", "금융비용"),
        _numeric_col("other_income_expense", "기타"),
        _numeric_col("net_profit", "순이익"),
        sa.Column("cost_center_code", sa.String(length=20), nullable=True),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("pnl_id"),
        sa.UniqueConstraint("pnl_date"),
    )
    op.create_index("ix_dpnl_date", "erp_daily_pnl", ["pnl_date"], unique=True)
    op.create_index("ix_dpnl_year_month", "erp_daily_pnl", ["fiscal_year", "fiscal_month"])

    # --- erp_monthly_pnl ---
    op.create_table(
        "erp_monthly_pnl",
        sa.Column("pnl_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("fiscal_month", sa.Integer(), nullable=False, comment="1~12"),
        # 당월 실적
        _numeric_col("revenue_total"),
        _numeric_col("revenue_logistics"),
        _numeric_col("revenue_bcqt"),
        _numeric_col("revenue_other"),
        _numeric_col("cogs_total"),
        _numeric_col("gross_profit"),
        _numeric_col("fixed_cost_allocated"),
        _numeric_col("variable_cost_total"),
        _numeric_col("operating_profit"),
        _numeric_col("financial_income"),
        _numeric_col("financial_expense"),
        _numeric_col("other_income_expense"),
        _numeric_col("net_profit"),
        # YTD 누계
        _numeric_col("ytd_revenue"),
        _numeric_col("ytd_cogs"),
        _numeric_col("ytd_gross_profit"),
        _numeric_col("ytd_operating_profit"),
        _numeric_col("ytd_net_profit"),
        sa.Column("cost_center_code", sa.String(length=20), nullable=True),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("pnl_id"),
    )
    op.create_index(
        "ix_mpnl_period", "erp_monthly_pnl",
        ["fiscal_year", "fiscal_month"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("erp_monthly_pnl")
    op.drop_table("erp_daily_pnl")
