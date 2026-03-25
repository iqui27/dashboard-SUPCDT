import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getUsersDatabase } from '../db/client.js';
import type { Fomento, MovimentacaoHistorico, ParlamentarInfo } from '../types/fomento.js';
import { importSheetUsingServiceAccount, previewSheetUsingServiceAccount } from '../services/googleSheetImport.js';
import type { SheetImportedPreview } from '../services/googleSheetImport.js';

interface SerializedHistorico extends Omit<MovimentacaoHistorico, 'data'> {
  data: string;
}

interface SerializedFomento extends Omit<Fomento,
  'vigenciaInicio' |
  'vigenciaEvento' |
  'vigenciaFinal' |
  'statusDesde' |
  'historicoMovimentacoes' |
  'dataPrestacaoContasOSC' |
  'prorrogacaoPrestacaoContasMais30' |
  'overrideLastUpdatedAt' |
  'overrideLastSyncedAt'> {
  vigenciaInicio: string | null;
  vigenciaEvento: string | null;
  vigenciaFinal: string | null;
  statusDesde: string | null;
  dataPrestacaoContasOSC: string | null;
  prorrogacaoPrestacaoContasMais30: string | boolean | null;
  historicoMovimentacoes: SerializedHistorico[];
  overrideLastUpdatedAt?: string | null;
  overrideLastSyncedAt?: string | null;
}

interface DatasetDoc {
  _id: string;
  name: string;
  description?: string;
  sourceType: 'local_dataset';
  fomentos: SerializedFomento[];
  createdAt: Date;
  updatedAt: Date;
  sourceSheetId?: string;
  sourceRange?: string;
  sourceTitle?: string;
  sheetUrl?: string;
  importedAt?: Date;
  preview?: SheetImportedPreview;
  selectedColumns?: string[];
}

interface DataSourceSummary {
  id: string;
  type: 'remote_sheet' | 'local_dataset';
  name: string;
  description?: string;
  lastUpdatedAt?: string | null;
}

const COLLECTION_NAME = 'planilha_datasets';
const REMOTE_SOURCE_ID = 'remote-default';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '';

function serializeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeHistorico(historico: MovimentacaoHistorico[]): SerializedHistorico[] {
  return historico.map(item => ({
    ...item,
    data: serializeDate(item.data) ?? new Date().toISOString()
  }));
}

function deserializeHistorico(items: SerializedHistorico[]): MovimentacaoHistorico[] {
  return items.map(item => ({
    ...item,
    data: parseDate(item.data) ?? new Date()
  }));
}

function serializeParlamentares(parlamentares: ParlamentarInfo[]): ParlamentarInfo[] {
  return parlamentares.map(item => ({ ...item }));
}

function serializeFomentoForStorage(fomento: Fomento): SerializedFomento {
  return {
    ...fomento,
    vigenciaInicio: serializeDate(fomento.vigenciaInicio),
    vigenciaEvento: serializeDate(fomento.vigenciaEvento),
    vigenciaFinal: serializeDate(fomento.vigenciaFinal),
    statusDesde: serializeDate(fomento.statusDesde),
    dataPrestacaoContasOSC: serializeDate(fomento.dataPrestacaoContasOSC),
    prorrogacaoPrestacaoContasMais30: typeof fomento.prorrogacaoPrestacaoContasMais30 === 'boolean'
      ? fomento.prorrogacaoPrestacaoContasMais30
      : serializeDate(fomento.prorrogacaoPrestacaoContasMais30),
    overrideLastUpdatedAt: serializeDate(fomento.overrideLastUpdatedAt),
    overrideLastSyncedAt: serializeDate(fomento.overrideLastSyncedAt),
    historicoMovimentacoes: serializeHistorico(fomento.historicoMovimentacoes ?? []),
    parlamentares: serializeParlamentares(fomento.parlamentares ?? [])
  };
}

function deserializeFomentoFromStorage(serialized: SerializedFomento): Fomento {
  const { historicoMovimentacoes, parlamentares, prorrogacaoPrestacaoContasMais30, ...rest } = serialized;

  let prorrogacao: Date | boolean | null;
  if (typeof prorrogacaoPrestacaoContasMais30 === 'boolean') {
    prorrogacao = prorrogacaoPrestacaoContasMais30;
  } else {
    prorrogacao = parseDate(prorrogacaoPrestacaoContasMais30);
  }

  return {
    ...rest,
    vigenciaInicio: parseDate(serialized.vigenciaInicio),
    vigenciaEvento: parseDate(serialized.vigenciaEvento),
    vigenciaFinal: parseDate(serialized.vigenciaFinal),
    statusDesde: parseDate(serialized.statusDesde),
    dataPrestacaoContasOSC: parseDate(serialized.dataPrestacaoContasOSC),
    overrideLastUpdatedAt: parseDate(serialized.overrideLastUpdatedAt ?? null),
    overrideLastSyncedAt: parseDate(serialized.overrideLastSyncedAt ?? null),
    prorrogacaoPrestacaoContasMais30: prorrogacao,
    historicoMovimentacoes: deserializeHistorico(historicoMovimentacoes ?? []),
    parlamentares: parlamentares ?? []
  } as Fomento;
}

function mapDatasetToSummary(doc: DatasetDoc): DataSourceSummary {
  return {
    id: doc._id,
    type: doc.sourceType,
    name: doc.name,
    description: doc.description,
    lastUpdatedAt: serializeDate(doc.updatedAt)
  };
}

export const dataSourcesRouter = Router();

dataSourcesRouter.post('/preview', async (req: Request, res: Response) => {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Credenciais da service account não estão configuradas.' });
  }

  const { sheetUrl, range } = req.body as { sheetUrl?: string; range?: string };

  if (!sheetUrl || typeof sheetUrl !== 'string' || !sheetUrl.trim()) {
    return res.status(400).json({ error: 'Informe o link da planilha para pré-visualizar.' });
  }

  try {
    const trimmedUrl = sheetUrl.trim();
    const previewResult = await previewSheetUsingServiceAccount({
      sheetUrl: trimmedUrl,
      range,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      privateKey: SERVICE_ACCOUNT_PRIVATE_KEY
    });

    res.json(previewResult);
  } catch (error) {
    console.error('Failed to preview Google Sheet', error);
    const message = error instanceof Error ? error.message : 'Não foi possível pré-visualizar a planilha.';
    res.status(500).json({ error: message });
  }
});

dataSourcesRouter.post('/import', async (req: Request, res: Response) => {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Credenciais da service account não estão configuradas.' });
  }

  const { sheetUrl, name, description, range, selectedColumns } = req.body as {
    sheetUrl?: string;
    name?: string;
    description?: string;
    range?: string;
    selectedColumns?: string[];
  };

  if (!sheetUrl || typeof sheetUrl !== 'string' || !sheetUrl.trim()) {
    return res.status(400).json({ error: 'Informe o link da planilha que deseja importar.' });
  }

  try {
    const trimmedUrl = sheetUrl.trim();
    const normalizedSelectedColumns = Array.isArray(selectedColumns)
      ? selectedColumns.map(column => (typeof column === 'string' ? column.trim() : '')).filter(column => column.length > 0)
      : undefined;

    const importResult = await importSheetUsingServiceAccount({
      sheetUrl: trimmedUrl,
      range,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      privateKey: SERVICE_ACCOUNT_PRIVATE_KEY,
      selectedColumns: normalizedSelectedColumns
    });

    if (process.env.NODE_ENV !== 'production') {
      const sample = importResult.fomentos.slice(0, 5).map(fomento => ({
        projeto: fomento.projeto,
        processoSEI: fomento.processoSEI,
        parlamentar: fomento.parlamentar,
        valorTotal: fomento.valorTotal,
        statusProjeto: fomento.statusProjeto
      }));
      console.log('[SheetImport] Sample fomentos to persist:', sample);
    }

    const datasetId = randomUUID();
    const now = new Date();
    const datasetName = name?.trim() || importResult.title || 'Planilha importada';
    const datasetDescription = description ?? `Importado da planilha "${importResult.title}"`;
    const serializedFomentos = importResult.fomentos.map(serializeFomentoForStorage);

    const db = await getUsersDatabase();
    const collection = db.collection<DatasetDoc>(COLLECTION_NAME);

    await collection.insertOne({
      _id: datasetId,
      name: datasetName,
      description: datasetDescription,
      sourceType: 'local_dataset',
      fomentos: serializedFomentos,
      createdAt: now,
      updatedAt: now,
      sourceSheetId: importResult.sheetId,
      sourceRange: importResult.range,
      sourceTitle: importResult.title,
      sheetUrl: trimmedUrl,
      importedAt: now,
      preview: importResult.preview,
      selectedColumns: normalizedSelectedColumns
    });

    res.status(201).json({
      id: datasetId,
      type: 'local_dataset',
      name: datasetName,
      description: datasetDescription,
      lastUpdatedAt: now.toISOString(),
      sourceSheetId: importResult.sheetId,
      sourceRange: importResult.range,
      sourceTitle: importResult.title,
      sheetUrl: trimmedUrl,
      fomentosCount: serializedFomentos.length,
      preview: importResult.preview,
      selectedColumns: normalizedSelectedColumns
    });
  } catch (error) {
    console.error('Failed to import Google Sheet', error);
    const message = error instanceof Error ? error.message : 'Não foi possível importar a planilha.';
    res.status(400).json({ error: message });
  }
});

dataSourcesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getUsersDatabase();
    const collection = db.collection<DatasetDoc>(COLLECTION_NAME);
    const datasets = await collection
      .find({}, { projection: { fomentos: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

    const summaries: DataSourceSummary[] = [
      {
        id: REMOTE_SOURCE_ID,
        type: 'remote_sheet',
        name: 'Planilha Google (ao vivo)',
        description: 'Dados carregados diretamente da planilha remota configurada.',
        lastUpdatedAt: null
      },
      ...datasets.map(mapDatasetToSummary)
    ];

    res.json(summaries);
  } catch (error) {
    console.error('Failed to list data sources', error);
    res.status(500).json({ error: 'Failed to list data sources' });
  }
});

dataSourcesRouter.get('/local/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getUsersDatabase();
    const collection = db.collection<DatasetDoc>(COLLECTION_NAME);

    const dataset = await collection.findOne({ _id: id });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json({
      id: dataset._id,
      name: dataset.name,
      description: dataset.description,
      lastUpdatedAt: serializeDate(dataset.updatedAt),
      sourceSheetId: dataset.sourceSheetId,
      sourceRange: dataset.sourceRange,
      sourceTitle: dataset.sourceTitle,
      sheetUrl: dataset.sheetUrl,
      importedAt: serializeDate(dataset.importedAt),
      fomentos: dataset.fomentos,
      preview: dataset.preview,
      selectedColumns: dataset.selectedColumns
    });
  } catch (error) {
    console.error('Failed to fetch local dataset', error);
    res.status(500).json({ error: 'Failed to fetch dataset' });
  }
});

dataSourcesRouter.put('/local/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fomentos } = req.body as {
      name?: string;
      description?: string;
      fomentos?: SerializedFomento[];
    };

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Dataset name is required' });
    }

    if (!Array.isArray(fomentos)) {
      return res.status(400).json({ error: 'Fomentos payload must be an array' });
    }

    const normalizedFomentos = fomentos.map(item => serializeFomentoForStorage(deserializeFomentoFromStorage(item)));

    const now = new Date();

    const db = await getUsersDatabase();
    const collection = db.collection<DatasetDoc>(COLLECTION_NAME);

    await collection.updateOne(
      { _id: id },
      {
        $set: {
          _id: id,
          name: name.trim(),
          description,
          sourceType: 'local_dataset',
          fomentos: normalizedFomentos,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );

    res.status(204).send();
  } catch (error) {
    console.error('Failed to upsert local dataset', error);
    res.status(500).json({ error: 'Failed to save dataset' });
  }
});

dataSourcesRouter.delete('/local/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getUsersDatabase();
    const collection = db.collection<DatasetDoc>(COLLECTION_NAME);

    const result = await collection.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete dataset', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});
