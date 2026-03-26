import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { DBLancamento, DBProjeto } from '../types/projeto.js';

const COLLECTION_NAME = 'lancamentos_supcdt';

// Create
export async function createLancamento(lancamentoData: Omit<DBLancamento, '_id'>): Promise<DBLancamento> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBLancamento>(COLLECTION_NAME);

    const novaEntrada: DBLancamento = {
        ...lancamentoData,
        projetoId: typeof lancamentoData.projetoId === 'string' ? new ObjectId(lancamentoData.projetoId) : lancamentoData.projetoId,
        dataRegistro: new Date(lancamentoData.dataRegistro || new Date()),
        createdAt: new Date()
    };

    const result = await collection.insertOne(novaEntrada);
    return { 
        ...novaEntrada, 
        _id: result.insertedId,
        id: result.insertedId.toString(),
        projetoId: novaEntrada.projetoId.toString()
    } as DBLancamento;
}

// Update
export async function updateLancamento(id: string, updateData: Partial<DBLancamento>): Promise<DBLancamento | null> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBLancamento>(COLLECTION_NAME);

    if (!ObjectId.isValid(id)) return null;

    // Remove campos que não devem ser alterados
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, projetoId, createdAt, ...fieldsToUpdate } = updateData as DBLancamento;

    const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...fieldsToUpdate, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );

    if (!result) return null;

    // Recalcula metas após atualizar
    const projetoIdStr = result.projetoId.toString();
    await recalculateProjetoMetas(projetoIdStr);

    return {
        ...result,
        id: result._id?.toString(),
        projetoId: result.projetoId.toString()
    } as DBLancamento;
}

// Delete
export async function deleteLancamento(id: string): Promise<boolean> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBLancamento>(COLLECTION_NAME);

    if (!ObjectId.isValid(id)) return false;

    // Busca o lançamento para obter projetoId antes de deletar
    const lancamento = await collection.findOne({ _id: new ObjectId(id) });
    if (!lancamento) return false;

    const projetoIdStr = lancamento.projetoId.toString();

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return false;

    // Recalcula metas após deletar
    await recalculateProjetoMetas(projetoIdStr);

    return true;
}

// Read por Projeto
export async function getLancamentosByProjeto(projetoId: string): Promise<DBLancamento[]> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBLancamento>(COLLECTION_NAME);

    const lancamentos = await collection
        .find({ projetoId: new ObjectId(projetoId) })
        .sort({ trimestre: 1, dataRegistro: 1 })
        .toArray();

    // Mapear _id para id para o frontend
    return lancamentos.map(l => ({
        ...l,
        id: l._id?.toString(),
        projetoId: l.projetoId.toString()
    })) as DBLancamento[];
}

// Read All
export async function getAllLancamentos(): Promise<DBLancamento[]> {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBLancamento>(COLLECTION_NAME);

    return await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
}

// Agregação: Recalcular Metas Realizadas de um projeto inteiro
export async function recalculateProjetoMetas(projetoId: string): Promise<void> {
    const db = await getDatabase('dashboard_supcdt');

    // 1. Busca projeto
    const projeto = await db.collection<DBProjeto>('projetos_supcdt').findOne({ _id: new ObjectId(projetoId) });
    if (!projeto) return;

    // 2. Busca lançamentos
    const lancamentos = await getLancamentosByProjeto(projetoId);

    // 3. Zera os arrays de realizado
    const numeroTrimestres = projeto.cronograma.totalTrimestres || 1;
    projeto.metas.forEach(meta => {
        meta.realizadoTotal = 0;
        meta.realizadoPorTrimestre = Array(numeroTrimestres).fill(0);
    });

    // 4. Preenche os valores
    lancamentos.forEach(lanc => {
        // Array do lanc.trimestre é 1-based, então index = lanc.trimestre - 1
        const trimIndex = lanc.trimestre - 1;

        lanc.valores.forEach(val => {
            const meta = projeto.metas.find(m => m.id === val.metaId);
            if (meta) {
                if (meta.realizadoTotal === undefined) meta.realizadoTotal = 0;
                meta.realizadoTotal += val.valorRealizado;

                // Assegura que o array existe até esse tamanho
                if (!meta.realizadoPorTrimestre) meta.realizadoPorTrimestre = Array(numeroTrimestres).fill(0);
                while (meta.realizadoPorTrimestre.length <= trimIndex) {
                    meta.realizadoPorTrimestre.push(0);
                }

                meta.realizadoPorTrimestre[trimIndex] += val.valorRealizado;
            }
        });
    });

    // 5. Salva de volta
    await db.collection<DBProjeto>('projetos_supcdt').updateOne(
        { _id: new ObjectId(projetoId) },
        { $set: { metas: projeto.metas, updatedAt: new Date() } }
    );
}
