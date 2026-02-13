"""sprint9_accounting_parties

Revision ID: c6d9e4f0a123
Revises: b5c8d3e9f012
Create Date: 2026-02-11 22:00:00.000000

Sprint 9: AP/AR 보조원장 + 거래처 통합
- erp_accounting_vendors: 회계 공급사 (SmartBooks Vendor 매핑)
- erp_accounting_customers: 회계 고객 (SmartBooks Customer 매핑)
- erp_account_balances: 계정별 잔액 스냅샷
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c6d9e4f0a123"
down_revision: Union[str, None] = "b5c8d3e9f012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- erp_accounting_vendors ---
    op.create_table(
        "erp_accounting_vendors",
        sa.Column("vendor_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "tax_id", sa.String(length=20), nullable=False,
            comment="사업자등록번호 (SmartBooks VendorID)",
        ),
        sa.Column("vendor_name_vn", sa.String(length=255), nullable=True),
        sa.Column("vendor_name_en", sa.String(length=255), nullable=True),
        sa.Column(
            "mssql_supplier_ref", sa.Integer(), nullable=True,
            comment="erp_suppliers.supplier_id 참조 (FK 아님, NULL이면 미매핑)",
        ),
        sa.Column(
            "default_ap_account", sa.String(length=7), nullable=False,
            server_default="3311000", comment="기본 매입채무 계정",
        ),
        sa.Column("default_expense_account", sa.String(length=7), nullable=True),
        sa.Column("payment_terms", sa.String(length=50), nullable=True),
        sa.Column(
            "currency_code", sa.String(length=3), nullable=False,
            server_default="VND",
        ),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"),
        ),
        sa.Column(
            "source", sa.String(length=20), nullable=False,
            server_default="manual", comment="smartbooks_import/manual",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("vendor_id"),
        sa.UniqueConstraint("tax_id"),
    )
    op.create_index("ix_av_tax", "erp_accounting_vendors", ["tax_id"])
    op.create_index("ix_av_supplier_ref", "erp_accounting_vendors", ["mssql_supplier_ref"])

    # --- erp_accounting_customers ---
    op.create_table(
        "erp_accounting_customers",
        sa.Column("customer_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "tax_id", sa.String(length=20), nullable=False,
            comment="사업자등록번호 (SmartBooks CustomerID)",
        ),
        sa.Column("customer_name_vn", sa.String(length=255), nullable=True),
        sa.Column("customer_name_en", sa.String(length=255), nullable=True),
        sa.Column(
            "mssql_client_ref", sa.Integer(), nullable=True,
            comment="MSSQL clients.id 참조 (NULL이면 미매핑)",
        ),
        sa.Column(
            "default_ar_account", sa.String(length=7), nullable=False,
            server_default="1311000", comment="기본 매출채권 계정",
        ),
        sa.Column(
            "default_revenue_account", sa.String(length=7), nullable=False,
            server_default="5113001", comment="기본 매출 계정",
        ),
        sa.Column("payment_terms", sa.String(length=50), nullable=True),
        sa.Column(
            "currency_code", sa.String(length=3), nullable=False,
            server_default="VND",
        ),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"),
        ),
        sa.Column(
            "source", sa.String(length=20), nullable=False,
            server_default="manual", comment="smartbooks_import/manual",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("customer_id"),
        sa.UniqueConstraint("tax_id"),
    )
    op.create_index("ix_ac_tax", "erp_accounting_customers", ["tax_id"])
    op.create_index("ix_ac_client_ref", "erp_accounting_customers", ["mssql_client_ref"])

    # --- erp_account_balances ---
    op.create_table(
        "erp_account_balances",
        sa.Column("balance_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_code", sa.String(length=7), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column(
            "fiscal_month", sa.Integer(), nullable=False,
            comment="1~12, 0=기초잔액",
        ),
        sa.Column(
            "opening_debit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "opening_credit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "period_debit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "period_credit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "closing_debit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "closing_credit", sa.Numeric(precision=18, scale=2),
            nullable=False, server_default="0",
        ),
        sa.Column(
            "currency_code", sa.String(length=3), nullable=False,
            server_default="VND",
        ),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("balance_id"),
    )
    op.create_index(
        "ix_ab_account_period", "erp_account_balances",
        ["account_code", "fiscal_year", "fiscal_month"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("erp_account_balances")
    op.drop_table("erp_accounting_customers")
    op.drop_table("erp_accounting_vendors")
