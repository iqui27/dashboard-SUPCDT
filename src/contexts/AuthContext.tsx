import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface User {
  id: string;
  username: string;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
  email: string | null;
  isAdmin: boolean;
  role: 'admin' | 'editor' | 'viewer';
  department?: string;
  fullName?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requirePasswordChange?: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao fazer login');
    }

    const data = await response.json();
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        logout();
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to check authentication:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextValue = {
    user,
    token: localStorage.getItem('auth_token'),
    isAuthenticated: !!user,
    isLoading,
    requirePasswordChange: false,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

