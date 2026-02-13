"""감사/워크플로우 기록 유틸 서비스

다른 API 라우터에서 재사용 가능한 함수 제공:
- record_workflow(): 워크플로우 이벤트 기록
- record_audit_log(): 감사 로그 기록
"""
from datetime import datetime
from typing import Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import ApprovalWorkflow
from app.models.erp_audit import ErpAuditLog


async def record_workflow(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    action: str,
    performed_by: Optional[int] = None,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    comment: Optional[str] = None,
) -> ApprovalWorkflow:
    """워크플로우 이벤트 기록

    Args:
        db: PostgreSQL async 세션
        entity_type: 엔티티 유형 (debit_note, purchase_order 등)
        entity_id: 대상 엔티티 PK
        action: 수행 액션 (submit, approve, reject, confirm, cancel)
        performed_by: 수행자 user_id
        from_status: 변경 전 상태
        to_status: 변경 후 상태
        comment: 코멘트

    Returns:
        생성된 ApprovalWorkflow 레코드
    """
    workflow = ApprovalWorkflow(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        performed_by=performed_by,
        from_status=from_status,
        to_status=to_status,
        comment=comment,
        created_at=datetime.utcnow(),
    )
    db.add(workflow)
    await db.flush()
    return workflow


async def record_audit_log(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    action: str,
    performed_by: Optional[int] = None,
    old_values: Optional[Any] = None,
    new_values: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> ErpAuditLog:
    """감사 로그 기록

    Args:
        db: PostgreSQL async 세션
        entity_type: 테이블명 (erp_suppliers 등)
        entity_id: 레코드 PK
        action: 액션 (INSERT, UPDATE, DELETE)
        performed_by: 수행자 user_id
        old_values: 변경 전 값 (dict)
        new_values: 변경 후 값 (dict)
        ip_address: 요청 IP

    Returns:
        생성된 ErpAuditLog 레코드
    """
    log = ErpAuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        performed_by=performed_by,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        action_at=datetime.utcnow(),
    )
    db.add(log)
    await db.flush()
    return log
