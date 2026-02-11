import api from './api';
import type { LoginRequest, TokenResponse, UserInfo } from '../types';

export const authService = {
  /**
   * 기존 username/password 로그인 (개발/테스트용)
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/api/v1/auth/login', data);
    const token = res.data;
    localStorage.setItem('access_token', token.access_token);
    localStorage.setItem('refresh_token', token.refresh_token);
    localStorage.setItem('auth_mode', 'jwt');
    localStorage.setItem('user', JSON.stringify({
      user_id: token.user_id,
      username: token.username,
      role: token.role,
    }));
    return token;
  },

  /**
   * MSAL 토큰으로 로그인 — Azure AD 토큰을 백엔드에 전달
   */
  async loginWithMsalToken(msalAccessToken: string): Promise<{ user_id: number; username: string; role: string; email?: string; full_name?: string }> {
    // MSAL 토큰을 Bearer로 설정하고 /me 호출
    localStorage.setItem('access_token', msalAccessToken);
    localStorage.setItem('auth_mode', 'msal');

    try {
      const res = await api.get<UserInfo>('/api/v1/auth/me');
      const userInfo = {
        user_id: (res.data as any).user_id,
        username: (res.data as any).username,
        role: (res.data as any).role_name || (res.data as any).role,
        email: (res.data as any).email,
        full_name: (res.data as any).full_name,
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      return userInfo;
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_mode');
      throw err;
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_mode');
    localStorage.removeItem('user');
  },

  async getMe(): Promise<UserInfo> {
    const res = await api.get<UserInfo>('/api/v1/auth/me');
    return res.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getAuthMode(): 'msal' | 'jwt' | null {
    return localStorage.getItem('auth_mode') as 'msal' | 'jwt' | null;
  },

  getUser(): { user_id: number; username: string; role: string } | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};
