import api from './api';
import type { LoginRequest, TokenResponse, UserInfo } from '../types';

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/api/v1/auth/login', data);
    const token = res.data;
    localStorage.setItem('access_token', token.access_token);
    localStorage.setItem('refresh_token', token.refresh_token);
    localStorage.setItem('user', JSON.stringify({
      user_id: token.user_id,
      username: token.username,
      role: token.role,
    }));
    return token;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  async getMe(): Promise<UserInfo> {
    const res = await api.get<UserInfo>('/api/v1/auth/me');
    return res.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getUser(): { user_id: number; username: string; role: string } | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};
