import { API_URL } from './api/base';

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

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserManagementVisibilityUser {
  fullName?: string | null;
  username?: string | null;
}

const USERS_TAB_ALLOWED_FULL_NAME = 'HENRIQUE DO VALE ROCHA FILHO';

function normalizeAccessValue(value?: string | null) {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function canAccessUserManagement(user?: UserManagementVisibilityUser | null) {
  return normalizeAccessValue(user?.fullName) === USERS_TAB_ALLOWED_FULL_NAME;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
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

  return response.json();
}

export async function getCurrentUser(): Promise<User> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token não encontrado');
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar usuário atual');
  }

  const data = await response.json();
  return data.user;
}

export async function logout(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(err => console.error('Logout request failed:', err));
  }
  
  removeAuthToken();
}

export async function requestPasswordReset(institutionalEmail: string, personalEmail: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ institutionalEmail, personalEmail })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = typeof data?.error === 'string' ? data.error : 'Erro ao solicitar recuperação de senha';
    throw new Error(message);
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token, password })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = typeof data?.error === 'string' ? data.error : 'Erro ao redefinir senha';
    throw new Error(message);
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
