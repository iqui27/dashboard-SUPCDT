import { ObjectId } from 'mongodb';
import { getUsersDatabase } from '../db/client.js';
import { sanitizeUser } from '../types/user.js';
import { hashPassword } from './auth.js';
const USERS_COLLECTION = 'users';
function resolveRole(payload) {
    if (payload.role) {
        return {
            role: payload.role,
            isAdmin: payload.role === 'admin'
        };
    }
    if (typeof payload.isAdmin !== 'undefined') {
        return {
            role: payload.isAdmin ? 'admin' : 'viewer',
            isAdmin: !!payload.isAdmin
        };
    }
    return {
        role: 'viewer',
        isAdmin: false
    };
}
export async function getUserByUsername(username) {
    const db = await getUsersDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({ username });
    return user;
}
export async function getUserByEmail(email) {
    const db = await getUsersDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
    return user;
}
export async function getUserByIdentifier(identifier) {
    const db = await getUsersDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({
        $or: [
            { username: identifier },
            { email: { $regex: `^${identifier}$`, $options: 'i' } }
        ]
    });
    return user;
}
export async function getUserById(userId) {
    const db = await getUsersDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
    return user;
}
export async function createUser({ username, password, email, isAdmin, role, fullName, department }) {
    const db = await getUsersDatabase();
    const existing = await getUserByUsername(username);
    if (existing) {
        throw new Error('Usuário já existe');
    }
    if (email) {
        const existingEmail = await getUserByEmail(email);
        if (existingEmail) {
            throw new Error('E-mail já está em uso');
        }
    }
    const passwordHash = await hashPassword(password);
    const resolved = resolveRole({ role, isAdmin });
    const user = {
        username,
        passwordHash,
        createdAt: new Date(),
        lastLogin: null,
        isActive: true,
        email,
        isAdmin: resolved.isAdmin,
        role: resolved.role,
        fullName,
        department
    };
    const result = await db.collection(USERS_COLLECTION).insertOne(user);
    user._id = result.insertedId;
    return sanitizeUser(user);
}
export async function updateUser(userId, updates) {
    const db = await getUsersDatabase();
    const current = await getUserById(userId);
    if (!current) {
        throw new Error('Usuário não encontrado');
    }
    const updateDoc = {};
    if (typeof updates.username !== 'undefined') {
        const trimmedUsername = updates.username.trim();
        if (!trimmedUsername) {
            throw new Error('Username não pode ser vazio');
        }
        if (trimmedUsername !== current.username) {
            const existingUsername = await getUserByUsername(trimmedUsername);
            if (existingUsername && existingUsername._id?.toString() !== userId) {
                throw new Error('Username já está em uso');
            }
            updateDoc.username = trimmedUsername;
        }
    }
    if (typeof updates.email !== 'undefined') {
        if (updates.email) {
            const existingEmail = await getUserByEmail(updates.email);
            if (existingEmail && existingEmail._id?.toString() !== userId) {
                throw new Error('E-mail já está em uso');
            }
        }
        updateDoc.email = updates.email;
    }
    if (typeof updates.isActive !== 'undefined') {
        updateDoc.isActive = updates.isActive;
    }
    if (updates.password) {
        updateDoc.passwordHash = await hashPassword(updates.password);
    }
    if (typeof updates.role !== 'undefined' || typeof updates.isAdmin !== 'undefined') {
        const resolved = resolveRole({
            role: updates.role,
            isAdmin: updates.isAdmin
        });
        if (current.role !== resolved.role) {
            updateDoc.role = resolved.role;
        }
        if ((current.isAdmin ?? false) !== resolved.isAdmin) {
            updateDoc.isAdmin = resolved.isAdmin;
        }
    }
    if (typeof updates.fullName !== 'undefined') {
        updateDoc.fullName = updates.fullName;
    }
    if (typeof updates.department !== 'undefined') {
        updateDoc.department = updates.department;
    }
    if (Object.keys(updateDoc).length === 0) {
        return sanitizeUser(current);
    }
    await db.collection(USERS_COLLECTION).updateOne({ _id: new ObjectId(userId) }, { $set: updateDoc });
    const updated = await getUserById(userId);
    if (!updated) {
        throw new Error('Usuário não encontrado');
    }
    return sanitizeUser(updated);
}
export async function updateLastLogin(userId) {
    const db = await getUsersDatabase();
    await db.collection(USERS_COLLECTION).updateOne({ _id: new ObjectId(userId) }, { $set: { lastLogin: new Date() } });
}
export async function changePassword(userId, newPassword) {
    const db = await getUsersDatabase();
    const passwordHash = await hashPassword(newPassword);
    await db.collection(USERS_COLLECTION).updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash } });
}
export async function listUsers() {
    const db = await getUsersDatabase();
    const users = await db.collection(USERS_COLLECTION).find().sort({ createdAt: -1 }).toArray();
    return users.map(sanitizeUser);
}
export async function listAssignableUsers() {
    const db = await getUsersDatabase();
    const users = await db.collection(USERS_COLLECTION)
        .find({ isActive: true })
        .sort({ fullName: 1, username: 1 })
        .toArray();
    return users.map(sanitizeUser);
}
export async function ensureAdminUser() {
    const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const configuredAdminPassword = process.env.ADMIN_PASSWORD?.trim();
    const adminEmail = process.env.ADMIN_EMAIL;
    const db = await getUsersDatabase();
    const isProduction = process.env.NODE_ENV === 'production';
    if (!configuredAdminPassword && isProduction) {
        console.warn('ADMIN_PASSWORD não configurada. Pulando bootstrap automático do admin em produção.');
        return;
    }
    const adminPassword = configuredAdminPassword || 'admin123';
    if (!configuredAdminPassword) {
        console.warn('ADMIN_PASSWORD não configurada. Usando senha padrão apenas para ambiente não produtivo.');
    }
    try {
        const existing = await getUserByUsername(adminUsername);
        if (!existing) {
            console.log(`Creating initial admin user: ${adminUsername}`);
            await createUser({ username: adminUsername, password: adminPassword, email: adminEmail, isAdmin: true });
        }
        else if (!existing.isAdmin) {
            await db.collection(USERS_COLLECTION).updateOne({ _id: existing._id }, { $set: { isAdmin: true, role: 'admin' } });
            console.log('Existing admin user found but was not marked as admin. Permissions updated.');
        }
    }
    catch (error) {
        console.error('Failed to ensure admin user:', error);
    }
}
