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

/** AP 거래처 */
export interface VendorItem {
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

/** AR 고객 */
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

/** 시산표 항목 */
export interface TrialItem {
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
export interface TrialData {
  fiscal_year: number;
  fiscal_month: number;
  items: TrialItem[];
  totals: TrialItem;
}

/** 회계기간 */
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

/** 워크플로우 항목 */
export interface WorkflowItem {
  workflow_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  from_status?: string;
  to_status?: string;
  performed_by?: number;
  comment?: string;
  created_at: string;
}

/** 감사 로그 항목 */
export interface AuditLogItem {
  audit_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  performed_by?: number;
  ip_address?: string;
  action_at: string;
}

/** SmartBooks 미리보기 행 */
export interface SmartBooksPreviewRow {
  Module: string;
  'Batch Nbr': string;
  'Ref Nbr': string;
  'Acct Period': string;
  'Voucher Date': string;
  Account: string;
  'Dr Amount': number;
  'Cr Amount': number;
  'Description VN': string;
  [key: string]: any;
}

/** SmartBooks 임포트 결과 */
export interface SmartBooksImportResult {
  entries_created: number;
  lines_created: number;
  errors: string[];
  skipped: number;
}
