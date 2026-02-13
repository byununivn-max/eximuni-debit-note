/** 견적-실적 비교 항목 */
export interface QuotationActual {
  comparison_id: number;
  mssql_shipment_ref: string | null;
  customer_id: number | null;
  customer_name: string | null;
  service_type: string;
  quotation_amount: number;
  actual_selling: number;
  actual_buying: number;
  variance_selling: number;
  variance_buying: number;
  variance_gp: number;
  invoice_no: string | null;
  analysis_date: string | null;
  notes: string | null;
}

/** 견적-실적 요약 */
export interface QuotationSummary {
  total_count: number;
  total_quotation: number;
  total_selling: number;
  total_buying: number;
  total_gp: number;
  variance_selling: number;
  variance_gp: number;
  accuracy_rate: number;
}
