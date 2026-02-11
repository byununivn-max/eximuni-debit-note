"""sprint10_cost_management

Revision ID: d7e0f5a1b234
Revises: c6d9e4f0a123
Create Date: 2026-02-11 23:00:00.000000

Sprint 10: 비용 분류 + 월별 비용 집계
- erp_cost_classifications: 계정별 고정비/변동비/반변동비 분류
- erp_monthly_cost_summary: 월별 비용 집계 + 일할 안분
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7e0f5a1b234"
down_revision: Union[str, None] = "c6d9e4f0a123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- erp_cost_classifications ---
    op.create_table(
        "erp_cost_classifications",
        sa.Column("classification_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "account_code", sa.String(length=7), nullable=False,
            comment="erp_chart_of_accounts.account_code 참조",
        ),
        sa.Column(
            "cost_type", sa.String(length=20), nullable=False,
            comment="fixed/variable/semi_variable",
        ),
        sa.Column(
            "cost_category", sa.String(length=50), nullable=False,
            comment="salary/rent/utilities/outsourced/depreciation/tax/material/other",
        ),
        sa.Column(
            "allocation_method", sa.String(length=20), nullable=False,
            server_default="daily_prorate",
            comment="daily_prorate/monthly_lump/revenue_based",
        ),
        sa.Column(
            "cost_center_code", sa.String(length=20), nullable=True,
            comment="erp_cost_centers.center_code (NULL이면 전사)",
        ),
        sa.Column("description_vn", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("effective_from", sa.Date(), nullable=True, comment="적용 시작일"),
        sa.Column("effective_to", sa.Date(), nullable=True, comment="적용 종료일"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("classification_id"),
    )
    op.create_index("ix_cc_account", "erp_cost_classifications", ["account_code"])
    op.create_index("ix_cc_cost_type", "erp_cost_classifications", ["cost_type"])
    op.create_index("ix_cc_category", "erp_cost_classifications", ["cost_category"])

    # --- erp_monthly_cost_summary ---
    op.create_table(
        "erp_monthly_cost_summary",
        sa.Column("summary_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("fiscal_month", sa.Integer(), nullable=False, comment="1~12"),
        sa.Column(
            "account_code", sa.String(length=7), nullable=False,
            comment="erp_chart_of_accounts.account_code 참조",
        ),
        sa.Column(
            "cost_type", sa.String(length=20), nullable=False,
            comment="fixed/variable/semi_variable",
        ),
        sa.Column(
            "cost_center_code", sa.String(length=20), nullable=True,
            comment="비용센터 (NULL이면 전사)",
        ),
        sa.Column(
            "total_amount", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
            comment="해당월 비용 총액",
        ),
        sa.Column(
            "daily_allocated_amount", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
            comment="일할 안분 금액",
        ),
        sa.Column(
            "working_days", sa.Integer(), nullable=False,
            server_default="0", comment="해당월 역일수",
        ),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("summary_id"),
    )
    op.create_index(
        "ix_mcs_period", "erp_monthly_cost_summary",
        ["fiscal_year", "fiscal_month", "account_code"],
        unique=True,
    )
    op.create_index("ix_mcs_cost_type", "erp_monthly_cost_summary", ["cost_type"])


def downgrade() -> None:
    op.drop_table("erp_monthly_cost_summary")
    op.drop_table("erp_cost_classifications")
