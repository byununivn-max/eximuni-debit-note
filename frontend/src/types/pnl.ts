/** P&L 월별 항목 */
export interface PnLMonth {
  fiscal_month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gp_margin: number;
  operating_profit: number;
  net_profit: number;
  net_margin: number;
}

/** P&L 연간 요약 */
export interface YearSummary {
  fiscal_year: number;
  months: PnLMonth[];
  ytd_revenue: number;
  ytd_cogs: number;
  ytd_gross_profit: number;
  ytd_gp_margin: number;
  ytd_operating_profit: number;
  ytd_net_profit: number;
  ytd_net_margin: number;
}
