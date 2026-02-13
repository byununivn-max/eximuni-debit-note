/** 공급사 */
export interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  supplier_type: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
  bank_account?: string;
  bank_name?: string;
  payment_terms?: string;
  currency: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 매입주문 항목 */
export interface PurchaseItem {
  item_id?: number;
  po_id?: number;
  description: string;
  cost_category?: string;
  quantity: number;
  unit_price: number;
  currency: string;
  amount: number;
  is_vat_applicable: boolean;
  notes?: string;
}

/** 매입주문 */
export interface PurchaseOrder {
  po_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  mssql_shipment_ref?: number;
  service_type?: string;
  invoice_no?: string;
  invoice_date?: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  amount_vnd?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount: number;
  payment_status: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  created_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseItem[];
}

/** 공급사 요약 (셀렉트박스 용) */
export interface SupplierOption {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
}
