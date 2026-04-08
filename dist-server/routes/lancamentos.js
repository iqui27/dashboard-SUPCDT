import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as lancamentosService from '../services/lancamentos.js';
import { ObjectId } from 'mongodb';
const router = Router();
// GET /api/lancamentos/projeto/:projetoId - Lançamentos de um projeto
router.get('/projeto/:projetoId', requireAuth, async (req, res) => {
    try {
        const { projetoId } = req.params;
        if (!ObjectId.isValid(projetoId)) {
            return res.status(400).json({ error: 'ID de projeto inválido' });
        }
        const lancamentos = await lancamentosService.getLancamentosByProjeto(projetoId);
        res.json(lancamentos);
    }
    catch (error) {
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
        res.status(201).json(novoLancamento);
    }
    catch (error) {
        console.error('Erro registrar lancamento:', error);
        res.status(500).json({ error: 'Falha registrar lancamento' });
    }
});
// PUT /api/lancamentos/:id - Atualizar um lançamento
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de lançamento inválido' });
        }
        // Extrai apenas campos editáveis
        const { trimestre, descricaoAtividade, localAtendido, valores, dataAtividade } = req.body;
        const updateFields = {};
        if (trimestre !== undefined)
            updateFields.trimestre = trimestre;
        if (descricaoAtividade !== undefined)
            updateFields.descricaoAtividade = descricaoAtividade;
        if (localAtendido !== undefined)
            updateFields.localAtendido = localAtendido;
        if (valores !== undefined)
            updateFields.valores = valores;
        if (dataAtividade !== undefined)
            updateFields.dataAtividade = dataAtividade;
        const lancamentoAtualizado = await lancamentosService.updateLancamento(id, updateFields);
        if (!lancamentoAtualizado) {
            return res.status(404).json({ error: 'Lançamento não encontrado' });
        }
        res.json(lancamentoAtualizado);
    }
    catch (error) {
        console.error('Erro atualizar lancamento:', error);
        res.status(500).json({ error: 'Falha atualizar lancamento' });
    }
});
// DELETE /api/lancamentos/:id - Deletar um lançamento
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de lançamento inválido' });
        }
        const sucesso = await lancamentosService.deleteLancamento(id);
        if (!sucesso) {
            return res.status(404).json({ error: 'Lançamento não encontrado' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Erro deletar lancamento:', error);
        res.status(500).json({ error: 'Falha deletar lancamento' });
    }
});
export default router;
