import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';
import { getUserById } from '../services/users.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        isAdmin: boolean;
        role: 'admin' | 'editor' | 'viewer';
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const user = await getUserById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    const role = user.role ?? (user.isAdmin ? 'admin' : 'viewer');
    req.user = {
      userId: payload.userId,
      username: payload.username,
      isAdmin: role === 'admin',
      role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
}

// Middleware opcional para autenticação (não retorna erro se não autenticado)
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      const user = await getUserById(payload.userId);
      if (user && user.isActive) {
        const role = user.role ?? (user.isAdmin ? 'admin' : 'viewer');
        req.user = {
          userId: payload.userId,
          username: payload.username,
          isAdmin: role === 'admin',
          role
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso permitido apenas para administradores' });
  }

  next();
}

