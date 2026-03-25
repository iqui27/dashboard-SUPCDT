import { Router } from 'express';
import type { Request, Response } from 'express';
import { bulkUpsertOscs, createOsc, deleteOsc, listOscs, updateOsc, upsertOscByProcesso } from '../services/oscs.js';
import type { OSCInput } from '../types/osc.js';

export const oscsRouter = Router();

function parseOscInput(body: unknown): OSCInput {
  const payload = (body ?? {}) as Record<string, unknown>;
  const processo = String(payload.processo ?? '').trim();
  const osc = String(payload.osc ?? '').trim();
  const projeto = String(payload.projeto ?? '').trim();
  const parlamentar = payload.parlamentar !== undefined ? String(payload.parlamentar ?? '').trim() : undefined;
  const rawValor = payload.valor ?? payload.valorRaw ?? null;
  let valor: number | string | null = null;
  if (typeof rawValor === 'number' && Number.isFinite(rawValor)) {
    valor = rawValor;
  } else if (typeof rawValor === 'string') {
    const trimmed = rawValor.trim();
    valor = trimmed.length > 0 ? trimmed : null;
  }
  const cnpj = payload.cnpj !== undefined ? String(payload.cnpj ?? '').trim() : undefined;
  const status = payload.status !== undefined ? String(payload.status ?? '').trim() : undefined;

  return {
    processo,
    osc,
    projeto,
    parlamentar,
    valor,
    valorRaw: typeof payload.valorRaw === 'string' ? payload.valorRaw.trim() : undefined,
    cnpj,
    status
  } satisfies OSCInput;
}

oscsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const oscs = await listOscs(search);
    res.json(oscs);
  } catch (error) {
    console.error('Failed to list OSCs', error);
    res.status(500).json({ error: 'Falha ao carregar OSCs.' });
  }
});

oscsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const input = parseOscInput(req.body);
    const osc = await createOsc(input);
    res.status(201).json(osc);
  } catch (error) {
    console.error('Failed to create OSC', error);
    const message = error instanceof Error ? error.message : 'Falha ao criar OSC.';
    res.status(400).json({ error: message });
  }
});

oscsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = parseOscInput(req.body);
    const osc = await updateOsc(id, input);
    res.json(osc);
  } catch (error) {
    console.error('Failed to update OSC', error);
    const message = error instanceof Error ? error.message : 'Falha ao atualizar OSC.';
    const status = message.includes('não encontrada') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

oscsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteOsc(id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete OSC', error);
    const message = error instanceof Error ? error.message : 'Falha ao remover OSC.';
    const status = message.includes('não encontrada') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

oscsRouter.post('/bulk', async (req: Request, res: Response) => {
  try {
    const body = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
    const inputs = body.map((item: unknown) => parseOscInput(item));
    const result = await bulkUpsertOscs(inputs);
    res.json(result);
  } catch (error) {
    console.error('Failed to bulk upsert OSCs', error);
    res.status(400).json({ error: 'Falha ao importar OSCs.' });
  }
});

oscsRouter.post('/upsert', async (req: Request, res: Response) => {
  try {
    const input = parseOscInput(req.body);
    const result = await upsertOscByProcesso(input);
    res.json(result);
  } catch (error) {
    console.error('Failed to upsert OSC', error);
    const message = error instanceof Error ? error.message : 'Falha ao salvar OSC.';
    res.status(400).json({ error: message });
  }
});
