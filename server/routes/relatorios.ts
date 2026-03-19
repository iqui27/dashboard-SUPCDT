import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as projetosService from '../services/projetos.js';
import * as lancamentosService from '../services/lancamentos.js';
import { parse } from 'json2csv';

const router = Router();

// GET /api/relatorios/csv - Geração manual de CSV (Saiweb)
// Query params opcionais: projetoId, trimestre, start, end
router.get('/csv', requireAuth, async (req, res) => {
    try {
        const { projetoId, trimestre } = req.query;

        let lancamentos = await lancamentosService.getAllLancamentos();

        // Filtros manuais básicos:
        if (projetoId) {
            lancamentos = lancamentos.filter(l => l.projetoId.toString() === projetoId);
        }
        if (trimestre) {
            lancamentos = lancamentos.filter(l => l.trimestre === Number(trimestre));
        }

        // Como precisamos do nome do projeto e da meta, vamos buscar
        const projetos = await projetosService.getProjetos();
        const projetoMap = new Map(projetos.map(p => [p._id?.toString(), p]));

        // Achatando cada "valor" dentro de um lançamento
        const dataForCsv: any[] = [];

        lancamentos.forEach(l => {
            const p = projetoMap.get(l.projetoId.toString());
            if (!p) return;

            l.valores.forEach(v => {
                const metaInfo = p.metas.find(m => m.id === v.metaId);

                dataForCsv.push({
                    DataRegistro: l.dataRegistro.toISOString().split('T')[0],
                    Projeto: p.nome,
                    OSC: p.nomeOSC || '',
                    TrimestreControle: l.trimestre,
                    CodMeta: metaInfo?.codigo || 'N/A',
                    DescricaoMeta: metaInfo?.descricao || 'Desconhecida',
                    UnidadeMedida: metaInfo?.unidade || 'Un',
                    ValorRealizado: v.valorRealizado,
                    DescricaoAtividade: l.descricaoAtividade,
                    LocalAtendido: l.localAtendido || '',
                    ObservacaoValor: v.observacao || ''
                });
            });
        });

        if (dataForCsv.length === 0) {
            dataForCsv.push({ Mensagem: 'Nenhum dado encontrado para o filtro' });
        }

        const csvStr = parse(dataForCsv);
        res.header('Content-Type', 'text/csv');
        res.attachment('relatorio_supcdt_saiweb.csv');
        return res.send(csvStr);

    } catch (error) {
        console.error('Erro exportar CSV:', error);
        res.status(500).json({ error: 'Falha exportar CSV' });
    }
});

// Nota: Relatório PDF da Michele será montado no Frontend via react-to-pdf,
// consumindo a /api/projetos/:id para evitar overhead aqui no Backend.

export default router;
