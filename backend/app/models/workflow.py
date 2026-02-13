"""범용 승인 워크플로우 모델 (PostgreSQL 신규 테이블)

Sprint 5: erp_approval_workflows
debit_note / purchase_order / selling_record 상태 변경 이력 통합 관리
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text, Index,
)
from app.core.database import Base


class ApprovalWorkflow(Base):
    """범용 승인 워크플로우 이력 테이블"""
    __tablename__ = "erp_approval_workflows"
    __table_args__ = (
        Index("ix_wf_entity", "entity_type", "entity_id"),
        Index("ix_wf_performed", "performed_by"),
        Index("ix_wf_created", "created_at"),
    )

    workflow_id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(
        String(50), nullable=False,
        comment="debit_note/purchase_order/selling_record",
    )
    entity_id = Column(Integer, nullable=False)
    action = Column(
        String(30), nullable=False,
        comment="submit/approve/reject/confirm/cancel",
    )
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=True)
    performed_by = Column(
        Integer, ForeignKey("users.user_id"), nullable=True,
    )
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
