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
export interface MonthlyCostSummaryItem {
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

/** 비용 유형별 소계 */
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
