import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { getUsersDatabase } from '../db/client.js';
const PASSWORD_RESET_COLLECTION = 'password_reset_tokens';
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export async function createPasswordResetToken(userId) {
    const db = await getUsersDatabase();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const collection = db.collection(PASSWORD_RESET_COLLECTION);
    await collection.deleteMany({ userId: new ObjectId(userId) });
    await collection.insertOne({
        userId: new ObjectId(userId),
        tokenHash,
        createdAt: new Date(),
        expiresAt,
        usedAt: null
    });
    return { token: rawToken, expiresAt };
}
export async function consumePasswordResetToken(token) {
    const db = await getUsersDatabase();
    const tokenHash = hashToken(token);
    const collection = db.collection(PASSWORD_RESET_COLLECTION);
    const now = new Date();
    const tokenDoc = await collection.findOne({ tokenHash });
    if (!tokenDoc) {
        throw new Error('Token inválido');
    }
    if (tokenDoc.usedAt) {
        throw new Error('Token já utilizado');
    }
    if (tokenDoc.expiresAt < now) {
        throw new Error('Token expirado');
    }
    await collection.updateOne({ _id: tokenDoc._id }, { $set: { usedAt: now } });
    return tokenDoc.userId.toString();
}
