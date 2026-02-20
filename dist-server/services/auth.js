import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dashboard-secti-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        console.error('Failed to verify token:', error);
        return null;
    }
}
