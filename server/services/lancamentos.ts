import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { DBLancamento, DBProjeto } from '../types/projeto.js';

const COLLECTION_NAME = 'lancamentos_supcdt';

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
  return { ...novaEntrada, _id: result.insertedId };
}

export async function getLancamentosByProjeto(projetoId: string): Promise<DBLancamento[]> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBLancamento>(COLLECTION_NAME);

  return collection
    .find({ projetoId: new ObjectId(projetoId) })
    .sort({ trimestre: 1, dataRegistro: 1 })
    .toArray();
}

export async function getAllLancamentos(): Promise<DBLancamento[]> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBLancamento>(COLLECTION_NAME);

  return collection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

export async function recalculateProjetoMetas(projetoId: string): Promise<void> {
  const db = await getDatabase('dashboard_supcdt');

  const projeto = await db.collection<DBProjeto>('projetos_supcdt').findOne({ _id: new ObjectId(projetoId) });
  if (!projeto) {
    return;
  }

  const lancamentos = await getLancamentosByProjeto(projetoId);
  const numeroTrimestres = projeto.cronograma.totalTrimestres || 1;

  projeto.metas.forEach((meta) => {
    meta.realizadoTotal = 0;
    meta.realizadoPorTrimestre = Array(numeroTrimestres).fill(0);
  });

  lancamentos.forEach((lancamento) => {
    const trimIndex = lancamento.trimestre - 1;

    lancamento.valores.forEach((valor) => {
      const meta = projeto.metas.find((item) => item.id === valor.metaId);
      if (!meta) {
        return;
      }

      meta.realizadoTotal = (meta.realizadoTotal || 0) + valor.valorRealizado;
      if (!meta.realizadoPorTrimestre) {
        meta.realizadoPorTrimestre = Array(numeroTrimestres).fill(0);
      }
      while (meta.realizadoPorTrimestre.length <= trimIndex) {
        meta.realizadoPorTrimestre.push(0);
      }

      meta.realizadoPorTrimestre[trimIndex] += valor.valorRealizado;
    });
  });

  await db.collection<DBProjeto>('projetos_supcdt').updateOne(
    { _id: new ObjectId(projetoId) },
    { $set: { metas: projeto.metas, updatedAt: new Date() } }
  );
}
