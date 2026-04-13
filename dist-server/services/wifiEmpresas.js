import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
const COLLECTION_NAME = 'wifi_empresas';
function sanitizeText(value) {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
}
function toIsoDate(value) {
    if (!value || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}
export function mapWifiEmpresaToApi(empresa) {
    return {
        id: empresa._id?.toString() ?? '',
        nome: empresa.nome,
        contatoNome: sanitizeText(empresa.contatoNome),
        telefone: sanitizeText(empresa.telefone),
        email: sanitizeText(empresa.email),
        createdAt: toIsoDate(empresa.createdAt),
        updatedAt: toIsoDate(empresa.updatedAt)
    };
}
export function normalizeWifiEmpresaInput(input) {
    return {
        nome: sanitizeText(input.nome) ?? 'Empresa sem nome',
        contatoNome: sanitizeText(input.contatoNome),
        telefone: sanitizeText(input.telefone),
        email: sanitizeText(input.email)
    };
}
export async function getWifiEmpresas() {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    return collection.find({}).sort({ nome: 1, createdAt: -1 }).toArray();
}
export async function getWifiEmpresaById(id) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        return await collection.findOne({ _id: new ObjectId(id) });
    }
    catch {
        return null;
    }
}
export async function createWifiEmpresa(data) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    const newEmpresa = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await collection.insertOne(newEmpresa);
    return { ...newEmpresa, _id: result.insertedId };
}
export async function updateWifiEmpresa(id, data) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        const { _id, createdAt, ...fieldsToUpdate } = data;
        const result = await collection.updateOne({ _id: new ObjectId(id) }, {
            $set: {
                ...fieldsToUpdate,
                updatedAt: new Date()
            }
        });
        return result.matchedCount > 0;
    }
    catch {
        return false;
    }
}
export async function deleteWifiEmpresa(id) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }
    catch {
        return false;
    }
}
