const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://henriquef29_db_user:iquinhof27@cluster0.qccgztz.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('secti-dashboard');
    const admin = await db.collection('users').findOne({ username: 'admin' });
    console.log("Admin exists:", !!admin);
    if (admin) {
        console.log("Admin info:", admin.username, admin.email, admin.role);
    }
  } finally {
    await client.close();
  }
}
run();
