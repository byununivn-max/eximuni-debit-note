"""MSSQL clearance 테이블 모델 — 통관 비용 상세 (52개 컬럼)"""
from sqlalchemy import Column, Integer, Float, String
from app.core.database import MSSQLBase


class MssqlClearance(MSSQLBase):
    """통관 비용 상세 테이블 (MSSQL UNI_DebitNote.dbo.clearance)

    scheme_clearance와 1:1 관계 (scheme_clearance.id_clearance → clearance.id_clearance)
    모든 비용 컬럼은 float 타입 (VND 기준)
    """
    __tablename__ = "clearance"
    __table_args__ = {"schema": "dbo"}

    id_clearance = Column(Integer, primary_key=True, autoincrement=True)
    # --- 통관 비용 ---
    phi_thong_quan = Column(Float, nullable=True)
    phi_mo_tk_ngoai_gio = Column(Float, nullable=True)
    phi_sua_tk = Column(Float, nullable=True)
    phi_huy_tk = Column(Float, nullable=True)
    phi_kiem_hoa = Column(Float, nullable=True)
    phi_khai_hoa_chat = Column(Float, nullable=True)
    phi_gp_nk_tien_chat = Column(Float, nullable=True)
    phi_khac_inland = Column(Float, nullable=True)
    # --- 운송/물류 비용 ---
    phi_van_chuyen = Column(Float, nullable=True)
    phi_giao_hang_nhanh = Column(Float, nullable=True)
    phi_luu_cont = Column(Float, nullable=True)
    phi_do_cont_tuyen_dai = Column(Float, nullable=True)
    # --- 하역 비용 (Lift on/off) ---
    phi_nang = Column(Float, nullable=True)
    so_hd_nang_xuat_ve_uni = Column(String(255), nullable=True)
    phi_ha = Column(Float, nullable=True)
    so_hd_ha_xuat_ve_uni = Column(String(255), nullable=True)
    # --- 창고/인건비 ---
    phi_luu_kho = Column(Float, nullable=True)
    phi_nhan_cong = Column(Float, nullable=True)
    phi_chung_tu = Column(Float, nullable=True)
    phi_do_hang = Column(Float, nullable=True)
    # --- 운임/배송 ---
    of_af = Column(Float, nullable=True)
    phi_giao_tai_xuong = Column(Float, nullable=True)
    phi_giao_tai_diem_chi_dinh = Column(Float, nullable=True)
    phi_gh_chua_tra_thue = Column(Float, nullable=True)
    phi_gh_da_tra_thue = Column(Float, nullable=True)
    # --- 기타 비용 ---
    phi_xu_ly_hang_hoa = Column(Float, nullable=True)
    phi_khai_bao_hh_tu_dong = Column(Float, nullable=True)
    phu_phi_xang_dau = Column(Float, nullable=True)
    phu_phi_an_ninh = Column(Float, nullable=True)
    phi_soi_chieu = Column(Float, nullable=True)
    phi_bao_hiem_hang_hoa = Column(Float, nullable=True)
    phi_lenh_giao = Column(Float, nullable=True)
    phi_xu_ly = Column(Float, nullable=True)
    phi_boc_do_cont = Column(Float, nullable=True)
    phi_mat_can_bang_cont = Column(Float, nullable=True)
    phi_chi = Column(Float, nullable=True)
    lenh_giao = Column(Float, nullable=True)
    phi_phat_hanh_van_don = Column(Float, nullable=True)
    phi_ve_sinh = Column(Float, nullable=True)
    phi_kho_hang_le = Column(Float, nullable=True)
    phi_nhien_lieu_s = Column(Float, nullable=True)
    phi_tach_bill = Column(Float, nullable=True)
    phi_khac_local = Column(Float, nullable=True)
    # --- Pay-on 비용 (고객 대신 지불) ---
    phi_nang_pay_on = Column(Float, nullable=True)
    so_hd_nang_xuat_ve_khach_payon = Column(String(255), nullable=True)
    phi_ha_payon = Column(Float, nullable=True)
    so_hd_ha_xuat_ve_khach_payon = Column(String(255), nullable=True)
    phi_local = Column(Float, nullable=True)
    phi_ha_tang = Column(Float, nullable=True)
    phi_luu_kho_payon = Column(Float, nullable=True)
    phi_tk_payon = Column(Float, nullable=True)
    phi_khac_chi_ho = Column(Float, nullable=True)
    # --- 비고 ---
    ghi_chu = Column(String(255), nullable=True)
