import { ObjectId } from 'mongodb';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
  email?: string;
  isAdmin?: boolean;
  role?: UserRole;
  fullName?: string;
  department?: string;
}

export interface UserWithoutPassword {
  id: string;
  username: string;
  createdAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
  email: string | null;
  isAdmin: boolean;
  role: UserRole;
  fullName?: string;
  department?: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  isAdmin?: boolean;
  role?: UserRole;
  fullName?: string;
  department?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  password?: string;
  role?: UserRole;
  fullName?: string;
  department?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserWithoutPassword;
}

export interface TokenPayload {
  userId: string;
  username: string;
}

export function sanitizeUser(user: User): UserWithoutPassword {
  const role: UserRole = user.role ?? (user.isAdmin ? 'admin' : 'viewer');
  return {
    id: user._id?.toString() || '',
    username: user.username,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isActive: user.isActive,
    email: user.email ?? null,
    isAdmin: role === 'admin',
    role,
    fullName: user.fullName,
    department: user.department
  };
}

