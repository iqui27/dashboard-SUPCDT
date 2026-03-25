import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
const router = Router();
const COLLECTION = 'projetos_supcdt';
/**
 * Helper para encontrar e validar projeto
 */
async function findProjectOrFail(id, res) {
    if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'ID de projeto inválido' });
        return null;
    }
    const db = await getDatabase();
    const col = db.collection(COLLECTION);
    const projeto = await col.findOne({ _id: new ObjectId(id) });
    if (!projeto) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return null;
    }
    const oid = new ObjectId(id);
    return { col, projeto, oid };
}
// ─── ENDPOINTS DE ETAPAS ──────────────────────────────────────────────────
/**
 * POST /:id/etapas — Criar nova etapa
 * ETAP-01
 */
router.post('/:id/etapas', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, percentual, entregaveis } = req.body;
        // Validação
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Campo "nome" obrigatório e deve ser string' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Criar nova etapa
        const novaEtapa = {
            id: randomUUID(),
            nome,
            percentual: percentual ?? 0,
            entregaveis: (entregaveis ?? []).map((e) => ({
                id: randomUUID(),
                nome: e.nome,
                concluido: false
            }))
        };
        // Atualizar projeto
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $push: { etapas: novaEtapa } }, { returnDocument: 'after' });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Falha ao atualizar projeto' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao criar etapa:', error);
        return res.status(500).json({ error: 'Falha ao criar etapa' });
    }
});
/**
 * PUT /:id/etapas/:etapaId — Atualizar etapa
 * ETAP-02
 */
router.put('/:id/etapas/:etapaId', requireAuth, async (req, res) => {
    try {
        const { id, etapaId } = req.params;
        const { nome, percentual } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Construir $set dinamicamente
        const setObj = {};
        if (nome !== undefined)
            setObj['etapas.$[elem].nome'] = nome;
        if (percentual !== undefined)
            setObj['etapas.$[elem].percentual'] = percentual;
        if (Object.keys(setObj).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $set: setObj }, {
            arrayFilters: [{ 'elem.id': etapaId }],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Etapa não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao atualizar etapa:', error);
        return res.status(500).json({ error: 'Falha ao atualizar etapa' });
    }
});
/**
 * DELETE /:id/etapas/:etapaId — Remover etapa
 * ETAP-03
 */
router.delete('/:id/etapas/:etapaId', requireAuth, async (req, res) => {
    try {
        const { id, etapaId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $pull: { etapas: { id: etapaId } } }, { returnDocument: 'after' });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Etapa não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao remover etapa:', error);
        return res.status(500).json({ error: 'Falha ao remover etapa' });
    }
});
/**
 * PATCH /:id/etapas/:etapaId/entregaveis/:entId — Marcar entregável como concluído
 * ETAP-04
 */
router.patch('/:id/etapas/:etapaId/entregaveis/:entId', requireAuth, async (req, res) => {
    try {
        const { id, etapaId, entId } = req.params;
        const { concluido } = req.body;
        // Validação
        if (typeof concluido !== 'boolean') {
            return res.status(400).json({ error: 'Campo "concluido" obrigatório e deve ser boolean' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $set: { 'etapas.$[etapa].entregaveis.$[ent].concluido': concluido } }, {
            arrayFilters: [
                { 'etapa.id': etapaId },
                { 'ent.id': entId }
            ],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Entregável não encontrado' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao atualizar entregável:', error);
        return res.status(500).json({ error: 'Falha ao atualizar entregável' });
    }
});
/**
 * POST /:id/etapas/:etapaId/entregaveis — Adicionar entregável
 * ETAP-05 (adicionar)
 */
router.post('/:id/etapas/:etapaId/entregaveis', requireAuth, async (req, res) => {
    try {
        const { id, etapaId } = req.params;
        const { nome } = req.body;
        // Validação
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Campo "nome" obrigatório e deve ser string' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Criar novo entregável
        const novoEntregavel = {
            id: randomUUID(),
            nome,
            concluido: false
        };
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $push: { 'etapas.$[etapa].entregaveis': novoEntregavel } }, {
            arrayFilters: [{ 'etapa.id': etapaId }],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Etapa não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao adicionar entregável:', error);
        return res.status(500).json({ error: 'Falha ao adicionar entregável' });
    }
});
/**
 * DELETE /:id/etapas/:etapaId/entregaveis/:entId — Remover entregável
 * ETAP-05 (remover)
 */
router.delete('/:id/etapas/:etapaId/entregaveis/:entId', requireAuth, async (req, res) => {
    try {
        const { id, etapaId, entId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $pull: { 'etapas.$[etapa].entregaveis': { id: entId } } }, {
            arrayFilters: [{ 'etapa.id': etapaId }],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Entregável não encontrado' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao remover entregável:', error);
        return res.status(500).json({ error: 'Falha ao remover entregável' });
    }
});
// ─── ENDPOINTS DE ORÇAMENTO ───────────────────────────────────────────────
/**
 * POST /:id/rubricas — Criar nova rubrica
 * ORÇA-01
 */
router.post('/:id/rubricas', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, previsto, executado } = req.body;
        // Validação
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Campo "nome" obrigatório e deve ser string' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Criar nova rubrica
        const novaRubrica = {
            id: randomUUID(),
            nome,
            previsto: previsto ?? 0,
            executado: executado ?? 0,
            aditivos: []
        };
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $push: { rubricas: novaRubrica } }, { returnDocument: 'after' });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Falha ao atualizar projeto' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao criar rubrica:', error);
        return res.status(500).json({ error: 'Falha ao criar rubrica' });
    }
});
/**
 * PUT /:id/rubricas/:rubricaId — Atualizar rubrica
 * ORÇA-02
 */
router.put('/:id/rubricas/:rubricaId', requireAuth, async (req, res) => {
    try {
        const { id, rubricaId } = req.params;
        const { nome, previsto, executado } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Construir $set dinamicamente
        const setObj = {};
        if (nome !== undefined)
            setObj['rubricas.$[elem].nome'] = nome;
        if (previsto !== undefined)
            setObj['rubricas.$[elem].previsto'] = previsto;
        if (executado !== undefined)
            setObj['rubricas.$[elem].executado'] = executado;
        if (Object.keys(setObj).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $set: setObj }, {
            arrayFilters: [{ 'elem.id': rubricaId }],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Rubrica não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao atualizar rubrica:', error);
        return res.status(500).json({ error: 'Falha ao atualizar rubrica' });
    }
});
/**
 * POST /:id/rubricas/:rubricaId/aditivos — Adicionar aditivo
 * ORÇA-03
 */
router.post('/:id/rubricas/:rubricaId/aditivos', requireAuth, async (req, res) => {
    try {
        const { id, rubricaId } = req.params;
        const { descricao, valor, data } = req.body;
        // Validação
        if (!descricao || typeof descricao !== 'string') {
            return res.status(400).json({ error: 'Campo "descricao" obrigatório e deve ser string' });
        }
        if (valor === undefined || typeof valor !== 'number') {
            return res.status(400).json({ error: 'Campo "valor" obrigatório e deve ser number' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Criar novo aditivo
        const novoAditivo = {
            id: randomUUID(),
            descricao,
            valor,
            data: data ? new Date(data) : null
        };
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $push: { 'rubricas.$[elem].aditivos': novoAditivo } }, {
            arrayFilters: [{ 'elem.id': rubricaId }],
            returnDocument: 'after'
        });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Rubrica não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao adicionar aditivo:', error);
        return res.status(500).json({ error: 'Falha ao adicionar aditivo' });
    }
});
/**
 * DELETE /:id/rubricas/:rubricaId — Remover rubrica
 * ORÇA-04
 */
router.delete('/:id/rubricas/:rubricaId', requireAuth, async (req, res) => {
    try {
        const { id, rubricaId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $pull: { rubricas: { id: rubricaId } } }, { returnDocument: 'after' });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Rubrica não encontrada' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao remover rubrica:', error);
        return res.status(500).json({ error: 'Falha ao remover rubrica' });
    }
});
// ─── ENDPOINTS DE CONFIGURAÇÃO DE MÓDULOS ────────────────────────────────
/**
 * PATCH /:id/modulos — Configurar módulos ativos
 * MODU-01
 */
router.patch('/:id/modulos', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        // Validar que há pelo menos um campo boolean
        const validKeys = ['etapas', 'orcamento', 'parceiros', 'riscos', 'governanca', 'indicadores'];
        const hasValidField = validKeys.some(key => key in body && typeof body[key] === 'boolean');
        if (!hasValidField) {
            return res.status(400).json({ error: 'Nenhum módulo válido para atualizar' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Construir $set dinamicamente
        const setObj = {};
        for (const key of validKeys) {
            if (key in body && typeof body[key] === 'boolean') {
                setObj[`modulosAtivos.${key}`] = body[key];
            }
        }
        const updatedProjeto = await col.findOneAndUpdate({ _id: oid }, { $set: setObj }, { returnDocument: 'after' });
        if (!updatedProjeto) {
            return res.status(404).json({ error: 'Falha ao atualizar projeto' });
        }
        return res.json(updatedProjeto);
    }
    catch (error) {
        console.error('Erro ao atualizar módulos:', error);
        return res.status(500).json({ error: 'Falha ao atualizar módulos' });
    }
});
export const modulosEtapasOrcamentoRouter = router;
export default router;
