import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { useTranslation } from 'react-i18next';
import './i18n';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, msalEnabled } from './msalConfig';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { hasRouteAccess } from './config/rolePermissions';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import DebitNotesPage from './pages/DebitNotesPage';
import ExchangeRatesPage from './pages/ExchangeRatesPage';
import ClearancePage from './pages/ClearancePage';
import OpsPage from './pages/OpsPage';
import COPage from './pages/COPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import SellingRecordsPage from './pages/SellingRecordsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ProfitDashboardPage from './pages/ProfitDashboardPage';
import ChartOfAccountsPage from './pages/ChartOfAccountsPage';
import FiscalPeriodsPage from './pages/FiscalPeriodsPage';
import JournalEntriesPage from './pages/JournalEntriesPage';
import SmartBooksImportPage from './pages/SmartBooksImportPage';
import AccountingVendorsPage from './pages/AccountingVendorsPage';
import AccountingCustomersPage from './pages/AccountingCustomersPage';
import TrialBalancePage from './pages/TrialBalancePage';
import CostClassificationsPage from './pages/CostClassificationsPage';
import MonthlyCostSummaryPage from './pages/MonthlyCostSummaryPage';
import PnLDashboardPage from './pages/PnLDashboardPage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import ShipmentProfitPage from './pages/ShipmentProfitPage';
import QuotationComparisonPage from './pages/QuotationComparisonPage';
import FinancialReportsPage from './pages/FinancialReportsPage';

// MSAL 인스턴스 (조건부 생성)
const msalInstance = msalEnabled ? new PublicClientApplication(msalConfig) : null;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/** 역할 기반 라우트 보호 — 권한 없으면 403 페이지 */
const RoleProtectedRoute: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const { user } = useAuth();
  const role = user?.role || 'pic';
  return hasRouteAccess(role, path) ? <>{children}</> : <ForbiddenPage />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<RoleProtectedRoute path="/"><DashboardPage /></RoleProtectedRoute>} />
        <Route path="clients" element={<RoleProtectedRoute path="/clients"><ClientsPage /></RoleProtectedRoute>} />
        <Route path="shipments" element={<RoleProtectedRoute path="/shipments"><ShipmentsPage /></RoleProtectedRoute>} />
        <Route path="clearance" element={<RoleProtectedRoute path="/clearance"><ClearancePage /></RoleProtectedRoute>} />
        <Route path="ops" element={<RoleProtectedRoute path="/ops"><OpsPage /></RoleProtectedRoute>} />
        <Route path="co" element={<RoleProtectedRoute path="/co"><COPage /></RoleProtectedRoute>} />
        <Route path="suppliers" element={<RoleProtectedRoute path="/suppliers"><SuppliersPage /></RoleProtectedRoute>} />
        <Route path="purchase-orders" element={<RoleProtectedRoute path="/purchase-orders"><PurchaseOrdersPage /></RoleProtectedRoute>} />
        <Route path="selling-records" element={<RoleProtectedRoute path="/selling-records"><SellingRecordsPage /></RoleProtectedRoute>} />
        <Route path="debit-notes" element={<RoleProtectedRoute path="/debit-notes"><DebitNotesPage /></RoleProtectedRoute>} />
        <Route path="exchange-rates" element={<RoleProtectedRoute path="/exchange-rates"><ExchangeRatesPage /></RoleProtectedRoute>} />
        <Route path="profit-dashboard" element={<RoleProtectedRoute path="/profit-dashboard"><ProfitDashboardPage /></RoleProtectedRoute>} />
        <Route path="chart-of-accounts" element={<RoleProtectedRoute path="/chart-of-accounts"><ChartOfAccountsPage /></RoleProtectedRoute>} />
        <Route path="fiscal-periods" element={<RoleProtectedRoute path="/fiscal-periods"><FiscalPeriodsPage /></RoleProtectedRoute>} />
        <Route path="journal-entries" element={<RoleProtectedRoute path="/journal-entries"><JournalEntriesPage /></RoleProtectedRoute>} />
        <Route path="smartbooks-import" element={<RoleProtectedRoute path="/smartbooks-import"><SmartBooksImportPage /></RoleProtectedRoute>} />
        <Route path="accounting-vendors" element={<RoleProtectedRoute path="/accounting-vendors"><AccountingVendorsPage /></RoleProtectedRoute>} />
        <Route path="accounting-customers" element={<RoleProtectedRoute path="/accounting-customers"><AccountingCustomersPage /></RoleProtectedRoute>} />
        <Route path="trial-balance" element={<RoleProtectedRoute path="/trial-balance"><TrialBalancePage /></RoleProtectedRoute>} />
        <Route path="cost-classifications" element={<RoleProtectedRoute path="/cost-classifications"><CostClassificationsPage /></RoleProtectedRoute>} />
        <Route path="monthly-cost-summary" element={<RoleProtectedRoute path="/monthly-cost-summary"><MonthlyCostSummaryPage /></RoleProtectedRoute>} />
        <Route path="pnl-dashboard" element={<RoleProtectedRoute path="/pnl-dashboard"><PnLDashboardPage /></RoleProtectedRoute>} />
        <Route path="customer-profitability" element={<RoleProtectedRoute path="/customer-profitability"><ProfitabilityPage /></RoleProtectedRoute>} />
        <Route path="shipment-profit" element={<RoleProtectedRoute path="/shipment-profit"><ShipmentProfitPage /></RoleProtectedRoute>} />
        <Route path="quotation-comparison" element={<RoleProtectedRoute path="/quotation-comparison"><QuotationComparisonPage /></RoleProtectedRoute>} />
        <Route path="financial-reports" element={<RoleProtectedRoute path="/financial-reports"><FinancialReportsPage /></RoleProtectedRoute>} />
        <Route path="audit-logs" element={<RoleProtectedRoute path="/audit-logs"><AuditLogsPage /></RoleProtectedRoute>} />
      </Route>
    </Routes>
  );
};

const antdLocaleMap: Record<string, typeof koKR> = { ko: koKR, en: enUS, vi: viVN };

const AppContent: React.FC = () => {
  const { i18n } = useTranslation();
  const antdLocale = antdLocaleMap[i18n.language] || antdLocaleMap[i18n.language?.split('-')[0]] || koKR;

  return (
    <ErrorBoundary>
      <ConfigProvider locale={antdLocale}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  // MSAL 활성화 시 MsalProvider로 래핑
  if (msalEnabled && msalInstance) {
    return (
      <MsalProvider instance={msalInstance}>
        <AppContent />
      </MsalProvider>
    );
  }

  // MSAL 미설정 시 기존 방식
  return <AppContent />;
};

export default App;
