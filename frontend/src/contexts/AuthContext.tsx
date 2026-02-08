import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import type { LoginRequest } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  user: { user_id: number; username: string; role: string } | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getUser());

  const login = async (data: LoginRequest) => {
    const token = await authService.login(data);
    setIsAuthenticated(true);
    setUser({ user_id: token.user_id, username: token.username, role: token.role });
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
