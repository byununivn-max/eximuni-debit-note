import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
    }}>
      <Card style={{ width: 400, borderRadius: 12 }} bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>EXIMUNI</Title>
            <Text type="secondary">Debit Note System</Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '사용자명을 입력하세요' }]}>
              <Input prefix={<UserOutlined />} placeholder="사용자명" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                로그인
              </Button>
            </Form.Item>
          </Form>
          <Text type="secondary" style={{ fontSize: 12 }}>
            admin / admin123 | accountant1 / account123 | pic1 / pic123
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
