import api from './api';

/** 대시보드 KPI 응답 */
export interface DashboardKpi {
  total_selling_vnd: number;
  total_buying_vnd: number;
  gross_profit_vnd: number;
  gp_margin_pct: number;
  selling_count: number;
  buying_count: number;
}

/** 월별 추이 항목 */
export interface MonthlyTrendItem {
  month: number;
  selling: number;
  buying: number;
  profit: number;
}

/** 고객별 매출 항목 */
export interface CustomerProfitItem {
  customer_name: string;
  total_vnd: number;
  count: number;
}

export interface KpiParams {
  date_from?: string;
  date_to?: string;
}

/** 대시보드 API 서비스 */
export const dashboardService = {
  /** KPI 요약 조회 */
  getKpi: (params?: KpiParams): Promise<DashboardKpi> =>
    api.get('/api/v1/dashboard/kpi', { params }).then(r => r.data),

  /** 월별 매출/매입/이익 추이 */
  getMonthlyTrend: (year?: number): Promise<MonthlyTrendItem[]> =>
    api.get('/api/v1/dashboard/monthly-trend', {
      params: year ? { year } : {},
    }).then(r => r.data),

  /** 고객별 매출 TOP N */
  getCustomerProfit: (limit?: number): Promise<CustomerProfitItem[]> =>
    api.get('/api/v1/dashboard/customer-profit', {
      params: { limit: limit ?? 20 },
    }).then(r => r.data),
};
