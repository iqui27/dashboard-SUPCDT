import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('MONGODB_URI is not set');
}
const client = new MongoClient(uri);
let clientPromise = null;
export function getMongoClient() {
    if (!clientPromise) {
        clientPromise = client.connect();
    }
    return clientPromise;
}
export async function closeMongoClient() {
    if (!clientPromise) {
        return;
    }
    const connectedClient = await clientPromise;
    await connectedClient.close();
    clientPromise = null;
}
export async function getDatabase(dbName = 'secti-dashboard') {
    const connectedClient = await getMongoClient();
    return connectedClient.db(dbName);
}
