import api from './api';

// ============================================================
// 계정과목 (Chart of Accounts)
// ============================================================

/** 계정과목 항목 */
export interface CoAItem {
  account_id: number;
  account_code: string;
  account_name_vn: string;
  account_name_en: string;
  account_name_kr: string;
  account_type: string;
  account_group: string;
  normal_balance: string;
  is_active: boolean;
  smartbooks_mapped: boolean;
}

/** 계정과목 트리 노드 */
export interface CoATreeNode extends CoAItem {
  children: CoATreeNode[];
}

/** 비용센터 항목 */
export interface CostCenterItem {
  center_id: number;
  center_code: string;
  center_name_vn: string;
  center_name_en: string;
  center_name_kr: string;
  center_type: string;
  is_active: boolean;
}

/** 계정과목 요약 */
export interface CoASummary {
  by_type: Record<string, number>;
  total: number;
}

/** 시딩 결과 */
export interface SeedResult {
  chart_of_accounts: { created: number; skipped: number };
  cost_centers: { created: number; skipped: number };
}

// ============================================================
// 회계기간 (Fiscal Periods)
// ============================================================

/** 회계기간 항목 */
export interface FiscalPeriodItem {
  period_id: number;
  fiscal_year: number;
  period_month: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
}

/** 회계기간 생성 결과 */
export interface FiscalPeriodGenerateResult {
  created: number;
  skipped: number;
}

// ============================================================
// 거래처 (Vendors / Customers)
// ============================================================

/** 회계 거래처(AP) 항목 */
export interface AccountingVendorItem {
  vendor_id: number;
  tax_id: string;
  vendor_name_vn: string | null;
  vendor_name_en: string | null;
  mssql_supplier_ref: number | null;
  default_ap_account: string;
  currency_code: string;
  source: string;
  is_active: boolean;
}

/** 회계 고객(AR) 항목 */
export interface AccountingCustomerItem {
  customer_id: number;
  tax_id: string;
  customer_name_vn: string | null;
  customer_name_en: string | null;
  mssql_client_ref: number | null;
  default_ar_account: string;
  default_revenue_account: string;
  currency_code: string;
  source: string;
  is_active: boolean;
}

/** 추출 결과 */
export interface ExtractResult {
  created: number;
  skipped: number;
}

/** 매칭 결과 */
export interface MatchResult {
  matched: number;
  unmatched: number;
}

// ============================================================
// 시산표 (Trial Balance)
// ============================================================

/** 시산표 항목 */
export interface TrialBalanceItem {
  account_code: string;
  account_name_kr: string | null;
  account_name_en: string | null;
  account_type: string | null;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

/** 시산표 데이터 */
export interface TrialBalanceData {
  fiscal_year: number;
  fiscal_month: number;
  items: TrialBalanceItem[];
  totals: TrialBalanceItem;
}

/** 페이지네이션 응답 (회계 공통) */
export interface PaginatedAccountingResponse<T> {
  items: T[];
  total: number;
}

/** 거래처 목록 파라미터 */
export interface VendorListParams {
  page: number;
  size: number;
  search?: string;
  is_mapped?: boolean;
}

/** 고객 목록 파라미터 */
export interface CustomerListParams {
  page: number;
  size: number;
  search?: string;
  is_mapped?: boolean;
}

/** 회계 API 서비스 */
export const accountingService = {
  // --- 계정과목 ---
  /** 계정과목 목록 조회 */
  getChartOfAccounts: (params?: {
    account_type?: string;
    search?: string;
  }): Promise<CoAItem[]> =>
    api.get('/api/v1/chart-of-accounts', { params }).then(r => r.data),

  /** 계정과목 트리 조회 */
  getChartOfAccountsTree: (): Promise<CoATreeNode[]> =>
    api.get('/api/v1/chart-of-accounts/tree').then(r => r.data),

  /** 비용센터 목록 조회 */
  getCostCenters: (): Promise<CostCenterItem[]> =>
    api.get('/api/v1/chart-of-accounts/cost-centers/list').then(r => r.data),

  /** 계정과목 요약 */
  getCoASummary: (): Promise<CoASummary> =>
    api.get('/api/v1/chart-of-accounts/summary').then(r => r.data),

  /** 계정과목 + 비용센터 시딩 */
  seedChartOfAccounts: (): Promise<SeedResult> =>
    api.post('/api/v1/chart-of-accounts/seed').then(r => r.data),

  // --- 회계기간 ---
  /** 회계기간 목록 조회 */
  getFiscalPeriods: (year: number): Promise<{ items: FiscalPeriodItem[] }> =>
    api.get('/api/v1/fiscal-periods', { params: { year } }).then(r => r.data),

  /** 회계기간 자동 생성 */
  generateFiscalPeriods: (year: number): Promise<FiscalPeriodGenerateResult> =>
    api.post(`/api/v1/fiscal-periods/generate?year=${year}`).then(r => r.data),

  /** 회계기간 마감 */
  closeFiscalPeriod: (periodId: number): Promise<void> =>
    api.post(`/api/v1/fiscal-periods/${periodId}/close`).then(r => r.data),

  /** 회계기간 재개 */
  reopenFiscalPeriod: (periodId: number): Promise<void> =>
    api.post(`/api/v1/fiscal-periods/${periodId}/reopen`).then(r => r.data),

  // --- 거래처 (AP) ---
  /** AP 거래처 목록 */
  getVendors: (
    params: VendorListParams,
  ): Promise<PaginatedAccountingResponse<AccountingVendorItem>> =>
    api.get('/api/v1/accounting-vendors', { params }).then(r => r.data),

  /** AP 거래처 분개에서 추출 */
  extractVendorsFromJournal: (): Promise<ExtractResult> =>
    api.post('/api/v1/accounting-vendors/extract-from-journal').then(r => r.data),

  /** AP 거래처 공급사 매칭 */
  matchVendorsToSuppliers: (): Promise<MatchResult> =>
    api.post('/api/v1/accounting-vendors/match-suppliers').then(r => r.data),

  // --- 고객 (AR) ---
  /** AR 고객 목록 */
  getCustomers: (
    params: CustomerListParams,
  ): Promise<PaginatedAccountingResponse<AccountingCustomerItem>> =>
    api.get('/api/v1/accounting-customers', { params }).then(r => r.data),

  /** AR 고객 분개에서 추출 */
  extractCustomersFromJournal: (): Promise<ExtractResult> =>
    api.post('/api/v1/accounting-customers/extract-from-journal').then(r => r.data),

  // --- 시산표 ---
  /** 시산표 조회 */
  getTrialBalance: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<TrialBalanceData> =>
    api.get('/api/v1/account-balances/trial-balance', { params }).then(r => r.data),
};
