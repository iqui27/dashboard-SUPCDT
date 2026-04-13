import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createWifiEmpresa, deleteWifiEmpresa, getWifiEmpresaById, getWifiEmpresas, mapWifiEmpresaToApi, normalizeWifiEmpresaInput, updateWifiEmpresa } from '../services/wifiEmpresas.js';
import { WifiEmpresaInput } from '../types/wifi.js';

const router = Router();

// GET routes don't require auth - viewers can see companies
router.get('/', async (_req, res) => {
  try {
    const empresas = await getWifiEmpresas();
    res.json(empresas.map(mapWifiEmpresaToApi));
  } catch (error) {
    console.error('Erro ao buscar empresas Wi-Fi:', error);
    res.status(500).json({ error: 'Falha ao buscar empresas Wi-Fi' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const empresa = await getWifiEmpresaById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    return res.json(mapWifiEmpresaToApi(empresa));
  } catch (error) {
    console.error('Erro ao buscar empresa Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao buscar empresa Wi-Fi' });
  }
});

// Mutation routes require admin
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = normalizeWifiEmpresaInput(req.body as WifiEmpresaInput);
    const empresa = await createWifiEmpresa(data);
    res.status(201).json(mapWifiEmpresaToApi(empresa));
  } catch (error) {
    console.error('Erro ao criar empresa Wi-Fi:', error);
    res.status(500).json({ error: 'Falha ao criar empresa Wi-Fi' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const payload = { ...(req.body ?? {}) } as Record<string, unknown>;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;

    const success = await updateWifiEmpresa(req.params.id, normalizeWifiEmpresaInput(payload as WifiEmpresaInput));
    if (!success) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const updated = await getWifiEmpresaById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Empresa não encontrada após atualização' });
    }

    return res.json(mapWifiEmpresaToApi(updated));
  } catch (error) {
    console.error('Erro ao atualizar empresa Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao atualizar empresa Wi-Fi' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const success = await deleteWifiEmpresa(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir empresa Wi-Fi:', error);
    return res.status(500).json({ error: 'Falha ao excluir empresa Wi-Fi' });
  }
});

export default router;