import React, { useState } from 'react';
import { Button, message } from 'antd';
import { WindowsOutlined } from '@ant-design/icons';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';

interface MsalLoginButtonProps {
  onSuccess: (accessToken: string) => void;
  onError: (error: Error) => void;
}

/**
 * MsalLoginButton Component
 *
 * Extracts MSAL login logic from LoginPage to fix React Rules of Hooks violation.
 * This component always calls useMsal() unconditionally (hooks-safe since it's only rendered when msalEnabled).
 */
const MsalLoginButton: React.FC<MsalLoginButtonProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const { instance } = useMsal();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      if (result.accessToken) {
        onSuccess(result.accessToken);
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      console.error('MSAL login error:', err);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      icon={<WindowsOutlined />}
      loading={loading}
      onClick={handleLogin}
      block
      size="large"
      style={{ height: 48, fontSize: 16 }}
    >
      Microsoft 계정으로 로그인
    </Button>
  );
};

export default MsalLoginButton;
