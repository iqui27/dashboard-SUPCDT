import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as projetosService from '../services/projetos.js';
import { ObjectId } from 'mongodb';

const router = Router();

// GET /api/projetos - Listar todos os projetos
router.get('/', requireAuth, async (_req, res) => {
    try {
        const projetos = await projetosService.getProjetos();
        const mappedProjetos = projetos.map((p: any) => ({
            ...p,
            id: p._id,
            projeto: p.projeto || p.nome || 'Sem Nome',
            osc: p.osc || p.nomeOSC || 'Não Especificada'
        }));
        res.json(mappedProjetos);
    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        res.status(500).json({ error: 'Falha ao buscar projetos' });
    }
});

// GET /api/projetos/:id - Buscar projeto específico
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const projeto = await projetosService.getProjetoById(id);
        if (!projeto) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        const mappedProjeto = {
            ...projeto,
            id: (projeto as any)._id,
            projeto: projeto.projeto || (projeto as any).nome || 'Sem Nome',
            osc: projeto.osc || (projeto as any).nomeOSC || 'Não Especificada'
        };

        res.json(mappedProjeto);
    } catch (error) {
        console.error('Erro ao buscar projeto:', error);
        res.status(500).json({ error: 'Falha ao buscar projeto' });
    }
});

// POST /api/projetos - Criar novo projeto
router.post('/', requireAuth, async (req, res) => {
    try {
        // Validar e formatar dados (idealmente usar zod aqui se crescer)
        const projetoData = {
            ...req.body,
            // converter datas string pra Date object se precisar:
            dataInicio: req.body.dataInicio ? new Date(req.body.dataInicio) : null,
            dataFim: req.body.dataFim ? new Date(req.body.dataFim) : null,
        };

        const novoProjeto = await projetosService.createProjeto(projetoData);
        res.status(201).json(novoProjeto);
    } catch (error) {
        console.error('Erro ao criar projeto:', error);
        res.status(500).json({ error: 'Falha ao criar projeto' });
    }
});

// PUT /api/projetos/:id - Atualizar projeto
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const { _id, ...updateData } = req.body;

        // Tratamento de datas
        if (updateData.dataInicio) updateData.dataInicio = new Date(updateData.dataInicio);
        if (updateData.dataFim) updateData.dataFim = new Date(updateData.dataFim);

        const success = await projetosService.updateProjeto(id, updateData);
        if (!success) {
            return res.status(404).json({ error: 'Falha ao atualizar projeto (pode não existir)' });
        }

        // Retorna a versão atualizada
        const projetoAtualizado = await projetosService.getProjetoById(id);
        res.json(projetoAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar projeto:', error);
        res.status(500).json({ error: 'Falha ao atualizar projeto' });
    }
});

// DELETE /api/projetos/:id - Excluir projeto
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const success = await projetosService.deleteProjeto(id);
        if (!success) {
            return res.status(404).json({ error: 'Projeto não encontrado ou já excluído' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao excluir projeto:', error);
        res.status(500).json({ error: 'Falha ao excluir projeto' });
    }
});

export default router;
