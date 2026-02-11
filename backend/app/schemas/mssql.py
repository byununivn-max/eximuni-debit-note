"""MSSQL 레거시 데이터 응답 스키마

실제 MSSQL 테이블 컬럼명에 맞춰 수정됨 (Sprint 1)
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, TypeVar, Generic
from pydantic import BaseModel, ConfigDict


# ============================================================
# Client Schemas (clients 테이블)
# ============================================================
class MssqlClientResponse(BaseModel):
    """고객사 기본 정보 응답"""
    id_clients: int
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    clients_type: Optional[str] = None
    phone_number: Optional[str] = None
    active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class MssqlClientDetailResponse(MssqlClientResponse):
    """고객사 상세 정보 응답"""
    gender: Optional[str] = None
    language: Optional[str] = None
    note: Optional[str] = None
    service: Optional[str] = None
    subscribe: Optional[bool] = None
    position: Optional[str] = None
    industry: Optional[str] = None
    fdi: Optional[str] = None
    province: Optional[str] = None
    key_contact: Optional[bool] = None
    campaign: Optional[str] = None
    recent_clearances: List["MssqlSchemeClearanceResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Scheme Clearance Schemas (scheme_clearance 테이블)
# ============================================================
class MssqlSchemeClearanceResponse(BaseModel):
    """통관 스킴 응답"""
    id_scheme_cd: int
    id_clearance: Optional[int] = None
    invoice: Optional[str] = None
    invoice_date: Optional[date] = None
    im_ex: Optional[str] = None
    arrival_date: Optional[date] = None
    company: Optional[str] = None
    hbl: Optional[str] = None
    phan_luong: Optional[str] = None
    vessel: Optional[str] = None
    so_tk: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Clearance Detail Schemas (clearance 테이블 — 비용 상세)
# ============================================================
class MssqlClearanceResponse(BaseModel):
    """통관 비용 상세 응답 (주요 비용만)"""
    id_clearance: int
    phi_thong_quan: Optional[float] = None
    phi_kiem_hoa: Optional[float] = None
    phi_van_chuyen: Optional[float] = None
    phi_luu_cont: Optional[float] = None
    phi_nang: Optional[float] = None
    phi_ha: Optional[float] = None
    phi_luu_kho: Optional[float] = None
    of_af: Optional[float] = None
    phi_tach_bill: Optional[float] = None
    ghi_chu: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MssqlClearanceDetailResponse(MssqlClearanceResponse):
    """통관 비용 전체 상세 응답"""
    phi_mo_tk_ngoai_gio: Optional[float] = None
    phi_sua_tk: Optional[float] = None
    phi_huy_tk: Optional[float] = None
    phi_khai_hoa_chat: Optional[float] = None
    phi_gp_nk_tien_chat: Optional[float] = None
    phi_khac_inland: Optional[float] = None
    phi_giao_hang_nhanh: Optional[float] = None
    phi_do_cont_tuyen_dai: Optional[float] = None
    phi_nhan_cong: Optional[float] = None
    phi_chung_tu: Optional[float] = None
    phi_do_hang: Optional[float] = None
    phi_giao_tai_xuong: Optional[float] = None
    phi_giao_tai_diem_chi_dinh: Optional[float] = None
    phi_xu_ly_hang_hoa: Optional[float] = None
    phu_phi_xang_dau: Optional[float] = None
    phu_phi_an_ninh: Optional[float] = None
    phi_soi_chieu: Optional[float] = None
    phi_bao_hiem_hang_hoa: Optional[float] = None
    phi_khac_local: Optional[float] = None
    phi_nang_pay_on: Optional[float] = None
    phi_ha_payon: Optional[float] = None
    phi_local: Optional[float] = None
    phi_khac_chi_ho: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Debit Sharepoint Schemas (debit_sharepoint 테이블)
# ============================================================
class MssqlDebitSharepointResponse(BaseModel):
    """Debit Note 기본 정보 응답"""
    id_invoice: int
    invoice: Optional[str] = None
    invoice_date: Optional[date] = None
    bl: Optional[str] = None
    im_ex: Optional[str] = None
    clients: Optional[str] = None
    debit_status: Optional[str] = None
    arrival_date: Optional[date] = None
    phuong_thuc_van_chuyen: Optional[str] = None
    forward: Optional[str] = None
    operation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Generic Pagination
# ============================================================
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션 응답 (제네릭)"""
    total: int
    items: List[T]

    model_config = ConfigDict(from_attributes=True)
