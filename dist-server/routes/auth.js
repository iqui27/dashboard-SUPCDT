import express from 'express';
import { getUserByUsername, getUserByEmail, getUserByIdentifier, updateLastLogin, listUsers, createUser, updateUser } from '../services/users.js';
import { comparePassword, generateToken } from '../services/auth.js';
import { sanitizeUser } from '../types/user.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../services/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';
const router = express.Router();
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username e password são obrigatórios' });
        }
        const user = await getUserByIdentifier(username);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        if (!user.isActive) {
            return res.status(401).json({ error: 'Usuário inativo' });
        }
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const userId = user._id?.toString() || '';
        const token = generateToken({
            userId,
            username: user.username
        });
        // Atualizar último login
        await updateLastLogin(userId);
        const sanitizedUser = sanitizeUser(user);
        return res.json({
            token,
            user: sanitizedUser
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Erro ao fazer login' });
    }
});
// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        const user = await getUserByUsername(req.user.username);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        return res.json({ user: sanitizeUser(user) });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});
// POST /api/auth/logout
router.post('/logout', requireAuth, async (_req, res) => {
    // Com JWT stateless, logout é feito no cliente removendo o token
    // Aqui podemos implementar blacklist de tokens se necessário
    return res.json({ message: 'Logout realizado com sucesso' });
});
// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
        }
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        const user = await getUserByUsername(req.user.username);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        // Importar dinamicamente para evitar circular dependency
        const { changePassword } = await import('../services/users.js');
        await changePassword(req.user.userId, newPassword);
        return res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});
export const authRouter = router;
// Admin-only user management routes
router.get('/users', requireAuth, requireAdmin, async (_req, res) => {
    try {
        const users = await listUsers();
        return res.json({ users });
    }
    catch (error) {
        console.error('List users error:', error);
        return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, password, email, isAdmin, role, fullName, department } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios' });
        }
        const user = await createUser({ username, password, email, isAdmin, role, fullName, department });
        return res.status(201).json({ user });
    }
    catch (error) {
        console.error('Create user error:', error);
        const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
        return res.status(400).json({ error: message });
    }
});
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, isAdmin, isActive, password, role, fullName, department } = req.body;
        console.log('PATCH /users/:id received:', {
            id,
            username,
            email,
            isAdmin,
            isActive,
            password: password ? '[REDACTED]' : undefined,
            role,
            fullName,
            department
        });
        if (typeof username === 'undefined' &&
            !email &&
            typeof isAdmin === 'undefined' &&
            typeof isActive === 'undefined' &&
            !password &&
            typeof role === 'undefined' &&
            typeof fullName === 'undefined' &&
            typeof department === 'undefined') {
            return res.status(400).json({ error: 'Nenhuma alteração informada' });
        }
        const user = await updateUser(id, { username, email, isAdmin, role, isActive, password, fullName, department });
        console.log('User updated successfully:', user);
        return res.json({ user });
    }
    catch (error) {
        console.error('Update user error:', error);
        const status = error instanceof Error && /não encontrado/i.test(error.message) ? 404 : 400;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar usuário';
        return res.status(status).json({ error: message });
    }
});
// Password recovery
router.post('/forgot-password', async (req, res) => {
    const { institutionalEmail, personalEmail } = req.body;
    if (!institutionalEmail) {
        return res.status(400).json({ error: 'E-mail institucional é obrigatório' });
    }
    if (!personalEmail) {
        return res.status(400).json({ error: 'E-mail pessoal é obrigatório' });
    }
    try {
        const dbUser = await getUserByEmail(institutionalEmail);
        if (!dbUser) {
            return res.json({ message: 'Se o e-mail institucional existir no sistema, enviaremos um link para o e-mail pessoal informado.' });
        }
        if (!dbUser._id) {
            return res.json({ message: 'Se o e-mail institucional existir no sistema, enviaremos um link para o e-mail pessoal informado.' });
        }
        const { token, expiresAt } = await createPasswordResetToken(dbUser._id.toString());
        const resetLink = `${process.env.APP_BASE_URL || 'https://dashboard-secti-2025.vercel.app'}/reset-password?token=${token}`;
        await sendPasswordResetEmail({
            to: personalEmail,
            username: dbUser.username,
            resetLink
        });
        return res.json({ message: 'Se o e-mail institucional existir no sistema, enviaremos um link para o e-mail pessoal informado.', expiresAt });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        return res.json({ message: 'Se o e-mail institucional existir no sistema, enviaremos um link para o e-mail pessoal informado.' });
    }
});
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }
    try {
        const userId = await consumePasswordResetToken(token);
        await updateUser(userId, { password });
        return res.json({ message: 'Senha redefinida com sucesso' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        const message = error instanceof Error ? error.message : 'Erro ao redefinir senha';
        return res.status(400).json({ error: message });
    }
});
