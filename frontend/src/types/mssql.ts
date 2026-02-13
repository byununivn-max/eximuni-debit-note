/**
 * MSSQL 레거시 데이터 TypeScript 인터페이스 (Sprint 2)
 *
 * 백엔드 schemas/mssql.py 응답 스키마와 1:1 매핑
 */

// ============================================================
// Client (clients 테이블)
// ============================================================
export interface MssqlClient {
  id_clients: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  clients_type?: string;
  phone_number?: string;
  active?: boolean;
}

export interface MssqlClientDetail extends MssqlClient {
  gender?: string;
  language?: string;
  note?: string;
  service?: string;
  subscribe?: boolean;
  position?: string;
  industry?: string;
  fdi?: string;
  province?: string;
  key_contact?: boolean;
  campaign?: string;
}

// ============================================================
// Scheme Clearance + Clearance (통관)
// ============================================================
export interface MssqlSchemeClearance {
  id_scheme_cd: number;
  id_clearance?: number;
  invoice?: string;
  invoice_date?: string;
  im_ex?: string;
  arrival_date?: string;
  company?: string;
  hbl?: string;
  phan_luong?: string;
  vessel?: string;
  so_tk?: string;
  is_active?: boolean;
}

export interface MssqlClearanceDetail {
  id_clearance: number;
  phi_thong_quan?: number;
  phi_kiem_hoa?: number;
  phi_van_chuyen?: number;
  phi_luu_cont?: number;
  phi_nang?: number;
  phi_ha?: number;
  phi_luu_kho?: number;
  of_af?: number;
  phi_tach_bill?: number;
  ghi_chu?: string;
  phi_mo_tk_ngoai_gio?: number;
  phi_sua_tk?: number;
  phi_huy_tk?: number;
  phi_khai_hoa_chat?: number;
  phi_gp_nk_tien_chat?: number;
  phi_khac_inland?: number;
  phi_giao_hang_nhanh?: number;
  phi_do_cont_tuyen_dai?: number;
  phi_nhan_cong?: number;
  phi_chung_tu?: number;
  phi_do_hang?: number;
  phi_giao_tai_xuong?: number;
  phi_giao_tai_diem_chi_dinh?: number;
  phi_xu_ly_hang_hoa?: number;
  phu_phi_xang_dau?: number;
  phu_phi_an_ninh?: number;
  phi_soi_chieu?: number;
  phi_bao_hiem_hang_hoa?: number;
  phi_khac_local?: number;
  phi_nang_pay_on?: number;
  phi_ha_payon?: number;
  phi_local?: number;
  phi_khac_chi_ho?: number;
}

// ============================================================
// Debit Sharepoint (선적/Debit Note 메인)
// ============================================================
export interface MssqlDebitSharepoint {
  id_invoice: number;
  invoice?: string;
  invoice_date?: string;
  bl?: string;
  im_ex?: string;
  clients?: string;
  debit_status?: string;
  arrival_date?: string;
  phuong_thuc_van_chuyen?: string;
  forward?: string;
  operation?: string;
  so_tk?: string;
  booking?: string;
  mbl?: string;
  hbl?: string;
}

// ============================================================
// Scheme Ops + Ops (운영)
// ============================================================
export interface MssqlSchemeOps {
  id_scheme_ops: number;
  id_ops?: number;
  name?: string;
  create_at?: string;
  type?: string;
  customer?: string;
  so_cont?: string;
  so_tk?: string;
  phan_luong?: string;
  so_invoice?: string;
  hbl?: string;
  mbl?: string;
  is_active?: boolean;
}

export interface MssqlOpsDetail {
  id_ops: number;
  customs_clearance_fee?: number;
  inspection?: number;
  le_phi_tk?: number;
  thue_nhap_khau?: number;
  bien_lai?: string;
  phi_tach_bill?: number;
  hoa_don_tach_bill?: string;
  phu_cap_cho_ops?: number;
  cang_ha?: string;
  phi_luu_cont?: number;
  hoa_don_phi_luu_con?: string;
  phi_luu_kho?: number;
  hoa_don_luu_kho?: string;
  phi_lam_hang?: number;
  note?: string;
  phi_co_a_thai?: number;
  phi_co_c_thao?: number;
}

// ============================================================
// Scheme CO + CO + Contract (원산지 증명)
// ============================================================
export interface MssqlSchemeCo {
  id_scheme_co: string;
  id_co?: number;
  form?: string;
  so_co?: string;
  ngay_cap?: string;
  so_invoice?: string;
  so_to_khai?: string;
  ten_kh?: string;
  is_active?: boolean;
  note?: string;
}

export interface MssqlContract {
  id_contract: number;
  ten_khach?: string;
  co_fee?: string;
  amount?: number;
}

export interface MssqlCoWithContract {
  id_co: number;
  id_contract?: number;
  le_phi_co?: number;
  le_phi_bo_cong_thuong?: number;
  phi_cap_moi_cap_lai?: string;
  note?: string;
  trang_thai?: string;
  phi_dv_sua_doi?: number;
  contract?: MssqlContract;
}

// ============================================================
// Customer Forms (동적 폼 + 자동입력)
// ============================================================
export interface MssqlCustomerClearance {
  id_customer: number;
  name_customer?: string;
  inputs?: string; // JSON 문자열
}

export interface MssqlCustomerConfig {
  id: number;
  customer: string;
  co_cd_type?: string;
  form_type?: string;
  phan_luong?: string;
  field_name: string;
  field_value?: number;
  priority?: number;
  is_active?: boolean;
}

// ============================================================
// 페이지네이션 (공통)
// ============================================================
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}
