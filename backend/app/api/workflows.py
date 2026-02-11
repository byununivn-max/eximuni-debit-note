"""워크플로우 + 감사 로그 API

erp_approval_workflows 이력 조회/기록 + erp_audit_logs 조회
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workflow import ApprovalWorkflow
from app.models.erp_audit import ErpAuditLog
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowResponse,
    WorkflowListResponse,
    ErpAuditLogResponse,
    ErpAuditLogListResponse,
    AuditSummaryItem,
    AuditSummaryResponse,
)
from app.services.audit_service import record_workflow

router = APIRouter(tags=["workflow-audit"])


# ============================================================
# Approval Workflow Endpoints
# ============================================================
@router.get(
    "/api/v1/workflows",
    response_model=WorkflowListResponse,
)
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    performed_by: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """워크플로우 이력 목록 조회"""
    query = select(ApprovalWorkflow)

    filters = []
    if entity_type:
        filters.append(ApprovalWorkflow.entity_type == entity_type)
    if entity_id is not None:
        filters.append(ApprovalWorkflow.entity_id == entity_id)
    if action:
        filters.append(ApprovalWorkflow.action == action)
    if performed_by is not None:
        filters.append(ApprovalWorkflow.performed_by == performed_by)
    if date_from:
        filters.append(ApprovalWorkflow.created_at >= date_from)
    if date_to:
        filters.append(ApprovalWorkflow.created_at <= date_to)

    if filters:
        query = query.where(and_(*filters))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    query = (
        query.order_by(ApprovalWorkflow.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkflowListResponse(
        total=total,
        items=[WorkflowResponse.model_validate(i) for i in items],
    )


@router.get(
    "/api/v1/workflows/{entity_type}/{entity_id}",
    response_model=WorkflowListResponse,
)
async def get_entity_workflows(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 엔티티의 워크플로우 이력 조회"""
    query = (
        select(ApprovalWorkflow)
        .where(
            ApprovalWorkflow.entity_type == entity_type,
            ApprovalWorkflow.entity_id == entity_id,
        )
        .order_by(ApprovalWorkflow.created_at.desc())
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkflowListResponse(
        total=len(items),
        items=[WorkflowResponse.model_validate(i) for i in items],
    )


@router.post(
    "/api/v1/workflows",
    response_model=WorkflowResponse,
)
async def create_workflow_event(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """워크플로우 이벤트 기록"""
    wf = await record_workflow(
        db=db,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        action=data.action,
        performed_by=current_user.user_id,
        from_status=data.from_status,
        to_status=data.to_status,
        comment=data.comment,
    )
    await db.commit()
    return WorkflowResponse.model_validate(wf)


# ============================================================
# ERP Audit Log Endpoints
# ============================================================
@router.get(
    "/api/v1/erp-audit-logs",
    response_model=ErpAuditLogListResponse,
)
async def list_erp_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    performed_by: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ERP 감사 로그 목록 조회"""
    query = select(ErpAuditLog)

    filters = []
    if entity_type:
        filters.append(ErpAuditLog.entity_type == entity_type)
    if entity_id is not None:
        filters.append(ErpAuditLog.entity_id == entity_id)
    if action:
        filters.append(ErpAuditLog.action == action)
    if performed_by is not None:
        filters.append(ErpAuditLog.performed_by == performed_by)
    if date_from:
        filters.append(ErpAuditLog.action_at >= date_from)
    if date_to:
        filters.append(ErpAuditLog.action_at <= date_to)

    if filters:
        query = query.where(and_(*filters))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    query = (
        query.order_by(ErpAuditLog.action_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return ErpAuditLogListResponse(
        total=total,
        items=[ErpAuditLogResponse.model_validate(i) for i in items],
    )


@router.get(
    "/api/v1/erp-audit-logs/summary",
    response_model=AuditSummaryResponse,
)
async def erp_audit_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ERP 감사 로그 통계 (엔티티별 × 액션별)"""
    query = select(
        ErpAuditLog.entity_type,
        ErpAuditLog.action,
        func.count(ErpAuditLog.audit_id).label("count"),
    ).group_by(ErpAuditLog.entity_type, ErpAuditLog.action)

    filters = []
    if date_from:
        filters.append(ErpAuditLog.action_at >= date_from)
    if date_to:
        filters.append(ErpAuditLog.action_at <= date_to)
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    rows = result.all()

    items = [
        AuditSummaryItem(
            entity_type=r.entity_type,
            action=r.action,
            count=r.count,
        )
        for r in rows
    ]
    total_count = sum(i.count for i in items)

    return AuditSummaryResponse(items=items, total_count=total_count)
