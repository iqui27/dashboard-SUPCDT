import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { DBProjeto } from '../types/projeto.js';

const COLLECTION_NAME = 'projetos_supcdt';

// Create
export async function createProjeto(projetoData: Omit<DBProjeto, '_id'>): Promise<DBProjeto> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    const novaEntrada: DBProjeto = {
        ...projetoData,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await collection.insertOne(novaEntrada);
    return { ...novaEntrada, _id: result.insertedId };
}

// Read All
export async function getProjetos(): Promise<DBProjeto[]> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    // Ordenar por data de criação descrescente
    const projetos = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return projetos;
}

// Read One
export async function getProjetoById(id: string): Promise<DBProjeto | null> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    try {
        const projeto = await collection.findOne({ _id: new ObjectId(id) });
        return projeto;
    } catch (error) {
        return null;
    }
}

// Update
export async function updateProjeto(id: string, updateData: Partial<DBProjeto>): Promise<boolean> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    try {
        const { _id, createdAt, ...fieldsToUpdate } = updateData as any;

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...fieldsToUpdate,
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount > 0;
    } catch (error) {
        return false;
    }
}

// Delete
export async function deleteProjeto(id: string): Promise<boolean> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    try {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    } catch (error) {
        return false;
    }
}

// Update Metas (Helper para atualizar só o array de metas, ex: calculando realizados)
export async function updateProjetoMetas(id: string, metas: DBProjeto['metas']): Promise<boolean> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBProjeto>(COLLECTION_NAME);

    try {
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    metas,
                    updatedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        return false;
    }
}
