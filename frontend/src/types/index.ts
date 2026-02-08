export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: string;
}

export interface UserInfo {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role_name: string;
  is_active: boolean;
}

export interface Client {
  client_id: number;
  client_code: string;
  client_name: string;
  client_name_en?: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
  currency: string;
  complexity: string;
  batch?: string;
  structure_type?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeDetail {
  detail_id?: number;
  fee_item_id: number;
  amount_usd: number;
  amount_vnd: number;
  currency: string;
  is_tax_inclusive: boolean;
  pre_tax_amount?: number;
  notes?: string;
}

export interface Shipment {
  shipment_id: number;
  client_id: number;
  shipment_type: string;
  delivery_date?: string;
  invoice_no?: string;
  mbl?: string;
  hbl?: string;
  term?: string;
  no_of_pkgs?: number;
  gross_weight?: number;
  chargeable_weight?: number;
  cd_no?: string;
  cd_type?: string;
  air_ocean_rate?: string;
  origin_destination?: string;
  note?: string;
  source_app?: string;
  status: string;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
  fee_details: FeeDetail[];
}

export interface DebitNoteLine {
  line_id: number;
  shipment_id: number;
  line_no?: number;
  total_usd: number;
  total_vnd: number;
  vat_amount: number;
  grand_total_vnd: number;
  freight_usd: number;
  local_charges_usd: number;
}

export interface DebitNote {
  debit_note_id: number;
  debit_note_number?: string;
  client_id: number;
  client_name?: string;
  period_from: string;
  period_to: string;
  billing_date?: string;
  total_usd: number;
  total_vnd: number;
  total_vat: number;
  grand_total_vnd: number;
  exchange_rate?: number;
  status: string;
  sheet_type?: string;
  total_lines: number;
  created_by?: number;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  lines: DebitNoteLine[];
}

export interface WorkflowEntry {
  workflow_id: number;
  action: string;
  from_status?: string;
  to_status?: string;
  performed_by?: number;
  comment?: string;
  created_at: string;
}

export interface ExchangeRate {
  rate_id: number;
  currency_from: string;
  currency_to: string;
  rate: number;
  rate_date: string;
  source?: string;
}

export interface FeeCategory {
  category_id: number;
  category_code: string;
  category_name: string;
  category_name_vi?: string;
  category_name_ko?: string;
  is_vat_applicable: boolean;
  vat_rate?: number;
  fee_items: FeeItem[];
}

export interface FeeItem {
  fee_item_id: number;
  item_code: string;
  item_name: string;
  is_vat_applicable: boolean;
  vat_rate?: number;
  is_tax_inclusive: boolean;
  sort_order: number;
}

export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}
