"""MSSQL 레거시 데이터 조회 API

MSSQL UNI_DebitNote 데이터베이스의 기존 운영 데이터 조회:
- 고객사 목록/상세 (clients)
- 통관 스킴 목록 (scheme_clearance)
- 통관 비용 상세 (clearance)
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import Session

from app.core.database import get_mssql_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.mssql import MssqlClient, MssqlClearance, MssqlSchemeClearance
from app.schemas.mssql import (
    MssqlClientResponse,
    MssqlClientDetailResponse,
    MssqlSchemeClearanceResponse,
    MssqlClearanceResponse,
    MssqlClearanceDetailResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/api/v1/mssql", tags=["mssql-legacy"])


# ============================================================
# Client Endpoints (clients 테이블)
# ============================================================
@router.get("/clients", response_model=PaginatedResponse[MssqlClientResponse])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="고객명 또는 이메일 검색"),
    active_only: bool = Query(True, description="활성 고객만 조회"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """고객사 목록 조회 (페이지네이션, 검색)"""
    try:
        query = select(MssqlClient)

        if active_only:
            query = query.where(MssqlClient.active == True)

        if search:
            search_filter = or_(
                MssqlClient.company_name.ilike(f"%{search}%"),
                MssqlClient.email.ilike(f"%{search}%"),
                MssqlClient.first_name.ilike(f"%{search}%"),
                MssqlClient.last_name.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = query.order_by(MssqlClient.company_name).offset(skip).limit(limit)
        clients = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[MssqlClientResponse.model_validate(c) for c in clients]
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get("/clients/{client_id}", response_model=MssqlClientDetailResponse)
def get_client_detail(
    client_id: int,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """고객사 상세 조회"""
    try:
        client = db.execute(
            select(MssqlClient).where(MssqlClient.id_clients == client_id)
        ).scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {client_id} not found"
            )

        return MssqlClientDetailResponse.model_validate(client)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# Scheme Clearance Endpoints (scheme_clearance 테이블)
# ============================================================
@router.get(
    "/clearance",
    response_model=PaginatedResponse[MssqlSchemeClearanceResponse],
)
def list_clearances(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    company: Optional[str] = Query(None, description="고객사명 필터"),
    im_ex: Optional[str] = Query(None, description="수출입 구분 (IM/EX)"),
    date_from: Optional[date] = Query(None, description="도착일 시작"),
    date_to: Optional[date] = Query(None, description="도착일 종료"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """통관 스킴 목록 조회 (필터, 페이지네이션)"""
    try:
        query = select(MssqlSchemeClearance).where(
            MssqlSchemeClearance.is_active == True
        )

        filters = []
        if company:
            filters.append(
                MssqlSchemeClearance.company.ilike(f"%{company}%")
            )
        if im_ex:
            filters.append(MssqlSchemeClearance.im_ex == im_ex)
        if date_from:
            filters.append(MssqlSchemeClearance.arrival_date >= date_from)
        if date_to:
            filters.append(MssqlSchemeClearance.arrival_date <= date_to)

        if filters:
            query = query.where(and_(*filters))

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = (
            query.order_by(MssqlSchemeClearance.id_scheme_cd.desc())
            .offset(skip)
            .limit(limit)
        )
        clearances = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[
                MssqlSchemeClearanceResponse.model_validate(c)
                for c in clearances
            ],
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get(
    "/clearance/{scheme_cd_id}/costs",
    response_model=MssqlClearanceDetailResponse,
)
def get_clearance_costs(
    scheme_cd_id: int,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """통관 비용 상세 조회 (scheme_clearance → clearance 연결)"""
    try:
        scheme = db.execute(
            select(MssqlSchemeClearance).where(
                MssqlSchemeClearance.id_scheme_cd == scheme_cd_id
            )
        ).scalar_one_or_none()

        if not scheme or not scheme.id_clearance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clearance costs for scheme {scheme_cd_id} not found",
            )

        clearance = db.execute(
            select(MssqlClearance).where(
                MssqlClearance.id_clearance == scheme.id_clearance
            )
        ).scalar_one_or_none()

        if not clearance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clearance {scheme.id_clearance} not found",
            )

        return MssqlClearanceDetailResponse.model_validate(clearance)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
