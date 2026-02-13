/**
 * 역할별 라우트 접근 권한 매핑
 * admin: 전체 접근
 * accountant: 회계 포함, 감사이력 제외
 * pic: 운영/매매 + 분석 일부 + 마스터 일부
 */
export type UserRole = 'admin' | 'accountant' | 'pic';

const ROLE_ROUTE_MAP: Record<UserRole, string[]> = {
  admin: ['*'],
  accountant: [
    '/',
    '/shipments', '/clearance', '/ops', '/co',
    '/selling-records', '/debit-notes', '/suppliers', '/purchase-orders',
    '/chart-of-accounts', '/journal-entries', '/trial-balance',
    '/financial-reports', '/accounting-vendors', '/accounting-customers',
    '/smartbooks-import',
    '/pnl-dashboard', '/profit-dashboard', '/customer-profitability',
    '/shipment-profit', '/quotation-comparison',
    '/cost-classifications', '/monthly-cost-summary',
    '/clients', '/fiscal-periods', '/exchange-rates',
  ],
  pic: [
    '/',
    '/shipments', '/clearance', '/ops', '/co',
    '/selling-records', '/debit-notes', '/suppliers', '/purchase-orders',
    '/pnl-dashboard', '/profit-dashboard', '/customer-profitability',
    '/shipment-profit', '/quotation-comparison',
    '/clients', '/exchange-rates',
  ],
};

/**
 * 주어진 역할이 해당 경로에 접근 가능한지 확인
 */
export const hasRouteAccess = (role: string, path: string): boolean => {
  const routes = ROLE_ROUTE_MAP[role as UserRole];
  if (!routes) return false;
  if (routes.includes('*')) return true;
  return routes.includes(path);
};
