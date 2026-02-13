import React, { useState } from 'react';
import { Layout, Menu, Typography, Button, Space, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ContainerOutlined,
  FileTextOutlined,
  DollarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  AuditOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  FundOutlined,
  PieChartOutlined,
  AccountBookOutlined,
  CalendarOutlined,
  BookOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  CalculatorOutlined,
  UserSwitchOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  TrophyOutlined,
  SwapOutlined,
  SolutionOutlined,
  GlobalOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { msalEnabled } from '../msalConfig';
import LanguageSwitcher from './LanguageSwitcher';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation('menu');

  const handleLogout = async () => {
    // MSAL 모드에서 로그아웃 시 MSAL 세션도 정리
    if (msalEnabled && authService.getAuthMode() === 'msal') {
      try {
        const { PublicClientApplication } = await import('@azure/msal-browser');
        const { msalConfig } = await import('../msalConfig');
        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        await msalInstance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });
      } catch (err) {
        console.error('MSAL logout error:', err);
      }
    }
    logout();
    navigate('/login');
  };

  // 경로 → 그룹 매핑 (현재 경로 기반 SubMenu 자동 펼침)
  const routeToGroup: Record<string, string> = {
    '/': 'grp-home',
    '/shipments': 'grp-operations',
    '/clearance': 'grp-operations',
    '/ops': 'grp-operations',
    '/co': 'grp-operations',
    '/selling-records': 'grp-trading',
    '/debit-notes': 'grp-trading',
    '/suppliers': 'grp-trading',
    '/purchase-orders': 'grp-trading',
    '/chart-of-accounts': 'grp-accounting',
    '/journal-entries': 'grp-accounting',
    '/trial-balance': 'grp-accounting',
    '/financial-reports': 'grp-accounting',
    '/accounting-vendors': 'grp-accounting',
    '/accounting-customers': 'grp-accounting',
    '/smartbooks-import': 'grp-accounting',
    '/pnl-dashboard': 'grp-analytics',
    '/profit-dashboard': 'grp-analytics',
    '/customer-profitability': 'grp-analytics',
    '/shipment-profit': 'grp-analytics',
    '/quotation-comparison': 'grp-analytics',
    '/cost-classifications': 'grp-analytics',
    '/monthly-cost-summary': 'grp-analytics',
    '/clients': 'grp-master',
    '/fiscal-periods': 'grp-master',
    '/exchange-rates': 'grp-master',
    '/audit-logs': 'grp-admin',
  };

  const defaultOpenGroup =
    routeToGroup[location.pathname] || 'grp-home';

  const menuItems = [
    {
      key: 'grp-home',
      icon: <DashboardOutlined />,
      label: t('home'),
      children: [
        { key: '/', icon: <PieChartOutlined />, label: t('salesOverview') },
      ],
    },
    {
      key: 'grp-operations',
      icon: <GlobalOutlined />,
      label: t('operations'),
      children: [
        { key: '/shipments', icon: <ContainerOutlined />, label: t('shipments') },
        { key: '/clearance', icon: <SafetyCertificateOutlined />, label: t('clearance') },
        { key: '/ops', icon: <ToolOutlined />, label: t('ops') },
        { key: '/co', icon: <AuditOutlined />, label: t('co') },
      ],
    },
    {
      key: 'grp-trading',
      icon: <DollarOutlined />,
      label: t('trading'),
      children: [
        { key: '/selling-records', icon: <FundOutlined />, label: t('sellingRecords') },
        { key: '/debit-notes', icon: <FileTextOutlined />, label: t('debitNotes') },
        { key: '/suppliers', icon: <ShopOutlined />, label: t('suppliers') },
        { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: t('purchaseOrders') },
      ],
    },
    {
      key: 'grp-accounting',
      icon: <AccountBookOutlined />,
      label: t('accounting'),
      children: [
        { key: '/chart-of-accounts', icon: <AccountBookOutlined />, label: t('chartOfAccounts') },
        { key: '/journal-entries', icon: <BookOutlined />, label: t('journalEntries') },
        { key: '/trial-balance', icon: <CalculatorOutlined />, label: t('trialBalance') },
        { key: '/financial-reports', icon: <SolutionOutlined />, label: t('financialReports') },
        { key: '/accounting-vendors', icon: <ShopOutlined />, label: t('accountingVendors') },
        { key: '/accounting-customers', icon: <UserSwitchOutlined />, label: t('accountingCustomers') },
        { key: '/smartbooks-import', icon: <DatabaseOutlined />, label: t('smartbooksImport') },
      ],
    },
    {
      key: 'grp-analytics',
      icon: <BarChartOutlined />,
      label: t('analytics'),
      children: [
        { key: '/pnl-dashboard', icon: <FundOutlined />, label: t('pnlDashboard') },
        { key: '/profit-dashboard', icon: <PieChartOutlined />, label: t('profitDashboard') },
        { key: '/customer-profitability', icon: <TrophyOutlined />, label: t('customerProfitability') },
        { key: '/shipment-profit', icon: <ContainerOutlined />, label: t('shipmentProfit') },
        { key: '/quotation-comparison', icon: <SwapOutlined />, label: t('quotationComparison') },
        { key: '/cost-classifications', icon: <AppstoreOutlined />, label: t('costClassifications') },
        { key: '/monthly-cost-summary', icon: <CalculatorOutlined />, label: t('monthlyCostSummary') },
      ],
    },
    {
      key: 'grp-master',
      icon: <DatabaseOutlined />,
      label: t('masterData'),
      children: [
        { key: '/clients', icon: <TeamOutlined />, label: t('clients') },
        { key: '/fiscal-periods', icon: <CalendarOutlined />, label: t('fiscalPeriods') },
        { key: '/exchange-rates', icon: <DollarOutlined />, label: t('exchangeRates') },
      ],
    },
    {
      key: 'grp-admin',
      icon: <SettingOutlined />,
      label: t('admin'),
      children: [
        { key: '/audit-logs', icon: <HistoryOutlined />, label: t('auditLogs') },
      ],
    },
  ];

  const roleColor = user?.role === 'admin' ? 'red' : user?.role === 'accountant' ? 'blue' : 'green';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Text strong style={{ color: '#fff', fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? 'EXI' : 'EXIMUNI ERP'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={[defaultOpenGroup]}
          items={menuItems}
          onClick={({ key }) => {
            if (!key.startsWith('grp-')) navigate(key);
          }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <LanguageSwitcher />
            <Tag color={roleColor}>{user?.role?.toUpperCase()}</Tag>
            <Text strong>{user?.username}</Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              {t('common:button.logout')}
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
