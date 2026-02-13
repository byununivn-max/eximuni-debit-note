import api from './api';

/** 비용 분류 항목 */
export interface ClassificationItem {
  classification_id: number;
  account_code: string;
  cost_type: string;
  cost_category: string;
  allocation_method: string;
  cost_center_code: string | null;
  description_vn: string | null;
  description_en: string | null;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

/** 월별 비용 집계 항목 */
export interface MonthlySummaryItem {
  summary_id: number;
  fiscal_year: number;
  fiscal_month: number;
  account_code: string;
  cost_type: string;
  cost_center_code: string | null;
  total_amount: number;
  daily_allocated_amount: number;
  working_days: number;
}

/** 비용 유형별 집계 */
export interface CostByType {
  cost_type: string;
  total_amount: number;
  daily_allocated: number;
  account_count: number;
}

/** 월별 비용 개요 */
export interface MonthlyCostOverview {
  fiscal_year: number;
  fiscal_month: number;
  working_days: number;
  by_type: CostByType[];
  grand_total: number;
  grand_daily: number;
}

/** 비용 분류 목록 응답 */
export interface ClassificationListResponse {
  items: ClassificationItem[];
  total: number;
}

/** 월별 비용 목록 응답 */
export interface MonthlySummaryListResponse {
  items: MonthlySummaryItem[];
  total: number;
}

/** 월별 계산 결과 */
export interface CalculateMonthlyResult {
  accounts_processed: number;
  days_in_month: number;
}

/** 비용 분류 목록 파라미터 */
export interface ClassificationListParams {
  cost_type?: string;
}

/** 월별 비용 목록 파라미터 */
export interface MonthlySummaryParams {
  fiscal_year: number;
  fiscal_month: number;
  cost_type?: string;
}

/** 비용 분류 + 월별 비용 집계 API 서비스 */
export const costService = {
  /** 비용 분류 목록 조회 */
  getClassifications: (
    params?: ClassificationListParams,
  ): Promise<ClassificationListResponse> =>
    api.get('/api/v1/cost-classifications', { params }).then(r => r.data),

  /** 비용 분류 시딩 */
  seedClassifications: (): Promise<any> =>
    api.post('/api/v1/cost-classifications/seed').then(r => r.data),

  /** 월별 비용 집계 목록 조회 */
  getMonthlySummary: (
    params: MonthlySummaryParams,
  ): Promise<MonthlySummaryListResponse> =>
    api.get('/api/v1/cost-classifications/monthly-summary', { params })
      .then(r => r.data),

  /** 월별 비용 개요 */
  getMonthlyOverview: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<MonthlyCostOverview> =>
    api.get('/api/v1/cost-classifications/monthly-overview', { params })
      .then(r => r.data),

  /** 월별 비용 계산 실행 */
  calculateMonthly: (params: {
    fiscal_year: number;
    fiscal_month: number;
  }): Promise<CalculateMonthlyResult> =>
    api.post('/api/v1/cost-classifications/calculate-monthly', null, { params })
      .then(r => r.data),
};
