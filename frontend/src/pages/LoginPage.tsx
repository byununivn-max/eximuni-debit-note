import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { msalEnabled } from '../msalConfig';
import MsalLoginButton from '../components/MsalLoginButton';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login, loginWithMsal } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('로그인 성공');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleMsalSuccess = async (accessToken: string) => {
    try {
      await loginWithMsal(accessToken);
      message.success('Microsoft 로그인 성공');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Microsoft 로그인 실패');
    }
  };

  const handleMsalError = (error: Error) => {
    message.error(error.message || 'Microsoft 로그인 실패');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
    }}>
      <Card style={{ width: 420, borderRadius: 12 }} bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>EXIMUNI</Title>
            <Text type="secondary">ERP System</Text>
          </div>

          {/* Microsoft SSO 로그인 (MSAL 활성화 시) */}
          {msalEnabled && (
            <>
              <MsalLoginButton
                onSuccess={handleMsalSuccess}
                onError={handleMsalError}
              />
              <Divider plain>
                <Text type="secondary" style={{ fontSize: 12 }}>또는 개발자 로그인</Text>
              </Divider>
            </>
          )}

          {/* 기존 username/password 로그인 */}
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '사용자명을 입력하세요' }]}>
              <Input prefix={<UserOutlined />} placeholder="사용자명" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
            </Form.Item>
            <Form.Item>
              <Button type={msalEnabled ? 'default' : 'primary'} htmlType="submit" loading={loading} block>
                로그인
              </Button>
            </Form.Item>
          </Form>

          {!msalEnabled && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              admin / admin123 | accountant1 / account123 | pic1 / pic123
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
