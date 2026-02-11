"""MSSQL debit_sharepoint 테이블 모델 — Debit Note 메인 테이블 (96개 컬럼)"""
from sqlalchemy import Column, Integer, String, Date, Text
from app.core.database import MSSQLBase


class MssqlDebitSharepoint(MSSQLBase):
    """Debit Note SharePoint 테이블 (MSSQL UNI_DebitNote.dbo.debit_sharepoint)

    선적/통관 건별 마스터 테이블. 6,309건.
    대부분의 컬럼이 nvarchar(510)으로 문자열 저장 (숫자도 문자열로 저장됨)
    """
    __tablename__ = "debit_sharepoint"
    __table_args__ = {"schema": "dbo"}

    id_invoice = Column(Integer, primary_key=True, autoincrement=True)
    # --- 기본 정보 ---
    invoice = Column(String(255), nullable=True)
    invoice_date = Column(Date, nullable=True)
    packing_list = Column(String(255), nullable=True)
    bl = Column(String(255), nullable=True)
    co = Column(String(255), nullable=True)
    im_ex = Column(String(255), nullable=True)
    freight = Column(String(255), nullable=True)
    # --- 비용 ---
    korea_local_charge = Column(String(255), nullable=True)
    vn_lcc_total_fee = Column(String(255), nullable=True)
    input_invoice_for_uni = Column(String(225), nullable=True)
    # --- 상태/고객 ---
    debit_status = Column(String(255), nullable=True)
    arrival_date = Column(Date, nullable=True)
    cargo_cutoff_time = Column(Date, nullable=True)
    clients = Column(String(255), nullable=True)
    booking = Column(String(255), nullable=True)
    # --- 통관 정보 ---
    ma_loai_hinh = Column(String(255), nullable=True)
    vd_hbl = Column(String(255), nullable=True)
    so_luong_kien = Column(String(255), nullable=True)
    tong_tri_gia_hoa_don = Column(String(255), nullable=True)
    tri_gia_kb = Column(String(255), nullable=True)
    tong_tri_gia_tt = Column(String(255), nullable=True)
    tong_thue_vat = Column(String(255), nullable=True)
    tong_trong_luong_hang = Column(String(255), nullable=True)
    phan_luong = Column(String(255), nullable=True)
    dieu_kien_gia_hoa_don = Column(String(255), nullable=True)
    cd_status = Column(String(255), nullable=True)
    phi_csht = Column(String(255), nullable=True)
    # --- 컨테이너 ---
    cont_40_20 = Column(String(255), nullable=True)
    so_luong_cont = Column(String(255), nullable=True)
    # --- Lift on/off ---
    lift_on = Column(String(255), nullable=True)
    lift_on_invoice = Column(String(255), nullable=True)
    lift_off = Column(String(255), nullable=True)
    lift_off_invoice = Column(String(255), nullable=True)
    # --- 기타 비용 ---
    inspection_fee = Column(String(255), nullable=True)
    detention_fee = Column(String(255), nullable=True)
    chi_ho_khac = Column(String(255), nullable=True)
    hoa_don_chi_ho_khac = Column(String(255), nullable=True)
    phi_hai_quan = Column(String(255), nullable=True)
    phi_lam_hang = Column(String(255), nullable=True)
    cang_ha = Column(String(255), nullable=True)
    phi_tach_bill = Column(String(255), nullable=True)
    hoa_don_tach_bill = Column(String(255), nullable=True)
    phi_luu_kho = Column(String(255), nullable=True)
    hoa_don_luu_kho = Column(String(255), nullable=True)
    le_phi_to_khai = Column(String(255), nullable=True)
    so_giay_nop_tien = Column(String(255), nullable=True)
    phi_kiem_hoa = Column(String(255), nullable=True)
    dien_giai = Column(String(255), nullable=True)
    phu_cap = Column(String(255), nullable=True)
    usd_rate = Column(String(255), nullable=True)
    # --- 운송 방식 ---
    phuong_thuc_van_chuyen = Column(String(255), nullable=True)
    air = Column(String(255), nullable=True)
    lcl_cbm = Column(String(255), nullable=True)
    # --- Debit ---
    debit_invoice = Column(String(255), nullable=True)
    date_of_debit_pay = Column(Date, nullable=True)
    # --- 담당자 ---
    forward = Column(String(255), nullable=True)
    operation = Column(String(255), nullable=True)
    trucking = Column(String(255), nullable=True)
    trang_thai_lo_hang = Column(String(255), nullable=True)
    phi_kiem_hoa_confirm = Column(String(255), nullable=True)
    chi_phi_khac = Column(String(255), nullable=True)
    # --- Local charges ---
    do = Column(String(255), nullable=True)
    handling_fee = Column(String(255), nullable=True)
    customs_clearance = Column(String(255), nullable=True)
    hdc = Column(String(255), nullable=True)
    thc = Column(String(255), nullable=True)
    cleaning_fee = Column(String(255), nullable=True)
    cic = Column(String(255), nullable=True)
    cfs = Column(String(255), nullable=True)
    lss = Column(String(255), nullable=True)
    seal_fee = Column(String(255), nullable=True)
    bl_fee = Column(String(255), nullable=True)
    telex_fee = Column(String(255), nullable=True)
    cont_number = Column(String(255), nullable=True)
    phi_di_ly = Column(String(255), nullable=True)
    phi_ha_xa = Column(String(255), nullable=True)
    phu_phi_cont_kiem_hoa = Column(String(255), nullable=True)
    phi_kiem_tra_chat_luong = Column(String(255), nullable=True)
    ghi_chu_kien_hang = Column(String(255), nullable=True)
    ghi_chu_cont = Column(String(255), nullable=True)
    # --- 날짜/선적 ---
    etd = Column(Date, nullable=True)
    ngay_giao = Column(Date, nullable=True)
    forward_other_fee = Column(String(255), nullable=True)
    phi_van_chuyen_trucking = Column(String(255), nullable=True)
    hbl_date = Column(Date, nullable=True)
    booking_date = Column(Date, nullable=True)
    mbl = Column(String(255), nullable=True)
    mbl_date = Column(String(255), nullable=True)
    tk_tai_cho = Column(String(255), nullable=True)
    arrival_notice = Column(String(255), nullable=True)
    # --- CO ---
    co_date = Column(Date, nullable=True)
    co_form = Column(String(255), nullable=True)
    # --- 통관 상세 ---
    ma_dia_diem_do_hang = Column(String(255), nullable=True)
    ten_dia_diem_do_hang = Column(String(255), nullable=True)
    ma_dia_diem_xep_hang = Column(String(255), nullable=True)
    loai_tk = Column(String(255), nullable=True)
    so_tk = Column(String(255), nullable=True)
    so_tk_dau_tien = Column(String(255), nullable=True)
    ngay_tk = Column(String(255), nullable=True)
    neo_xe = Column(String(255), nullable=True)
    phi_utm = Column(String(255), nullable=True)
    xuat_nhap_tc = Column(String(255), nullable=True)
    # --- LCL/FCL ---
    lcl_air = Column(String(255), nullable=True)
    lcl_sea = Column(String(255), nullable=True)
    fcl_20 = Column(String(255), nullable=True)
    fcl_40 = Column(String(255), nullable=True)
    # --- Ops/연결 ---
    ops_pay = Column(String(255), nullable=True)
    map_an = Column(String(255), nullable=True)
    liquidation = Column(String(255), nullable=True)
    id_dong_hang = Column(String(255), nullable=True)
    clearance = Column(String(255), nullable=True)
    vessel = Column(String(255), nullable=True)
