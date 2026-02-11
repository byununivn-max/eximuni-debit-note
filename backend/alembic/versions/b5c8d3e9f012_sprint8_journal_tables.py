"""sprint8_journal_tables

Revision ID: b5c8d3e9f012
Revises: a4f7e2c8d901
Create Date: 2026-02-11 20:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5c8d3e9f012'
down_revision: Union[str, None] = 'a4f7e2c8d901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # erp_journal_entries
    op.create_table(
        'erp_journal_entries',
        sa.Column('entry_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('entry_number', sa.String(length=20), nullable=False,
                   comment='전표번호 (예: GL25/120001)'),
        sa.Column('module', sa.String(length=5), nullable=False,
                   comment='SmartBooks 모듈: GL/AP/AR/CA/OF'),
        sa.Column('fiscal_year', sa.Integer(), nullable=False),
        sa.Column('fiscal_month', sa.Integer(), nullable=False, comment='1~12'),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('voucher_date', sa.Date(), nullable=True),
        sa.Column('description_vn', sa.Text(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('description_kr', sa.Text(), nullable=True),
        sa.Column('currency_code', sa.String(length=3), nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('total_debit', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('total_credit', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False,
                   comment='draft/posted/reversed'),
        sa.Column('source', sa.String(length=20), nullable=False,
                   comment='manual/smartbooks_import/auto_sync'),
        sa.Column('smartbooks_batch_nbr', sa.String(length=20), nullable=True,
                   comment='SmartBooks 원본 배치번호'),
        sa.Column('vendor_id', sa.String(length=20), nullable=True),
        sa.Column('customer_id', sa.String(length=20), nullable=True),
        sa.Column('employee_id', sa.String(length=20), nullable=True),
        sa.Column('cost_center_id', sa.Integer(), nullable=True),
        sa.Column('invoice_no', sa.String(length=50), nullable=True),
        sa.Column('invoice_date', sa.Date(), nullable=True),
        sa.Column('serial_no', sa.String(length=50), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('posted_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['cost_center_id'], ['erp_cost_centers.center_id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['posted_by'], ['users.id']),
        sa.PrimaryKeyConstraint('entry_id'),
        sa.UniqueConstraint('entry_number'),
    )
    op.create_index('ix_je_module', 'erp_journal_entries', ['module'])
    op.create_index('ix_je_fiscal', 'erp_journal_entries', ['fiscal_year', 'fiscal_month'])
    op.create_index('ix_je_status', 'erp_journal_entries', ['status'])
    op.create_index('ix_je_source', 'erp_journal_entries', ['source'])
    op.create_index('ix_je_date', 'erp_journal_entries', ['entry_date'])
    op.create_index('ix_je_batch', 'erp_journal_entries', ['smartbooks_batch_nbr'])
    op.create_index(
        op.f('ix_erp_journal_entries_entry_number'),
        'erp_journal_entries', ['entry_number'], unique=False,
    )

    # erp_journal_lines
    op.create_table(
        'erp_journal_lines',
        sa.Column('line_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('account_code', sa.String(length=7), nullable=False,
                   comment='계정코드 (erp_chart_of_accounts 참조)'),
        sa.Column('counter_account_code', sa.String(length=7), nullable=True,
                   comment='대변/차변 상대 계정'),
        sa.Column('description_vn', sa.Text(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('debit_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('credit_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('currency_amount', sa.Numeric(precision=18, scale=2), nullable=True,
                   comment='원화 금액 (외화 전표 시)'),
        sa.Column('currency_code', sa.String(length=3), nullable=True),
        sa.Column('exchange_rate', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('vendor_id', sa.String(length=20), nullable=True),
        sa.Column('customer_id', sa.String(length=20), nullable=True),
        sa.Column('employee_id', sa.String(length=20), nullable=True),
        sa.Column('cost_center_id', sa.Integer(), nullable=True),
        sa.Column('job_center', sa.String(length=20), nullable=True),
        sa.Column('profit_center', sa.String(length=20), nullable=True),
        sa.Column('tax_code', sa.String(length=10), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('tax_account', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ['entry_id'], ['erp_journal_entries.entry_id'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(['cost_center_id'], ['erp_cost_centers.center_id']),
        sa.PrimaryKeyConstraint('line_id'),
    )
    op.create_index('ix_jl_entry', 'erp_journal_lines', ['entry_id'])
    op.create_index('ix_jl_account', 'erp_journal_lines', ['account_code'])


def downgrade() -> None:
    op.drop_index('ix_jl_account', table_name='erp_journal_lines')
    op.drop_index('ix_jl_entry', table_name='erp_journal_lines')
    op.drop_table('erp_journal_lines')

    op.drop_index(op.f('ix_erp_journal_entries_entry_number'), table_name='erp_journal_entries')
    op.drop_index('ix_je_batch', table_name='erp_journal_entries')
    op.drop_index('ix_je_date', table_name='erp_journal_entries')
    op.drop_index('ix_je_source', table_name='erp_journal_entries')
    op.drop_index('ix_je_status', table_name='erp_journal_entries')
    op.drop_index('ix_je_fiscal', table_name='erp_journal_entries')
    op.drop_index('ix_je_module', table_name='erp_journal_entries')
    op.drop_table('erp_journal_entries')
