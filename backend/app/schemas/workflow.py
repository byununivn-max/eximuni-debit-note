"""워크플로우 + 감사 로그 Pydantic 스키마"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


# ============================================================
# Approval Workflow
# ============================================================
class WorkflowCreate(BaseModel):
    """워크플로우 이벤트 생성"""
    entity_type: str
    entity_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    comment: Optional[str] = None


class WorkflowResponse(BaseModel):
    """워크플로우 이벤트 응답"""
    model_config = ConfigDict(from_attributes=True)

    workflow_id: int
    entity_type: str
    entity_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    performed_by: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime


class WorkflowListResponse(BaseModel):
    """워크플로우 목록 페이지네이션 응답"""
    total: int
    items: List[WorkflowResponse]


# ============================================================
# ERP Audit Log
# ============================================================
class ErpAuditLogResponse(BaseModel):
    """감사 로그 응답"""
    model_config = ConfigDict(from_attributes=True)

    audit_id: int
    entity_type: str
    entity_id: int
    action: str
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    performed_by: Optional[int] = None
    ip_address: Optional[str] = None
    action_at: datetime


class ErpAuditLogListResponse(BaseModel):
    """감사 로그 목록 페이지네이션 응답"""
    total: int
    items: List[ErpAuditLogResponse]


# ============================================================
# 감사 로그 통계
# ============================================================
class AuditSummaryItem(BaseModel):
    """엔티티별 감사 통계"""
    entity_type: str
    action: str
    count: int


class AuditSummaryResponse(BaseModel):
    """감사 로그 통계 응답"""
    items: List[AuditSummaryItem]
    total_count: int
