import api from './api';

/** 매출 항목 */
export interface SellingItem {
  item_id: number;
  selling_id: number;
  fee_name: string;
  fee_category?: string;
  amount: number;
  currency: string;
  mssql_source_column?: string;
}

/** 매출 레코드 */
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

/** 매출 요약 */
export interface SellingSummary {
  items: SellingSummaryItem[];
  grand_total_vnd: number;
  total_records: number;
}

/** 동기화 결과 */
export interface SyncResult {
  total_synced: number;
  clearance_count: number;
  ops_count: number;
  co_count: number;
  errors: string[];
}

/** 매출 목록 조회 파라미터 */
export interface SellingListParams {
  skip: number;
  limit: number;
  search?: string;
  record_type?: string;
  date_from?: string;
  date_to?: string;
}

/** 매출 페이지네이션 응답 */
export interface PaginatedSellingResponse {
  items: SellingRecord[];
  total: number;
}

/** 매출(Selling Records) API 서비스 */
export const sellingService = {
  /** 매출 목록 조회 */
  getList: (params: SellingListParams): Promise<PaginatedSellingResponse> =>
    api.get('/api/v1/selling-records', { params }).then(r => r.data),

  /** 매출 상세 조회 */
  getDetail: (sellingId: number): Promise<SellingRecord> =>
    api.get(`/api/v1/selling-records/${sellingId}`).then(r => r.data),

  /** 매출 요약 통계 */
  getSummary: (dateRange?: { date_from: string; date_to: string }): Promise<SellingSummary> =>
    api.get('/api/v1/selling-records/summary', {
      params: dateRange || {},
    }).then(r => r.data),

  /** MSSQL -> PG 동기화 실행 */
  sync: (): Promise<SyncResult> =>
    api.post('/api/v1/selling-records/sync').then(r => r.data),
};
