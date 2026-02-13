/** 매출 세부 항목 */
export interface SellingItem {
  item_id: number;
  selling_id: number;
  fee_name: string;
  fee_category?: string;
  amount: number;
  currency: string;
  mssql_source_column?: string;
}

/** 매출 기록 */
export interface SellingRecord {
  selling_id: number;
  record_type: string;
  mssql_source_id: number;
  mssql_cost_id?: number;
  customer_name?: string;
  invoice_no?: string;
  service_date?: string;
  total_selling_vnd: number;
  item_count: number;
  sync_status: string;
  synced_at: string;
  items?: SellingItem[];
}

/** 매출 요약 항목 */
export interface SellingSummaryItem {
  record_type: string;
  count: number;
  total_vnd: number;
}

/** 매출 전체 요약 */
export interface SellingSummary {
  items: SellingSummaryItem[];
  grand_total_vnd: number;
  total_records: number;
}
