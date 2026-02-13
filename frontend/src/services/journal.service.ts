import api from './api';

/** 분개장 목록 항목 */
export interface JournalListItem {
  entry_id: number;
  entry_number: string;
  module: string;
  fiscal_year: number;
  fiscal_month: number;
  entry_date: string;
  description_vn: string | null;
  description_kr: string | null;
  currency_code: string;
  total_debit: number;
  total_credit: number;
  status: string;
  source: string;
  vendor_id: string | null;
  customer_id: string | null;
  created_at: string;
}

/** 분개 상세 라인 */
export interface JournalLine {
  line_id: number;
  line_number: number;
  account_code: string;
  description_vn: string | null;
  description_en: string | null;
  debit_amount: number;
  credit_amount: number;
  vendor_id: string | null;
  customer_id: string | null;
  tax_code: string | null;
  tax_amount: number | null;
}

/** 분개 상세 */
export interface JournalDetail extends JournalListItem {
  voucher_date: string | null;
  description_en: string | null;
  exchange_rate: number | null;
  smartbooks_batch_nbr: string | null;
  employee_id: string | null;
  invoice_no: string | null;
  lines: JournalLine[];
}

/** 분개 요약 */
export interface JournalSummary {
  by_module: Record<string, number>;
  by_status: Record<string, number>;
  total_debit: number;
  total_credit: number;
  total_entries: number;
}

/** 분개 목록 조회 파라미터 */
export interface JournalListParams {
  page: number;
  size: number;
  module?: string;
  status?: string;
  fiscal_year?: number;
  search?: string;
}

/** 페이지네이션 응답 */
export interface PaginatedJournalResponse {
  items: JournalListItem[];
  total: number;
}

/** SmartBooks 임포트 결과 */
export interface ImportGltranResult {
  entries_created: number;
  lines_created: number;
  errors: string[];
  skipped: number;
}

/** 분개장(Journal Entries) API 서비스 */
export const journalService = {
  /** 분개 목록 조회 */
  getList: (params: JournalListParams): Promise<PaginatedJournalResponse> =>
    api.get('/api/v1/journal-entries', { params }).then(r => r.data),

  /** 분개 상세 조회 */
  getDetail: (entryId: number): Promise<JournalDetail> =>
    api.get(`/api/v1/journal-entries/${entryId}`).then(r => r.data),

  /** 분개 요약 통계 */
  getSummary: (fiscalYear?: number): Promise<JournalSummary> =>
    api.get('/api/v1/journal-entries/summary', {
      params: fiscalYear ? { fiscal_year: fiscalYear } : {},
    }).then(r => r.data),

  /** SmartBooks GLTran JSON 임포트 */
  importGltran: (rows: any[]): Promise<ImportGltranResult> =>
    api.post('/api/v1/journal-entries/import-gltran', rows).then(r => r.data),
};
