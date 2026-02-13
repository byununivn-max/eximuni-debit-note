import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { msalEnabled } from '../msalConfig';
import MsalLoginButton from '../components/MsalLoginButton';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [loading, setLoading] = useState(false);
  const { login, loginWithMsal } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success(t('common:message.loginSuccess'));
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMsalSuccess = async (accessToken: string) => {
    try {
      await loginWithMsal(accessToken);
      message.success(t('analytics:login.msLoginSuccess'));
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('analytics:login.msLoginFailed'));
    }
  };

  const handleMsalError = (error: Error) => {
    message.error(error.message || t('analytics:login.msLoginFailed'));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
    }}>
      <Card style={{ width: 420, borderRadius: 12 }} bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>{t('analytics:login.title')}</Title>
            <Text type="secondary">{t('analytics:login.subtitle')}</Text>
          </div>

          {/* Microsoft SSO 로그인 (MSAL 활성화 시) */}
          {msalEnabled && (
            <>
              <MsalLoginButton
                onSuccess={handleMsalSuccess}
                onError={handleMsalError}
              />
              <Divider plain>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('analytics:login.orDeveloperLogin')}</Text>
              </Divider>
            </>
          )}

          {/* 기존 username/password 로그인 */}
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: t('analytics:login.usernameRequired') }]}>
              <Input prefix={<UserOutlined />} placeholder={t('analytics:login.usernamePlaceholder')} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: t('analytics:login.passwordRequired') }]}>
              <Input.Password prefix={<LockOutlined />} placeholder={t('analytics:login.passwordPlaceholder')} />
            </Form.Item>
            <Form.Item>
              <Button type={msalEnabled ? 'default' : 'primary'} htmlType="submit" loading={loading} block>
                {t('common:button.login')}
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
