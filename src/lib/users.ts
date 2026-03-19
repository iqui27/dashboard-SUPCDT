import { getAuthHeaders } from './auth';
import { API_URL } from './api/base';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  isAdmin: boolean;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  fullName?: string | null;
  department?: string | null;
}

export interface CreateAdminUserInput {
  username: string;
  password: string;
  email?: string;
  isAdmin?: boolean;
  role?: UserRole;
  fullName?: string;
  department?: string;
}

export interface UpdateAdminUserInput {
  username?: string;
  email?: string;
  isAdmin?: boolean;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  fullName?: string;
  department?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = typeof data?.error === 'string' ? data.error : 'Erro ao comunicar com o servidor';
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch(`${API_URL}/auth/users`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  });

  const data = await handleResponse<{ users: AdminUser[] }>(response);
  return data.users;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/auth/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  const data = await handleResponse<{ user: AdminUser }>(response);
  return data.user;
}

export async function updateAdminUser(id: string, input: UpdateAdminUserInput): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/auth/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  const data = await handleResponse<{ user: AdminUser }>(response);
  return data.user;
}
