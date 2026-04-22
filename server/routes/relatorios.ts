import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as projetosService from '../services/projetos.js';
import * as lancamentosService from '../services/lancamentos.js';

const router = Router();

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  const normalized = text.replace(/\r?\n/g, ' ').trim();

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) {
    return 'Mensagem\n"Nenhum dado encontrado para o filtro"';
  }

  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))
  ];

  return lines.join('\n');
}

router.get('/csv', requireAuth, async (req, res) => {
  try {
    const { projetoId, trimestre } = req.query;

    let lancamentos = await lancamentosService.getAllLancamentos();

    if (projetoId) {
      lancamentos = lancamentos.filter((lancamento) => lancamento.projetoId.toString() === String(projetoId));
    }

    if (trimestre) {
      lancamentos = lancamentos.filter((lancamento) => lancamento.trimestre === Number(trimestre));
    }

    const projetos = await projetosService.getProjetos();
    const projetoMap = new Map(projetos.map((projeto) => [projeto._id?.toString(), projeto]));
    const dataForCsv: Array<Record<string, unknown>> = [];

    lancamentos.forEach((lancamento) => {
      const projeto = projetoMap.get(lancamento.projetoId.toString());
      if (!projeto) {
        return;
      }

      lancamento.valores.forEach((valor) => {
        const metaInfo = projeto.metas.find((meta) => meta.id === valor.metaId);

        dataForCsv.push({
          DataRegistro: lancamento.dataRegistro.toISOString().split('T')[0],
          Projeto: projeto.nome,
          OSC: projeto.nomeOSC || '',
          TrimestreControle: lancamento.trimestre,
          CodMeta: metaInfo?.codigo || 'N/A',
          DescricaoMeta: metaInfo?.descricao || 'Desconhecida',
          UnidadeMedida: metaInfo?.unidade || 'Un',
          ValorRealizado: valor.valorRealizado,
          DescricaoAtividade: lancamento.descricaoAtividade,
          LocalAtendido: lancamento.localAtendido || '',
          ObservacaoValor: valor.observacao || ''
        });
      });
    });

    const csv = toCsv(dataForCsv);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('relatorio_supcdt_saiweb.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar CSV SUPCDT:', error);
    res.status(500).json({ error: 'Falha ao exportar CSV' });
  }
});

export default router;
