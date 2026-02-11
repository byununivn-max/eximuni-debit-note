import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, msalEnabled } from './msalConfig';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
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

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="clearance" element={<ClearancePage />} />
        <Route path="ops" element={<OpsPage />} />
        <Route path="co" element={<COPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="selling-records" element={<SellingRecordsPage />} />
        <Route path="debit-notes" element={<DebitNotesPage />} />
        <Route path="exchange-rates" element={<ExchangeRatesPage />} />
        <Route path="profit-dashboard" element={<ProfitDashboardPage />} />
        <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
        <Route path="fiscal-periods" element={<FiscalPeriodsPage />} />
        <Route path="journal-entries" element={<JournalEntriesPage />} />
        <Route path="smartbooks-import" element={<SmartBooksImportPage />} />
        <Route path="accounting-vendors" element={<AccountingVendorsPage />} />
        <Route path="accounting-customers" element={<AccountingCustomersPage />} />
        <Route path="trial-balance" element={<TrialBalancePage />} />
        <Route path="cost-classifications" element={<CostClassificationsPage />} />
        <Route path="monthly-cost-summary" element={<MonthlyCostSummaryPage />} />
        <Route path="pnl-dashboard" element={<PnLDashboardPage />} />
        <Route path="customer-profitability" element={<ProfitabilityPage />} />
        <Route path="shipment-profit" element={<ShipmentProfitPage />} />
        <Route path="quotation-comparison" element={<QuotationComparisonPage />} />
        <Route path="financial-reports" element={<FinancialReportsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>
    </Routes>
  );
};

const AppContent: React.FC = () => (
  <ConfigProvider locale={koKR}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </ConfigProvider>
);

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
