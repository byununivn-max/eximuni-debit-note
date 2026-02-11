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
        <Route path="debit-notes" element={<DebitNotesPage />} />
        <Route path="exchange-rates" element={<ExchangeRatesPage />} />
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
