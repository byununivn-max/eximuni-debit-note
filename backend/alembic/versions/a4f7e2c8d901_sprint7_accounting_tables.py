"""sprint7_accounting_tables

Revision ID: a4f7e2c8d901
Revises: 9bd2b3cd3e62
Create Date: 2026-02-11 19:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4f7e2c8d901'
down_revision: Union[str, None] = '9bd2b3cd3e62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # erp_chart_of_accounts
    op.create_table(
        'erp_chart_of_accounts',
        sa.Column('account_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('account_code', sa.String(length=7), nullable=False,
                   comment='SmartBooks 7자리 계정코드 (예: 1111000)'),
        sa.Column('account_name_vn', sa.String(length=200), nullable=False,
                   comment='베트남어 계정명'),
        sa.Column('account_name_en', sa.String(length=200), nullable=False,
                   comment='영어 계정명'),
        sa.Column('account_name_kr', sa.String(length=200), nullable=False,
                   comment='한국어 계정명'),
        sa.Column('account_type', sa.String(length=20), nullable=False,
                   comment='asset/liability/equity/revenue/expense'),
        sa.Column('account_group', sa.String(length=3), nullable=False,
                   comment='상위 3자리 그룹코드 (예: 111, 331)'),
        sa.Column('parent_account_code', sa.String(length=7), nullable=True,
                   comment='계층 구조용 — NULL이면 최상위'),
        sa.Column('is_detail_account', sa.Boolean(), nullable=False,
                   comment='하위 없는 말단 계정 여부'),
        sa.Column('normal_balance', sa.String(length=10), nullable=False,
                   comment='정상 잔액 방향: debit/credit'),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('smartbooks_mapped', sa.Boolean(), nullable=False,
                   comment='SmartBooks에서 매핑된 계정 여부'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('account_id'),
        sa.UniqueConstraint('account_code'),
    )
    op.create_index('ix_coa_type', 'erp_chart_of_accounts', ['account_type'])
    op.create_index('ix_coa_group', 'erp_chart_of_accounts', ['account_group'])
    op.create_index('ix_coa_parent', 'erp_chart_of_accounts', ['parent_account_code'])
    op.create_index(
        op.f('ix_erp_chart_of_accounts_account_code'),
        'erp_chart_of_accounts', ['account_code'], unique=False,
    )

    # erp_fiscal_periods
    op.create_table(
        'erp_fiscal_periods',
        sa.Column('period_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('fiscal_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False, comment='1~12'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_closed', sa.Boolean(), nullable=False),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['closed_by'], ['users.user_id']),
        sa.PrimaryKeyConstraint('period_id'),
    )
    op.create_index(
        'ix_fp_year_month', 'erp_fiscal_periods',
        ['fiscal_year', 'period_month'], unique=True,
    )

    # erp_cost_centers
    op.create_table(
        'erp_cost_centers',
        sa.Column('center_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('center_code', sa.String(length=20), nullable=False),
        sa.Column('center_name_vn', sa.String(length=200), nullable=True),
        sa.Column('center_name_en', sa.String(length=200), nullable=True),
        sa.Column('center_name_kr', sa.String(length=200), nullable=True),
        sa.Column('center_type', sa.String(length=20), nullable=False,
                   comment='logistic/general/other'),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('center_id'),
        sa.UniqueConstraint('center_code'),
    )
    op.create_index(
        op.f('ix_erp_cost_centers_center_code'),
        'erp_cost_centers', ['center_code'], unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_erp_cost_centers_center_code'), table_name='erp_cost_centers')
    op.drop_table('erp_cost_centers')

    op.drop_index('ix_fp_year_month', table_name='erp_fiscal_periods')
    op.drop_table('erp_fiscal_periods')

    op.drop_index(op.f('ix_erp_chart_of_accounts_account_code'), table_name='erp_chart_of_accounts')
    op.drop_index('ix_coa_parent', table_name='erp_chart_of_accounts')
    op.drop_index('ix_coa_group', table_name='erp_chart_of_accounts')
    op.drop_index('ix_coa_type', table_name='erp_chart_of_accounts')
    op.drop_table('erp_chart_of_accounts')
