import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
async function main() {
    const id = process.argv[2];
    if (!id) {
        console.error('Usage: inspectProject <id>');
        process.exit(1);
    }
    const db = await getDatabase();
    const collection = db.collection('custom_projects');
    const query = {
        $or: [
            { id }
        ]
    };
    if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
    }
    query.$or.push({ _id: id });
    const candidates = await collection
        .find(query)
        .limit(5)
        .toArray();
    console.log(JSON.stringify(candidates, null, 2));
    process.exit(0);
}
main().catch(error => {
    console.error(error);
    process.exit(1);
});
