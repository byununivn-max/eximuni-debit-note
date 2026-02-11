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
  HistoryOutlined,
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

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/clients', icon: <TeamOutlined />, label: '거래처 관리' },
    { key: '/shipments', icon: <ContainerOutlined />, label: '거래 데이터' },
    { key: '/clearance', icon: <SafetyCertificateOutlined />, label: 'CD 통관' },
    { key: '/ops', icon: <ToolOutlined />, label: 'Ops 운영' },
    { key: '/co', icon: <AuditOutlined />, label: 'CO 원산지' },
    { key: '/suppliers', icon: <ShopOutlined />, label: '공급사' },
    { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '매입 관리' },
    { key: '/selling-records', icon: <FundOutlined />, label: '매출 종합' },
    { key: '/profit-dashboard', icon: <PieChartOutlined />, label: '수익성 분석' },
    { key: '/debit-notes', icon: <FileTextOutlined />, label: 'Debit Note' },
    { key: '/exchange-rates', icon: <DollarOutlined />, label: '환율 관리' },
    { key: '/audit-logs', icon: <HistoryOutlined />, label: '감사 이력' },
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
          items={menuItems}
          onClick={({ key }) => navigate(key)}
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
