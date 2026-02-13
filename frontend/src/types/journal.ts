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

/** 분개장 라인 */
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

/** 분개장 상세 (목록 항목 + 추가 필드) */
export interface JournalDetail extends JournalListItem {
  voucher_date: string | null;
  description_en: string | null;
  exchange_rate: number | null;
  smartbooks_batch_nbr: string | null;
  employee_id: string | null;
  invoice_no: string | null;
  lines: JournalLine[];
}

/** 분개장 요약 통계 */
export interface JournalSummary {
  by_module: Record<string, number>;
  by_status: Record<string, number>;
  total_debit: number;
  total_credit: number;
  total_entries: number;
}
