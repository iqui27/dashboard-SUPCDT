const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
async function run() {
    const uri = "mongodb+srv://henriquef29_db_user:iquinhof27@cluster0.qccgztz.mongodb.net/?appName=Cluster0";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('secti-dashboard');
        const admin = await db.collection('users').findOne({ username: 'admin' });
        console.log("Admin exists:", !!admin);
        if (admin) {
            console.log("Admin info:", admin.username, admin.email, admin.role, admin.isAdmin);
            console.log("Expected test:", await bcrypt.compare('844612', admin.passwordHash));
            console.log("Expected test 2:", await bcrypt.compare('secti2025', admin.passwordHash));
            console.log("Expected test 3:", await bcrypt.compare('admin123', admin.passwordHash));
            console.log("Expected test 4:", await bcrypt.compare('tecnologia', admin.passwordHash));
        }
    } finally {
        await client.close();
    }
}
run();
