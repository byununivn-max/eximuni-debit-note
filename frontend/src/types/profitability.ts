/** 고객별 수익성 */
export interface CustomerProfit {
  customer_name: string;
  deal_count: number;
  total_selling: number;
  total_buying: number;
  gross_profit: number;
  gp_margin: number;
}

/** 건별 수익성 */
export interface ShipmentProfit {
  selling_id: number;
  record_type: string;
  customer_name: string;
  invoice_no: string | null;
  service_date: string | null;
  selling_amount: number;
  buying_amount: number;
  gross_profit: number;
  gp_margin: number;
}
