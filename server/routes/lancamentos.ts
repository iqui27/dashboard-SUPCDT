import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as lancamentosService from '../services/lancamentos.js';
import { registrarProjetoHistorico } from '../services/projetos.js';
import { ObjectId } from 'mongodb';

const router = Router();

// GET /api/lancamentos/projeto/:projetoId - Lançamentos de um projeto
router.get('/projeto/:projetoId', requireAuth, async (req, res) => {
    try {
        const { projetoId } = req.params as { projetoId: string };
        if (!ObjectId.isValid(projetoId)) {
            return res.status(400).json({ error: 'ID de projeto inválido' });
        }

        const lancamentos = await lancamentosService.getLancamentosByProjeto(projetoId);
        res.json(lancamentos);
    } catch (error) {
        console.error('Erro buscar lancamentos:', error);
        res.status(500).json({ error: 'Falha buscar lancamentos' });
    }
});

// POST /api/lancamentos - Registrar um lote de execução (um trimestre)
router.post('/', requireAuth, async (req, res) => {
    try {
        // Validar req.body minimalista
        const { projetoId, trimestre, valores } = req.body;

        if (!projetoId || !trimestre || !valores) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        const lancamentoData = {
            ...req.body,
            // registramos o ID/email de quem fez a inserção
            registradoPor: req.user?.username || 'admin',
        };

        const novoLancamento = await lancamentosService.createLancamento(lancamentoData);

        // Importante: Logo após salvar, recalcula as metas do projeto
        await lancamentosService.recalculateProjetoMetas(projetoId);
        await registrarProjetoHistorico(projetoId, {
            acao: 'lancamento',
            resumo: `Registrou lançamento do trimestre ${trimestre}.`,
            usuario: req.user,
            alteracoes: [{
                campo: 'Lançamentos',
                depois: `${Array.isArray(valores) ? valores.length : 0} item(ns) registrados no trimestre ${trimestre}`
            }]
        });

        res.status(201).json(novoLancamento);
    } catch (error) {
        console.error('Erro registrar lancamento:', error);
        res.status(500).json({ error: 'Falha registrar lancamento' });
    }
});

export default router;
