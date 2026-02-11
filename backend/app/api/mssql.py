"""MSSQL 레거시 데이터 조회 API

MSSQL UNI_DebitNote 데이터베이스의 기존 운영 데이터 조회:
- 고객사 목록/상세 (T_Client)
- 통관 내역 (T_Clearance)
- 선적 내역 (T_Shipment)
"""
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import Session

from app.core.database import get_mssql_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.mssql import MssqlClient, MssqlClearance, MssqlShipment
from app.schemas.mssql import (
    MssqlClientResponse,
    MssqlClientDetailResponse,
    MssqlClearanceResponse,
    MssqlClearanceDetailResponse,
    MssqlShipmentResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/api/v1/mssql", tags=["mssql-legacy"])


# ============================================================
# Client Endpoints
# ============================================================
@router.get("/clients", response_model=PaginatedResponse[MssqlClientResponse])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="고객명 또는 코드 검색"),
    active_only: bool = Query(True, description="활성 고객만 조회"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """고객사 목록 조회 (페이지네이션, 검색)"""
    try:
        query = select(MssqlClient)

        # 활성 고객 필터
        if active_only:
            query = query.where(MssqlClient.is_active == True)

        # 검색 필터
        if search:
            search_filter = or_(
                MssqlClient.client_name.ilike(f"%{search}%"),
                MssqlClient.client_code.ilike(f"%{search}%"),
                MssqlClient.client_name_en.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        # 전체 개수
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar()

        # 페이지네이션
        query = query.order_by(MssqlClient.client_name).offset(skip).limit(limit)
        result = db.execute(query)
        clients = result.scalars().all()

        return PaginatedResponse(
            total=total,
            items=[MssqlClientResponse.model_validate(c) for c in clients]
        )
    except RuntimeError as e:
        # MSSQL 연결 설정 없음
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
    """고객사 상세 조회 (최근 통관 내역 5건 포함)"""
    try:
        # 고객 정보
        client = db.execute(
            select(MssqlClient).where(MssqlClient.client_id == client_id)
        ).scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {client_id} not found"
            )

        # 최근 통관 내역 5건
        clearances = db.execute(
            select(MssqlClearance)
            .where(MssqlClearance.client_id == client_id)
            .order_by(MssqlClearance.created_date.desc())
            .limit(5)
        ).scalars().all()

        # 응답 생성
        response = MssqlClientDetailResponse.model_validate(client)
        response.recent_clearances = [
            MssqlClearanceResponse.model_validate(c) for c in clearances
        ]

        return response
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# Clearance Endpoints
# ============================================================
@router.get("/clearance", response_model=PaginatedResponse[MssqlClearanceResponse])
def list_clearances(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    client_id: Optional[int] = Query(None, description="고객사 ID 필터"),
    clearance_status: Optional[str] = Query(None, description="상태 필터"),
    date_from: Optional[date] = Query(None, description="통관일 시작 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="통관일 종료 (YYYY-MM-DD)"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """통관 내역 목록 조회 (필터, 페이지네이션)"""
    try:
        query = select(MssqlClearance)

        # 필터 적용
        filters = []
        if client_id:
            filters.append(MssqlClearance.client_id == client_id)
        if clearance_status:
            filters.append(MssqlClearance.status == clearance_status)
        if date_from:
            filters.append(MssqlClearance.clearance_date >= date_from)
        if date_to:
            filters.append(MssqlClearance.clearance_date <= date_to)

        if filters:
            query = query.where(and_(*filters))

        # 전체 개수
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar()

        # 페이지네이션
        query = query.order_by(MssqlClearance.created_date.desc()).offset(skip).limit(limit)
        result = db.execute(query)
        clearances = result.scalars().all()

        return PaginatedResponse(
            total=total,
            items=[MssqlClearanceResponse.model_validate(c) for c in clearances]
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get("/clearance/{clearance_id}", response_model=MssqlClearanceDetailResponse)
def get_clearance_detail(
    clearance_id: int,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """통관 상세 조회 (연관 선적 정보 포함)"""
    try:
        # 통관 정보
        clearance = db.execute(
            select(MssqlClearance).where(MssqlClearance.clearance_id == clearance_id)
        ).scalar_one_or_none()

        if not clearance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clearance {clearance_id} not found"
            )

        # 연관 선적 정보
        shipments = db.execute(
            select(MssqlShipment)
            .where(MssqlShipment.clearance_id == clearance_id)
            .order_by(MssqlShipment.shipment_no)
        ).scalars().all()

        # 응답 생성
        response = MssqlClearanceDetailResponse.model_validate(clearance)
        response.shipments = [
            MssqlShipmentResponse.model_validate(s) for s in shipments
        ]

        return response
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# Shipment Endpoints
# ============================================================
@router.get("/shipments", response_model=PaginatedResponse[MssqlShipmentResponse])
def list_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    clearance_id: Optional[int] = Query(None, description="통관 ID 필터"),
    client_id: Optional[int] = Query(None, description="고객사 ID 필터"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """선적 내역 목록 조회 (필터, 페이지네이션)"""
    try:
        query = select(MssqlShipment)

        # 필터 적용
        filters = []
        if clearance_id:
            filters.append(MssqlShipment.clearance_id == clearance_id)
        if client_id:
            filters.append(MssqlShipment.client_id == client_id)

        if filters:
            query = query.where(and_(*filters))

        # 전체 개수
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar()

        # 페이지네이션
        query = query.order_by(MssqlShipment.created_date.desc()).offset(skip).limit(limit)
        result = db.execute(query)
        shipments = result.scalars().all()

        return PaginatedResponse(
            total=total,
            items=[MssqlShipmentResponse.model_validate(s) for s in shipments]
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
