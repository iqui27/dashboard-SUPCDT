import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { requireAuth } from '../middleware/auth.js';
import { createWifiPoint, deleteWifiPoint, getWifiPointById, getWifiPoints, mapWifiPointToApi, normalizeWifiPointInput, updateWifiPoint, buildWifiStats } from '../services/wifi.js';
import { WifiPointInput } from '../types/wifi.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const points = await getWifiPoints({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      regiaoAdministrativa: typeof req.query.regiaoAdministrativa === 'string' ? req.query.regiaoAdministrativa : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined
    });

    res.json(points.map(mapWifiPointToApi));
  } catch (error) {
    console.error('Erro ao buscar pontos Wi-Fi:', error);
    res.status(500).json({ error: 'Falha ao buscar pontos Wi-Fi' });
  }
});

router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const points = await getWifiPoints();
    res.json(buildWifiStats(points));
  } catch (error) {
    console.error('Erro ao gerar estatísticas Wi-Fi:', error);
    res.status(500).json({ error: 'Falha ao gerar estatísticas Wi-Fi' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const point = await getWifiPointById(req.params.id);
    if (!point) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    return res.json(mapWifiPointToApi(point));
  } catch (error) {
    console.error('Erro ao buscar ponto Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao buscar ponto Wi-Fi' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = normalizeWifiPointInput(req.body as WifiPointInput);
    const point = await createWifiPoint(data);
    res.status(201).json(mapWifiPointToApi(point));
  } catch (error) {
    console.error('Erro ao criar ponto Wi-Fi:', error);
    res.status(500).json({ error: 'Falha ao criar ponto Wi-Fi' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const payload = { ...(req.body ?? {}) } as Record<string, unknown>;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;

    const success = await updateWifiPoint(req.params.id, normalizeWifiPointInput(payload as WifiPointInput));
    if (!success) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    const updated = await getWifiPointById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Ponto não encontrado após atualização' });
    }

    return res.json(mapWifiPointToApi(updated));
  } catch (error) {
    console.error('Erro ao atualizar ponto Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao atualizar ponto Wi-Fi' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const success = await deleteWifiPoint(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir ponto Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao excluir ponto Wi-Fi' });
  }
});

export default router;
