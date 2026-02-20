import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
const COLLECTION_NAME = 'lancamentos_supcdt';
// Create
export async function createLancamento(lancamentoData) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    const novaEntrada = {
        ...lancamentoData,
        projetoId: typeof lancamentoData.projetoId === 'string' ? new ObjectId(lancamentoData.projetoId) : lancamentoData.projetoId,
        dataRegistro: new Date(lancamentoData.dataRegistro || new Date()),
        createdAt: new Date()
    };
    const result = await collection.insertOne(novaEntrada);
    return { ...novaEntrada, _id: result.insertedId };
}
// Read por Projeto
export async function getLancamentosByProjeto(projetoId) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    return await collection
        .find({ projetoId: new ObjectId(projetoId) })
        .sort({ trimestre: 1, dataRegistro: 1 })
        .toArray();
}
// Read All
export async function getAllLancamentos() {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    return await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
}
// Agregação: Recalcular Metas Realizadas de um projeto inteiro
export async function recalculateProjetoMetas(projetoId) {
    const db = await getDatabase('dashboard_supcdt');
    // 1. Busca projeto
    const projeto = await db.collection('projetos_supcdt').findOne({ _id: new ObjectId(projetoId) });
    if (!projeto)
        return;
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
                if (meta.realizadoTotal === undefined)
                    meta.realizadoTotal = 0;
                meta.realizadoTotal += val.valorRealizado;
                // Assegura que o array existe até esse tamanho
                if (!meta.realizadoPorTrimestre)
                    meta.realizadoPorTrimestre = Array(numeroTrimestres).fill(0);
                while (meta.realizadoPorTrimestre.length <= trimIndex) {
                    meta.realizadoPorTrimestre.push(0);
                }
                meta.realizadoPorTrimestre[trimIndex] += val.valorRealizado;
            }
        });
    });
    // 5. Salva de volta
    await db.collection('projetos_supcdt').updateOne({ _id: new ObjectId(projetoId) }, { $set: { metas: projeto.metas, updatedAt: new Date() } });
}
