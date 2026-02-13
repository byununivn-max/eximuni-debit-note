"""add_azure_oid_to_users

Revision ID: b7c4d9e8f123
Revises: 19aac71a7784
Create Date: 2026-02-11 13:13:44.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c4d9e8f123'
down_revision: Union[str, None] = '19aac71a7784'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add azure_oid column for MSAL SSO integration
    op.add_column('users', sa.Column('azure_oid', sa.String(length=100), nullable=True))
    op.create_unique_constraint('uq_users_azure_oid', 'users', ['azure_oid'])
    op.create_index('ix_users_azure_oid', 'users', ['azure_oid'], unique=False)

    # Make hashed_password nullable for MSAL-only users
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade() -> None:
    # Revert hashed_password to nullable=False
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(length=255),
                    nullable=False)

    # Remove azure_oid column and constraints
    op.drop_index('ix_users_azure_oid', table_name='users')
    op.drop_constraint('uq_users_azure_oid', 'users', type_='unique')
    op.drop_column('users', 'azure_oid')
