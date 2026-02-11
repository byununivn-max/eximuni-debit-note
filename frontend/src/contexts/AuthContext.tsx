import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/auth';
import type { LoginRequest } from '../types';

interface UserInfo {
  user_id: number;
  username: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  msalEnabled: boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginWithMsal: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  msalEnabled: false,
  login: async () => {},
  loginWithMsal: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState<UserInfo | null>(authService.getUser());
  const [msalEnabled] = useState(() => {
    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
    const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
    return !!(clientId && tenantId);
  });

  const login = useCallback(async (data: LoginRequest) => {
    const token = await authService.login(data);
    setIsAuthenticated(true);
    setUser({ user_id: token.user_id, username: token.username, role: token.role });
  }, []);

  const loginWithMsal = useCallback(async (accessToken: string) => {
    // MSAL 토큰을 백엔드에 전달하여 사용자 정보 조회
    const userInfo = await authService.loginWithMsalToken(accessToken);
    setIsAuthenticated(true);
    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, msalEnabled, login, loginWithMsal, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
