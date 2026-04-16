import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { requireAuth } from '../middleware/auth.js';
import { ProjetoInput } from '../types/projeto.js';
import {
  createProjeto,
  deleteProjeto,
  getProjetoById,
  getProjetos,
  mapProjetoToApi,
  normalizeProjetoInput,
  updateProjeto
} from '../services/projetos.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const projetos = await getProjetos();
    res.json(projetos.map(mapProjetoToApi));
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Falha ao buscar projetos' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const projeto = await getProjetoById(id);
    if (!projeto) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    return res.json(mapProjetoToApi(projeto));
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return res.status(500).json({ error: 'Falha ao buscar projeto' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const projetoData = normalizeProjetoInput(req.body as ProjetoInput);
    const novoProjeto = await createProjeto(projetoData, req.user);
    res.status(201).json(mapProjetoToApi(novoProjeto));
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Falha ao criar projeto' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const payload = { ...(req.body ?? {}) } as Record<string, unknown>;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.chaveIntegracao;
    const updateData = normalizeProjetoInput(payload as ProjetoInput);

    const success = await updateProjeto(id, updateData, req.user);
    if (!success) {
      return res.status(404).json({ error: 'Falha ao atualizar projeto (pode não existir)' });
    }

    const projetoAtualizado = await getProjetoById(id);
    if (!projetoAtualizado) {
      return res.status(404).json({ error: 'Projeto não encontrado após atualização' });
    }

    return res.json(mapProjetoToApi(projetoAtualizado));
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return res.status(500).json({ error: 'Falha ao atualizar projeto' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const success = await deleteProjeto(id);
    if (!success) {
      return res.status(404).json({ error: 'Projeto não encontrado ou já excluído' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    return res.status(500).json({ error: 'Falha ao excluir projeto' });
  }
});

export default router;
