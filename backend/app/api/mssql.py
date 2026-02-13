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
from app.models.mssql import (
    MssqlClient, MssqlClearance, MssqlSchemeClearance,
    MssqlSchemeOps, MssqlOps,
    MssqlSchemeCo, MssqlCo, MssqlContract,
    MssqlDebitSharepoint,
    MssqlCustomerClearance, MssqlCustomerConfig,
)
from app.schemas.mssql import (
    MssqlClientResponse,
    MssqlClientDetailResponse,
    MssqlSchemeClearanceResponse,
    MssqlClearanceResponse,
    MssqlClearanceDetailResponse,
    MssqlDebitSharepointResponse,
    MssqlDebitSharepointDetailResponse,
    MssqlSchemeOpsResponse,
    MssqlOpsDetailResponse,
    MssqlSchemeCoResponse,
    MssqlCoWithContractResponse,
    MssqlContractResponse,
    MssqlCustomerClearanceResponse,
    MssqlCustomerConfigResponse,
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


# ============================================================
# Debit Sharepoint Endpoints (debit_sharepoint 테이블)
# ============================================================
@router.get(
    "/debit-sharepoint",
    response_model=PaginatedResponse[MssqlDebitSharepointResponse],
)
def list_debit_sharepoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    clients: Optional[str] = Query(None, description="고객사명 필터"),
    im_ex: Optional[str] = Query(None, description="수출입 구분 (IM/EX)"),
    debit_status: Optional[str] = Query(None, description="Debit 상태 필터"),
    date_from: Optional[date] = Query(None, description="도착일 시작"),
    date_to: Optional[date] = Query(None, description="도착일 종료"),
    search: Optional[str] = Query(None, description="Invoice/BL/고객명 검색"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """Debit Sharepoint 목록 조회 (필터, 검색, 페이지네이션)"""
    try:
        query = select(MssqlDebitSharepoint)

        filters = []
        if clients:
            filters.append(
                MssqlDebitSharepoint.clients.ilike(f"%{clients}%")
            )
        if im_ex:
            filters.append(MssqlDebitSharepoint.im_ex == im_ex)
        if debit_status:
            filters.append(MssqlDebitSharepoint.debit_status == debit_status)
        if date_from:
            filters.append(MssqlDebitSharepoint.arrival_date >= date_from)
        if date_to:
            filters.append(MssqlDebitSharepoint.arrival_date <= date_to)
        if search:
            filters.append(or_(
                MssqlDebitSharepoint.invoice.ilike(f"%{search}%"),
                MssqlDebitSharepoint.bl.ilike(f"%{search}%"),
                MssqlDebitSharepoint.clients.ilike(f"%{search}%"),
                MssqlDebitSharepoint.mbl.ilike(f"%{search}%"),
            ))

        if filters:
            query = query.where(and_(*filters))

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = (
            query.order_by(MssqlDebitSharepoint.id_invoice.desc())
            .offset(skip)
            .limit(limit)
        )
        items = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[
                MssqlDebitSharepointResponse.model_validate(i)
                for i in items
            ],
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get(
    "/debit-sharepoint/{invoice_id}",
    response_model=MssqlDebitSharepointDetailResponse,
)
def get_debit_sharepoint_detail(
    invoice_id: int,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """Debit Sharepoint 상세 조회"""
    try:
        item = db.execute(
            select(MssqlDebitSharepoint).where(
                MssqlDebitSharepoint.id_invoice == invoice_id
            )
        ).scalar_one_or_none()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Debit Sharepoint {invoice_id} not found",
            )

        return MssqlDebitSharepointDetailResponse.model_validate(item)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# Ops Endpoints (scheme_ops + ops 테이블)
# ============================================================
@router.get("/ops", response_model=PaginatedResponse[MssqlSchemeOpsResponse])
def list_ops(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    customer: Optional[str] = Query(None, description="고객사명 필터"),
    type: Optional[str] = Query(None, description="타입 필터"),
    search: Optional[str] = Query(None, description="이름/고객명/HBL 검색"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """Ops 스킴 목록 조회 (필터, 검색, 페이지네이션)"""
    try:
        query = select(MssqlSchemeOps).where(
            MssqlSchemeOps.is_active == True
        )

        filters = []
        if customer:
            filters.append(
                MssqlSchemeOps.customer.ilike(f"%{customer}%")
            )
        if type:
            filters.append(MssqlSchemeOps.type == type)
        if search:
            filters.append(or_(
                MssqlSchemeOps.name.ilike(f"%{search}%"),
                MssqlSchemeOps.customer.ilike(f"%{search}%"),
                MssqlSchemeOps.hbl.ilike(f"%{search}%"),
                MssqlSchemeOps.so_invoice.ilike(f"%{search}%"),
            ))

        if filters:
            query = query.where(and_(*filters))

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = (
            query.order_by(MssqlSchemeOps.id_scheme_ops.desc())
            .offset(skip)
            .limit(limit)
        )
        items = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[
                MssqlSchemeOpsResponse.model_validate(i) for i in items
            ],
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get(
    "/ops/{scheme_ops_id}/costs",
    response_model=MssqlOpsDetailResponse,
)
def get_ops_costs(
    scheme_ops_id: int,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """Ops 비용 상세 조회 (scheme_ops -> ops 연결)"""
    try:
        scheme = db.execute(
            select(MssqlSchemeOps).where(
                MssqlSchemeOps.id_scheme_ops == scheme_ops_id
            )
        ).scalar_one_or_none()

        if not scheme or not scheme.id_ops:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ops costs for scheme {scheme_ops_id} not found",
            )

        ops = db.execute(
            select(MssqlOps).where(MssqlOps.id_ops == scheme.id_ops)
        ).scalar_one_or_none()

        if not ops:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ops {scheme.id_ops} not found",
            )

        return MssqlOpsDetailResponse.model_validate(ops)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# CO Endpoints (scheme_co + co + contract 테이블)
# ============================================================
@router.get("/co", response_model=PaginatedResponse[MssqlSchemeCoResponse])
def list_co(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ten_kh: Optional[str] = Query(None, description="고객명 필터"),
    form: Optional[str] = Query(None, description="CO Form 필터"),
    search: Optional[str] = Query(None, description="CO번호/Invoice/고객명 검색"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """CO 스킴 목록 조회 (필터, 검색, 페이지네이션)"""
    try:
        query = select(MssqlSchemeCo).where(
            MssqlSchemeCo.is_active == True
        )

        filters = []
        if ten_kh:
            filters.append(
                MssqlSchemeCo.ten_kh.ilike(f"%{ten_kh}%")
            )
        if form:
            filters.append(MssqlSchemeCo.form == form)
        if search:
            filters.append(or_(
                MssqlSchemeCo.so_co.ilike(f"%{search}%"),
                MssqlSchemeCo.so_invoice.ilike(f"%{search}%"),
                MssqlSchemeCo.ten_kh.ilike(f"%{search}%"),
            ))

        if filters:
            query = query.where(and_(*filters))

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = (
            query.order_by(MssqlSchemeCo.id_scheme_co.desc())
            .offset(skip)
            .limit(limit)
        )
        items = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[
                MssqlSchemeCoResponse.model_validate(i) for i in items
            ],
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get(
    "/co/{scheme_co_id}/costs",
    response_model=MssqlCoWithContractResponse,
)
def get_co_costs(
    scheme_co_id: str,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """CO 비용 + 계약 상세 조회 (scheme_co -> co -> contract 연결)"""
    try:
        scheme = db.execute(
            select(MssqlSchemeCo).where(
                MssqlSchemeCo.id_scheme_co == scheme_co_id
            )
        ).scalar_one_or_none()

        if not scheme or not scheme.id_co:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CO costs for scheme {scheme_co_id} not found",
            )

        co = db.execute(
            select(MssqlCo).where(MssqlCo.id_co == scheme.id_co)
        ).scalar_one_or_none()

        if not co:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CO {scheme.id_co} not found",
            )

        result = MssqlCoWithContractResponse.model_validate(co)

        # 계약 정보 조회 (있는 경우)
        if co.id_contract:
            contract = db.execute(
                select(MssqlContract).where(
                    MssqlContract.id_contract == co.id_contract
                )
            ).scalar_one_or_none()
            if contract:
                result.contract = MssqlContractResponse.model_validate(
                    contract
                )

        return result
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


# ============================================================
# Customer Forms Endpoints (customer_clearance + customer_config)
# ============================================================
@router.get(
    "/customer-forms/{customer_name}",
    response_model=MssqlCustomerClearanceResponse,
)
def get_customer_form(
    customer_name: str,
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """고객별 동적 폼 설정 조회 (customer_clearance 테이블)"""
    try:
        form = db.execute(
            select(MssqlCustomerClearance).where(
                MssqlCustomerClearance.name_customer.ilike(
                    f"%{customer_name}%"
                )
            )
        ).scalar_one_or_none()

        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer form for '{customer_name}' not found",
            )

        return MssqlCustomerClearanceResponse.model_validate(form)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get(
    "/customer-config",
    response_model=PaginatedResponse[MssqlCustomerConfigResponse],
)
def list_customer_config(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    customer: Optional[str] = Query(None, description="고객명 필터"),
    co_cd_type: Optional[str] = Query(None, description="CO/CD 유형 필터"),
    active_only: bool = Query(True, description="활성 설정만 조회"),
    db: Session = Depends(get_mssql_db),
    current_user: User = Depends(get_current_user),
):
    """고객별 자동입력 설정 목록 조회"""
    try:
        query = select(MssqlCustomerConfig)

        if active_only:
            query = query.where(MssqlCustomerConfig.is_active == True)

        filters = []
        if customer:
            filters.append(
                MssqlCustomerConfig.customer.ilike(f"%{customer}%")
            )
        if co_cd_type:
            filters.append(MssqlCustomerConfig.co_cd_type == co_cd_type)

        if filters:
            query = query.where(and_(*filters))

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar()

        query = (
            query.order_by(
                MssqlCustomerConfig.customer,
                MssqlCustomerConfig.priority,
            )
            .offset(skip)
            .limit(limit)
        )
        items = db.execute(query).scalars().all()

        return PaginatedResponse(
            total=total,
            items=[
                MssqlCustomerConfigResponse.model_validate(i)
                for i in items
            ],
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
