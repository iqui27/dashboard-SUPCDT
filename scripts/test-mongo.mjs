import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ Environment variable MONGODB_URI is not set.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  try {
    await client.connect();

    const admin = client.db().admin();
    const serverStatus = await admin.serverStatus();
    const { databases } = await admin.listDatabases();

    console.log('✅ Connected successfully to MongoDB.');
    console.log(`🗄️  Server version: ${serverStatus.version}`);
    console.log('📚 Databases available:', databases.map(db => db.name).join(', '));
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
