/** 대시보드 KPI */
export interface Kpi {
  total_selling_vnd: number;
  total_buying_vnd: number;
  gross_profit_vnd: number;
  gp_margin_pct: number;
  selling_count: number;
  buying_count: number;
}

/** 월별 추이 항목 */
export interface MonthlyItem {
  month: number;
  selling: number;
  buying: number;
  profit: number;
}

/** 고객별 매출 항목 */
export interface CustomerItem {
  customer_name: string;
  total_vnd: number;
  count: number;
}
