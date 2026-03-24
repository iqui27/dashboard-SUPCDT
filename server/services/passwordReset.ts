import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { getUsersDatabase } from '../db/client.js';

interface PasswordResetTokenDoc {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

const PASSWORD_RESET_COLLECTION = 'password_reset_tokens';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const db = await getUsersDatabase();
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const collection = db.collection<PasswordResetTokenDoc>(PASSWORD_RESET_COLLECTION);

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

export async function consumePasswordResetToken(token: string): Promise<string> {
  const db = await getUsersDatabase();
  const tokenHash = hashToken(token);
  const collection = db.collection<PasswordResetTokenDoc>(PASSWORD_RESET_COLLECTION);
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
