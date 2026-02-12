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
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { msalEnabled } from '../msalConfig';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
      label: '홈',
      children: [
        { key: '/', icon: <PieChartOutlined />, label: '매출/매입 현황' },
      ],
    },
    {
      key: 'grp-operations',
      icon: <GlobalOutlined />,
      label: '운영',
      children: [
        { key: '/shipments', icon: <ContainerOutlined />, label: '거래 데이터' },
        { key: '/clearance', icon: <SafetyCertificateOutlined />, label: 'CD 통관' },
        { key: '/ops', icon: <ToolOutlined />, label: 'Ops 운영' },
        { key: '/co', icon: <AuditOutlined />, label: 'CO 원산지' },
      ],
    },
    {
      key: 'grp-trading',
      icon: <DollarOutlined />,
      label: '매매 관리',
      children: [
        { key: '/selling-records', icon: <FundOutlined />, label: '매출 종합' },
        { key: '/debit-notes', icon: <FileTextOutlined />, label: 'Debit Note' },
        { key: '/suppliers', icon: <ShopOutlined />, label: '공급사' },
        { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '매입 관리' },
      ],
    },
    {
      key: 'grp-accounting',
      icon: <AccountBookOutlined />,
      label: '회계',
      children: [
        { key: '/chart-of-accounts', icon: <AccountBookOutlined />, label: '계정과목' },
        { key: '/journal-entries', icon: <BookOutlined />, label: '분개전표' },
        { key: '/trial-balance', icon: <CalculatorOutlined />, label: '시산표' },
        { key: '/financial-reports', icon: <SolutionOutlined />, label: '재무제표' },
        { key: '/accounting-vendors', icon: <ShopOutlined />, label: 'AP 공급사' },
        { key: '/accounting-customers', icon: <UserSwitchOutlined />, label: 'AR 고객' },
        { key: '/smartbooks-import', icon: <DatabaseOutlined />, label: 'SB 임포트' },
      ],
    },
    {
      key: 'grp-analytics',
      icon: <BarChartOutlined />,
      label: '분석/보고서',
      children: [
        { key: '/pnl-dashboard', icon: <FundOutlined />, label: 'P&L 손익' },
        { key: '/profit-dashboard', icon: <PieChartOutlined />, label: '수익성 분석' },
        { key: '/customer-profitability', icon: <TrophyOutlined />, label: '고객 수익성' },
        { key: '/shipment-profit', icon: <ContainerOutlined />, label: '건별 수익성' },
        { key: '/quotation-comparison', icon: <SwapOutlined />, label: '견적-실적 비교' },
        { key: '/cost-classifications', icon: <AppstoreOutlined />, label: '비용 분류' },
        { key: '/monthly-cost-summary', icon: <CalculatorOutlined />, label: '월별 비용 집계' },
      ],
    },
    {
      key: 'grp-master',
      icon: <DatabaseOutlined />,
      label: '마스터 데이터',
      children: [
        { key: '/clients', icon: <TeamOutlined />, label: '거래처 관리' },
        { key: '/fiscal-periods', icon: <CalendarOutlined />, label: '회계기간' },
        { key: '/exchange-rates', icon: <DollarOutlined />, label: '환율 관리' },
      ],
    },
    {
      key: 'grp-admin',
      icon: <SettingOutlined />,
      label: '관리자',
      children: [
        { key: '/audit-logs', icon: <HistoryOutlined />, label: '감사 이력' },
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
            <Tag color={roleColor}>{user?.role?.toUpperCase()}</Tag>
            <Text strong>{user?.username}</Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              로그아웃
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
