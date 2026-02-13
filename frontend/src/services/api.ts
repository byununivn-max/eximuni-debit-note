import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// 요청 인터셉터: 토큰 자동 첨부 (MSAL 또는 JWT)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: X-Request-ID 포함 에러 + 401 시 로그아웃
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestId = error.response?.headers?.['x-request-id'];
    if (requestId) {
      error.requestId = requestId;
      if (error.response?.data) {
        error.response.data.request_id = requestId;
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_mode');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
