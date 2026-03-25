import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const COLLECTION = 'projetos_supcdt';
/**
 * Helper: Finds project or returns error
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
    return { col, projeto, oid: new ObjectId(id) };
}
// ─────────────────────────────────────────────────────────────────────────────
// PARCEIROS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /:id/parceiros
 * Cria novo parceiro com nome, papel e status
 */
router.post('/:id/parceiros', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, papel, status } = req.body;
        // Validação de campos obrigatórios
        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({ error: 'Nome do parceiro é obrigatório' });
        }
        if (!papel || typeof papel !== 'string' || !papel.trim()) {
            return res.status(400).json({ error: 'Papel do parceiro é obrigatório' });
        }
        // Validação de status se presente
        const validStatuses = ['Ativo', 'Apoiador', 'Consultor', 'Inativo'];
        let finalStatus = 'Ativo';
        if (status) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `Status inválido. Válidos: ${validStatuses.join(', ')}` });
            }
            finalStatus = status;
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Cria novo parceiro
        const novoParceiro = {
            id: randomUUID(),
            nome: nome.trim(),
            papel: papel.trim(),
            status: finalStatus
        };
        // Atualiza projeto
        await col.updateOne({ _id: oid }, { $push: { parceirosModulo: novoParceiro } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.status(201).json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao criar parceiro:', error);
        res.status(500).json({ error: 'Falha ao criar parceiro' });
    }
});
/**
 * PUT /:id/parceiros/:parceiroId
 * Atualiza nome, papel ou status do parceiro
 */
router.put('/:id/parceiros/:parceiroId', requireAuth, async (req, res) => {
    try {
        const { id, parceiroId } = req.params;
        const { nome, papel, status } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Validação de status se presente
        const validStatuses = ['Ativo', 'Apoiador', 'Consultor', 'Inativo'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Válidos: ${validStatuses.join(', ')}` });
        }
        // Monta $set dinamicamente
        const updates = {};
        if (nome && typeof nome === 'string' && nome.trim()) {
            updates['parceirosModulo.$[elem].nome'] = nome.trim();
        }
        if (papel && typeof papel === 'string' && papel.trim()) {
            updates['parceirosModulo.$[elem].papel'] = papel.trim();
        }
        if (status) {
            updates['parceirosModulo.$[elem].status'] = status;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualização' });
        }
        await col.updateOne({ _id: oid }, { $set: updates }, { arrayFilters: [{ 'elem.id': parceiroId }] });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao atualizar parceiro:', error);
        res.status(500).json({ error: 'Falha ao atualizar parceiro' });
    }
});
/**
 * DELETE /:id/parceiros/:parceiroId
 * Remove parceiro do array
 */
router.delete('/:id/parceiros/:parceiroId', requireAuth, async (req, res) => {
    try {
        const { id, parceiroId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        await col.updateOne({ _id: oid }, { $pull: { parceirosModulo: { id: parceiroId } } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao deletar parceiro:', error);
        res.status(500).json({ error: 'Falha ao deletar parceiro' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// RISCOS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /:id/riscos
 * Cria novo risco com descrição, probabilidade, impacto e status
 */
router.post('/:id/riscos', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, probabilidade, impacto, mitigacao, status } = req.body;
        // Validação de campos obrigatórios
        if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
            return res.status(400).json({ error: 'Descrição do risco é obrigatória' });
        }
        if (!probabilidade || typeof probabilidade !== 'string') {
            return res.status(400).json({ error: 'Probabilidade é obrigatória' });
        }
        if (!impacto || typeof impacto !== 'string') {
            return res.status(400).json({ error: 'Impacto é obrigatório' });
        }
        // Validação de enums
        const validProbabilidades = ['Baixa', 'Média', 'Alta'];
        const validImpactos = ['Baixo', 'Médio', 'Alto'];
        const validStatus = ['Aberto', 'Mitigado', 'Encerrado'];
        if (!validProbabilidades.includes(probabilidade)) {
            return res.status(400).json({ error: `Probabilidade inválida. Válidas: ${validProbabilidades.join(', ')}` });
        }
        if (!validImpactos.includes(impacto)) {
            return res.status(400).json({ error: `Impacto inválido. Válidos: ${validImpactos.join(', ')}` });
        }
        if (status && !validStatus.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Válidos: ${validStatus.join(', ')}` });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Cria novo risco
        const novoRisco = {
            id: randomUUID(),
            descricao: descricao.trim(),
            probabilidade: probabilidade,
            impacto: impacto,
            mitigacao: mitigacao ?? null,
            status: status ?? 'Aberto'
        };
        // Atualiza projeto
        await col.updateOne({ _id: oid }, { $push: { riscos: novoRisco } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.status(201).json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao criar risco:', error);
        res.status(500).json({ error: 'Falha ao criar risco' });
    }
});
/**
 * PUT /:id/riscos/:riscoId
 * Atualiza campos do risco incluindo status (Aberto/Mitigado/Encerrado)
 */
router.put('/:id/riscos/:riscoId', requireAuth, async (req, res) => {
    try {
        const { id, riscoId } = req.params;
        const { descricao, probabilidade, impacto, mitigacao, status } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Validação de enums se presentes
        const validProbabilidades = ['Baixa', 'Média', 'Alta'];
        const validImpactos = ['Baixo', 'Médio', 'Alto'];
        const validStatus = ['Aberto', 'Mitigado', 'Encerrado'];
        if (probabilidade && !validProbabilidades.includes(probabilidade)) {
            return res.status(400).json({ error: `Probabilidade inválida. Válidas: ${validProbabilidades.join(', ')}` });
        }
        if (impacto && !validImpactos.includes(impacto)) {
            return res.status(400).json({ error: `Impacto inválido. Válidos: ${validImpactos.join(', ')}` });
        }
        if (status && !validStatus.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Válidos: ${validStatus.join(', ')}` });
        }
        // Monta $set dinamicamente
        const updates = {};
        if (descricao && typeof descricao === 'string' && descricao.trim()) {
            updates['riscos.$[elem].descricao'] = descricao.trim();
        }
        if (probabilidade) {
            updates['riscos.$[elem].probabilidade'] = probabilidade;
        }
        if (impacto) {
            updates['riscos.$[elem].impacto'] = impacto;
        }
        if (mitigacao !== undefined) {
            updates['riscos.$[elem].mitigacao'] = mitigacao ?? null;
        }
        if (status) {
            updates['riscos.$[elem].status'] = status;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualização' });
        }
        await col.updateOne({ _id: oid }, { $set: updates }, { arrayFilters: [{ 'elem.id': riscoId }] });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao atualizar risco:', error);
        res.status(500).json({ error: 'Falha ao atualizar risco' });
    }
});
/**
 * DELETE /:id/riscos/:riscoId
 * Remove risco do array
 */
router.delete('/:id/riscos/:riscoId', requireAuth, async (req, res) => {
    try {
        const { id, riscoId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        await col.updateOne({ _id: oid }, { $pull: { riscos: { id: riscoId } } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao deletar risco:', error);
        res.status(500).json({ error: 'Falha ao deletar risco' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// DECISÕES DE GOVERNANÇA ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /:id/decisoes
 * Cria nova decisão de governança com título, data e responsável
 */
router.post('/:id/decisoes', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, data, descricao, responsavel } = req.body;
        // Validação de campos obrigatórios
        if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({ error: 'Título da decisão é obrigatório' });
        }
        if (!data || typeof data !== 'string') {
            return res.status(400).json({ error: 'Data da decisão é obrigatória' });
        }
        // Validação de data
        const dateObj = new Date(data);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ error: 'Data inválida' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Cria nova decisão
        const novaDecisao = {
            id: randomUUID(),
            titulo: titulo.trim(),
            data: dateObj,
            descricao: descricao ?? null,
            responsavel: responsavel ?? null
        };
        // Atualiza projeto
        await col.updateOne({ _id: oid }, { $push: { decisoes: novaDecisao } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.status(201).json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao criar decisão:', error);
        res.status(500).json({ error: 'Falha ao criar decisão' });
    }
});
/**
 * PUT /:id/decisoes/:decisaoId
 * Atualiza decisão de governança
 */
router.put('/:id/decisoes/:decisaoId', requireAuth, async (req, res) => {
    try {
        const { id, decisaoId } = req.params;
        const { titulo, data, descricao, responsavel } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Validação de data se presente
        let dateObj = null;
        if (data) {
            dateObj = new Date(data);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ error: 'Data inválida' });
            }
        }
        // Monta $set dinamicamente
        const updates = {};
        if (titulo && typeof titulo === 'string' && titulo.trim()) {
            updates['decisoes.$[elem].titulo'] = titulo.trim();
        }
        if (dateObj) {
            updates['decisoes.$[elem].data'] = dateObj;
        }
        if (descricao !== undefined) {
            updates['decisoes.$[elem].descricao'] = descricao ?? null;
        }
        if (responsavel !== undefined) {
            updates['decisoes.$[elem].responsavel'] = responsavel ?? null;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualização' });
        }
        await col.updateOne({ _id: oid }, { $set: updates }, { arrayFilters: [{ 'elem.id': decisaoId }] });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao atualizar decisão:', error);
        res.status(500).json({ error: 'Falha ao atualizar decisão' });
    }
});
/**
 * DELETE /:id/decisoes/:decisaoId
 * Remove decisão do array
 */
router.delete('/:id/decisoes/:decisaoId', requireAuth, async (req, res) => {
    try {
        const { id, decisaoId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        await col.updateOne({ _id: oid }, { $pull: { decisoes: { id: decisaoId } } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao deletar decisão:', error);
        res.status(500).json({ error: 'Falha ao deletar decisão' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// INDICADORES DE PESQUISA ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /:id/indicadores
 * Cria novo indicador com nome, categoria e série de dados
 */
router.post('/:id/indicadores', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, categoria, serie } = req.body;
        // Validação de campos obrigatórios
        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({ error: 'Nome do indicador é obrigatório' });
        }
        if (!categoria || typeof categoria !== 'string' || !categoria.trim()) {
            return res.status(400).json({ error: 'Categoria do indicador é obrigatória' });
        }
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Cria novo indicador
        const novoIndicador = {
            id: randomUUID(),
            nome: nome.trim(),
            categoria: categoria.trim(),
            serie: (serie ?? [])
        };
        // Atualiza projeto
        await col.updateOne({ _id: oid }, { $push: { indicadores: novoIndicador } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.status(201).json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao criar indicador:', error);
        res.status(500).json({ error: 'Falha ao criar indicador' });
    }
});
/**
 * PUT /:id/indicadores/:indicadorId
 * Atualiza dados do indicador (nome, categoria, série)
 */
router.put('/:id/indicadores/:indicadorId', requireAuth, async (req, res) => {
    try {
        const { id, indicadorId } = req.params;
        const { nome, categoria, serie } = req.body;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        // Monta $set dinamicamente
        const updates = {};
        if (nome && typeof nome === 'string' && nome.trim()) {
            updates['indicadores.$[elem].nome'] = nome.trim();
        }
        if (categoria && typeof categoria === 'string' && categoria.trim()) {
            updates['indicadores.$[elem].categoria'] = categoria.trim();
        }
        if (serie !== undefined) {
            updates['indicadores.$[elem].serie'] = (serie ?? []);
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualização' });
        }
        await col.updateOne({ _id: oid }, { $set: updates }, { arrayFilters: [{ 'elem.id': indicadorId }] });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao atualizar indicador:', error);
        res.status(500).json({ error: 'Falha ao atualizar indicador' });
    }
});
/**
 * DELETE /:id/indicadores/:indicadorId
 * Remove indicador do array
 */
router.delete('/:id/indicadores/:indicadorId', requireAuth, async (req, res) => {
    try {
        const { id, indicadorId } = req.params;
        const result = await findProjectOrFail(id, res);
        if (!result)
            return;
        const { col, oid } = result;
        await col.updateOne({ _id: oid }, { $pull: { indicadores: { id: indicadorId } } });
        // Retorna projeto atualizado
        const projetoAtualizado = await col.findOne({ _id: oid });
        res.json(projetoAtualizado);
    }
    catch (error) {
        console.error('Erro ao deletar indicador:', error);
        res.status(500).json({ error: 'Falha ao deletar indicador' });
    }
});
export const modulosParceirosRiscosGovIndRouter = router;
