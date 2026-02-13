"""Sprint 13: erp_quotation_actuals (견적-실적 비교)

Revision ID: f9a2b7c3d456
Revises: e8f1a6b2c345
Create Date: 2026-02-11
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'f9a2b7c3d456'
down_revision = 'e8f1a6b2c345'
branch_labels = None
depends_on = None


def _numeric_col():
    """NUMERIC(18,2) 공통 타입"""
    return sa.Numeric(precision=18, scale=2)


def upgrade() -> None:
    op.create_table(
        'erp_quotation_actuals',
        sa.Column('comparison_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('mssql_shipment_ref', sa.String(50), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('customer_name', sa.String(200), nullable=True),
        sa.Column('service_type', sa.String(20), nullable=False, server_default='clearance'),
        sa.Column('quotation_amount', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('actual_selling', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('actual_buying', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('variance_selling', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('variance_buying', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('variance_gp', _numeric_col(), nullable=False, server_default='0'),
        sa.Column('invoice_no', sa.String(50), nullable=True),
        sa.Column('analysis_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index('ix_qa_shipment', 'erp_quotation_actuals', ['mssql_shipment_ref'])
    op.create_index('ix_qa_customer', 'erp_quotation_actuals', ['customer_id'])
    op.create_index('ix_qa_date', 'erp_quotation_actuals', ['analysis_date'])
    op.create_index('ix_qa_type', 'erp_quotation_actuals', ['service_type'])


def downgrade() -> None:
    op.drop_index('ix_qa_type', table_name='erp_quotation_actuals')
    op.drop_index('ix_qa_date', table_name='erp_quotation_actuals')
    op.drop_index('ix_qa_customer', table_name='erp_quotation_actuals')
    op.drop_index('ix_qa_shipment', table_name='erp_quotation_actuals')
    op.drop_table('erp_quotation_actuals')
