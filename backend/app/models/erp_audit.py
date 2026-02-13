"""ERP 감사 로그 모델 (PostgreSQL 신규 테이블)

Sprint 5: erp_audit_logs
ERP 모듈 전용 변경 이력 추적 (기존 audit_logs와 별도)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, JSON, Index,
)
from app.core.database import Base


class ErpAuditLog(Base):
    """ERP 감사 로그 테이블"""
    __tablename__ = "erp_audit_logs"
    __table_args__ = (
        Index("ix_erp_audit_entity", "entity_type", "entity_id"),
        Index("ix_erp_audit_action", "action"),
        Index("ix_erp_audit_at", "action_at"),
        Index("ix_erp_audit_user", "performed_by"),
    )

    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(
        String(100), nullable=False,
        comment="테이블명 (erp_suppliers, erp_purchase_orders 등)",
    )
    entity_id = Column(Integer, nullable=False)
    action = Column(
        String(20), nullable=False,
        comment="INSERT/UPDATE/DELETE",
    )
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    performed_by = Column(
        Integer, ForeignKey("users.user_id"), nullable=True,
    )
    ip_address = Column(String(50), nullable=True)
    action_at = Column(DateTime, default=datetime.utcnow, nullable=False)
