import api from './api';

// ============================================================
// P&L 대시보드
// ============================================================

/** P&L 월별 항목 */
export interface PnLMonth {
  fiscal_month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gp_margin: number;
  operating_profit: number;
  net_profit: number;
  net_margin: number;
}

/** P&L 연간 요약 */
export interface PnLYearSummary {
  fiscal_year: number;
  months: PnLMonth[];
  ytd_revenue: number;
  ytd_cogs: number;
  ytd_gross_profit: number;
  ytd_gp_margin: number;
  ytd_operating_profit: number;
  ytd_net_profit: number;
  ytd_net_margin: number;
}

/** P&L 연산 결과 */
export interface PnLCalculateResult {
  months_calculated: number;
}

// ============================================================
// 고객별 수익성
// ============================================================

/** 고객별 수익 항목 */
export interface CustomerProfitability {
  customer_name: string;
  deal_count: number;
  total_selling: number;
  total_buying: number;
  gross_profit: number;
  gp_margin: number;
}

// ============================================================
// 건별 수익성
// ============================================================

/** 건별 수익 항목 */
export interface ShipmentProfit {
  selling_id: number;
  record_type: string;
  customer_name: string;
  invoice_no: string | null;
  service_date: string | null;
  selling_amount: number;
  buying_amount: number;
  gross_profit: number;
  gp_margin: number;
}

/** 건별 수익 페이지네이션 응답 */
export interface PaginatedShipmentProfit {
  items: ShipmentProfit[];
  total: number;
}

/** 건별 수익 파라미터 */
export interface ShipmentProfitParams {
  page: number;
  size: number;
  customer_name?: string;
  year?: number;
  month?: number;
}

// ============================================================
// 견적-실적 비교
// ============================================================

/** 견적-실적 비교 항목 */
export interface QuotationActual {
  comparison_id: number;
  mssql_shipment_ref: string | null;
  customer_id: number | null;
  customer_name: string | null;
  service_type: string;
  quotation_amount: number;
  actual_selling: number;
  actual_buying: number;
  variance_selling: number;
  variance_buying: number;
  variance_gp: number;
  invoice_no: string | null;
  analysis_date: string | null;
  notes: string | null;
}

/** 견적-실적 요약 */
export interface QuotationSummary {
  total_count: number;
  total_quotation: number;
  total_selling: number;
  total_buying: number;
  total_gp: number;
  variance_selling: number;
  variance_gp: number;
  accuracy_rate: number;
}

/** 견적-실적 생성 입력값 */
export interface QuotationCreateInput {
  customer_name: string;
  service_type?: string;
  quotation_amount?: number;
  actual_selling?: number;
  actual_buying?: number;
  invoice_no?: string;
  notes?: string;
}

// ============================================================
// 재무제표 (Financial Reports)
// ============================================================

/** 대차대조표 데이터 (간이 타입) */
export interface BalanceSheetData {
  assets: {
    total_assets: number;
    current_assets: number;
    noncurrent_assets: number;
    details: any[];
  };
  liabilities: {
    total_liabilities: number;
    current_liabilities: number;
    noncurrent_liabilities: number;
    details: any[];
  };
  equity: {
    total_equity: number;
    details: any[];
  };
  balance_check: number;
}

/** 손익계산서 데이터 (간이 타입) */
export interface IncomeStatementData {
  period: string;
  revenue: {
    gross_revenue: number;
    deductions: number;
    net_revenue: number;
  };
  cogs: number;
  gross_profit: number;
  operating_expenses: { selling: number; admin: number };
  operating_profit: number;
  financial: { income: number; expense: number };
  other: { income: number; expense: number };
  profit_before_tax: number;
  income_tax: number;
  net_profit: number;
}

/** GL 상세 항목 */
export interface GLDetailItem {
  line_id: number;
  entry_number: string;
  entry_date: string;
  module: string;
  account_code: string;
  counter_account: string;
  description: string;
  debit: number;
  credit: number;
}

/** GL 상세 페이지네이션 응답 */
export interface PaginatedGLDetail {
  items: GLDetailItem[];
  total: number;
}

/** AR/AP 연령분석 항목 */
export interface AgingItem {
  customer_id?: string;
  customer_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  receivable?: number;
  payable?: number;
}

/** 분석 API 서비스 */
export const analyticsService = {
  // --- P&L ---
  /** P&L 연간 요약 조회 */
  getPnLYearSummary: (fiscalYear: number): Promise<PnLYearSummary> =>
    api.get('/api/v1/pnl/year-summary', {
      params: { fiscal_year: fiscalYear },
    }).then(r => r.data),

  /** P&L 연간 계산 실행 */
  calculatePnLYear: (fiscalYear: number): Promise<PnLCalculateResult> =>
    api.post('/api/v1/pnl/calculate-year', null, {
      params: { fiscal_year: fiscalYear },
    }).then(r => r.data),

  // --- 고객별 수익성 ---
  /** 고객별 수익성 랭킹 */
  getCustomerProfitability: (params: {
    limit?: number;
    year?: number;
    month?: number;
  }): Promise<CustomerProfitability[]> =>
    api.get('/api/v1/profitability/by-customer', { params }).then(r => r.data),

  // --- 건별 수익성 ---
  /** 건별 수익 목록 (페이지네이션) */
  getShipmentProfit: (
    params: ShipmentProfitParams,
  ): Promise<PaginatedShipmentProfit> =>
    api.get('/api/v1/profitability/by-shipment', { params }).then(r => r.data),

  // --- 견적-실적 비교 ---
  /** 견적-실적 목록 조회 */
  getQuotationComparisons: (params: {
    page?: number;
    size?: number;
    year?: number;
    service_type?: string;
    customer_name?: string;
  }): Promise<QuotationActual[]> =>
    api.get('/api/v1/quotation-comparison', { params }).then(r => r.data),

  /** 견적-실적 요약 */
  getQuotationSummary: (year?: number): Promise<QuotationSummary> =>
    api.get('/api/v1/quotation-comparison/summary', {
      params: year ? { year } : {},
    }).then(r => r.data),

  /** 견적-실적 생성 */
  createQuotationComparison: (
    data: QuotationCreateInput,
  ): Promise<QuotationActual> =>
    api.post('/api/v1/quotation-comparison', data).then(r => r.data),

  // --- 재무제표 ---
  /** 대차대조표 조회 */
  getBalanceSheet: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<BalanceSheetData> =>
    api.get('/api/v1/reports/balance-sheet', { params }).then(r => r.data),

  /** 손익계산서 조회 */
  getIncomeStatement: (params: {
    fiscal_year: number;
    fiscal_month?: number;
  }): Promise<IncomeStatementData> =>
    api.get('/api/v1/reports/income-statement', { params }).then(r => r.data),

  /** GL 상세 원장 조회 */
  getGLDetail: (params: {
    fiscal_year: number;
    fiscal_month?: number;
    account_code?: string;
    page: number;
    size: number;
  }): Promise<PaginatedGLDetail> =>
    api.get('/api/v1/reports/gl-detail', { params }).then(r => r.data),

  /** AR 연령분석 */
  getARaging: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<AgingItem[]> =>
    api.get('/api/v1/reports/ar-aging', { params }).then(r => r.data),

  /** AP 연령분석 */
  getAPaging: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<AgingItem[]> =>
    api.get('/api/v1/reports/ap-aging', { params }).then(r => r.data),
};
