interface SheetRow {
  [key: string]: string;
}

export interface SheetProject {
  id: string;
  rowNumber: number;
  raw: SheetRow;
}

export interface ParlamentarProject {
  projectName: string;
  parlamentares: string[];
}

export interface SheetFetchResult {
  projects: SheetProject[];
  fetchedAt: string | null;
}

const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY ?? '';
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID ?? process.env.GOOGLE_SHEETS_SHEET_ID ?? '';
const GOOGLE_SHEETS_RANGE = process.env.GOOGLE_SHEETS_RANGE ?? process.env.GOOGLE_SHEETS_RANGE_READ ?? 'A1:AE';
const HEADER_ROWS = 3;

const headerMap: Record<string, keyof SheetRow | null> = {
  'n° termo de fomento': 'numeroTermoFomento',
  'numero do processo sei': 'processoSEI',
  'processo sei': 'processoSEI',
  'nome do projeto (no oficio sisconep)': 'projeto',
  'nome do projeto': 'projeto',
  'situação': 'situacaoProjeto',
  'situacao': 'situacaoProjeto',
  'status do projeto': 'statusProjetoRaw',
  'status projeto': 'statusProjetoRaw',
  'desde': 'statusDesdeRaw',
  'data desde': 'statusDesdeRaw',
  'data do inicio do periodo de execucao': 'vigenciaInicioRaw',
  'inicio': 'vigenciaInicioRaw',
  'em caso de evento quais datas?': 'vigenciaEventoRaw',
  'evento / producao': 'vigenciaEventoRaw',
  'data do evento apresentado no plano de trabalho': 'vigenciaFinalRaw',
  'final': 'vigenciaFinalRaw',
  'valor total do termo de fomento': 'valorTotalRaw',
  'valor total do fomento': 'valorTotalRaw',
  'valor total do termo de fomento do fomento': 'valorTotalRaw',
  'recursos': 'valorTotalRaw',
  'numero da publicacao do fomento no site': 'assinaturaPublicacaoRaw',
  'tipo / situacao do pagamento': 'tipoSituacaoPagamento',
  'situacao da emenda': 'tipoSituacaoPagamento',
  'parlamentar': 'parlamentar',
  'nome do parlamentar': 'parlamentar',
  'osc': 'osc',
  'nome da osc': 'osc',
  'presidente da osc': 'presidenteOSC',
  'nome do repesentante da osc': 'presidenteOSC',
  'coordenador do projeto': 'coordenadorProjeto',
  'nome e telefone do coordenador do projeto': 'coordenadorProjeto',
  'regiao administrativa (local da realizacao)': 'regiaoAdministrativa',
  'cidade que sera realizado o evento': 'regiaoAdministrativa',
  'responsavel parecer': 'responsavelParecer',
  'responsaveis parecer': 'responsavelParecer',
  'tecnicos que estao analizando escopo do projeto parecer e documentacao': 'responsavelParecer',
  'responsavel planilha': 'responsavelPlanilha',
  'tecnicos que estao analizando escopo do projeto planilha e documentacao': 'responsavelPlanilha',
  'status planilha': 'statusPlanilha',
  'status da planilha do escopo do projeto': 'statusPlanilha',
  'status documentacao': 'statusDocumentacao',
  'status da analise da documentacao do projeto': 'statusDocumentacao',
  'status escopo do parecer': 'statusEscopoParecer',
  'status da analise do parecer': 'statusEscopoParecer',
  'status do projeto (resumo)': 'etapaProjeto',
  'status do projeto resumo': 'etapaProjeto',
  'etapa do projeto (resumo)': 'etapaProjeto',
  'categoria': 'categoria',
  'tipo de receita': 'categoria',
  'notas/obs': 'notasObs',
  'observacoes pertinentes aos andamentos do projeto': 'notasObs',
  'tipo e publico previsto': 'tipoPublicoPrevisto',
  'quantidade de atendidos diretos': 'tipoPublicoPrevisto',
  'contrapartidas / comissao': 'contrapartidasComissao',
  'contrapartida da osc e valor': 'contrapartidasComissao',
  '1ª parcela': 'financeiroParcela1',
  '2ª parcela': 'financeiroParcela2',
  '3ª parcela': 'financeiroParcela3',
  '4ª parcela': 'financeiroParcela4',
  'relatorio de mon. e avaliacao da comissao nomeada': 'relatorioMonitoramentoAvaliacaoComissao',
  'data em que a osc apresentou a prestacao de contas': 'dataPrestacaoContasOSC',
  'prorrogacao da apresentacao da prestacao de contas, se necessario (+ 30 dias)': 'prorrogacaoPrestacaoContasMais30'
};

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function buildSheetProjectId(index: number, numeroTermo: string, processo: string, projeto: string): string {
  const fragment = (value: string) => value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const parts = [numeroTermo, processo, projeto]
    .map(value => fragment(value || ''))
    .filter(Boolean);

  const base = parts.join('-') || `projeto-${index + 1}`;
  return `sheet-${base}-${index + 1}`;
}

export async function fetchSheetProjects(): Promise<SheetFetchResult> {
  if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID) {
    console.warn('Google Sheets credentials not configured. Skipping sheet fetch.');
    return { projects: [], fetchedAt: null };
  }

  const encodedRange = encodeURIComponent(GOOGLE_SHEETS_RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodedRange}?key=${GOOGLE_SHEETS_API_KEY}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheets data (${response.status} ${response.statusText})`);
  }

  const payload = await response.json() as { values?: string[][] };
  const rows = payload.values ?? [];

  if (rows.length <= HEADER_ROWS) {
    return { projects: [], fetchedAt: new Date().toISOString() };
  }

  const headerRows = rows.slice(0, HEADER_ROWS);
  const dataRows = rows.slice(HEADER_ROWS).filter(row => row.some(cell => (cell ?? '').trim() !== ''));
  const maxColumns = Math.max(...headerRows.map(row => row.length));
  const headerAliases = Array.from({ length: maxColumns }, () => [] as string[]);

  headerRows.forEach(row => {
    row.forEach((cell, columnIndex) => {
      const value = cell?.trim();
      if (value) {
        headerAliases[columnIndex].push(value);
      }
    });
  });

  const normalizedHeaders = headerAliases.map(aliasList => aliasList.map(alias => normalizeHeader(alias)));

  const projects: SheetProject[] = [];

  dataRows.forEach((row, index) => {
    const rowData: SheetRow = {};

    normalizedHeaders.forEach((aliasList, columnIndex) => {
      aliasList.forEach(alias => {
        const mappedKey = headerMap[alias];
        if (!mappedKey) return;
        rowData[mappedKey] = (row[columnIndex] ?? '').trim();
      });
    });

    const numeroTermo = rowData.numeroTermoFomento || '';
    const projeto = rowData.projeto || row[4] || '';

    if (!numeroTermo && !projeto) {
      return;
    }

    projects.push({
      id: buildSheetProjectId(index, numeroTermo, rowData.processoSEI || '', projeto),
      rowNumber: HEADER_ROWS + index + 1,
      raw: rowData
    });
  });

  return {
    projects,
    fetchedAt: new Date().toISOString()
  };
}

// Função para buscar parlamentares da aba "FOMENTOS POR DEPUTADO"
export async function fetchParlamentaresFromSheet(): Promise<ParlamentarProject[]> {
  if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID) {
    console.warn('Google Sheets credentials not configured. Skipping parlamentares fetch.');
    return [];
  }

  const parlamentaresRange = 'FOMENTOS POR DEPUTADO (JAN-MAI)';
  const encodedRange = encodeURIComponent(parlamentaresRange);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodedRange}?key=${GOOGLE_SHEETS_API_KEY}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch parlamentares data (${response.status} ${response.statusText})`);
  }

  const payload = await response.json() as { values?: string[][] };
  const rows = payload.values ?? [];

  if (rows.length <= 1) {
    return [];
  }

  // Cabeçalhos estão na primeira linha
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter(row => row.some(cell => (cell ?? '').trim() !== ''));

  const parlamentarProjects: ParlamentarProject[] = [];

  dataRows.forEach(row => {
    const projectName = row[1]?.trim(); // Nome do projeto na coluna 2
    if (!projectName) return;

    const parlamentares: string[] = [];
    
    // Verificar colunas 4 em diante (índices 3+) para valores ou "X"
    for (let i = 3; i < headers.length; i++) {
      const cellValue = row[i]?.trim();
      const parlamentarName = headers[i]?.trim();
      
      if (parlamentarName && cellValue && cellValue !== '' && cellValue.toUpperCase() !== 'R$ 0,00') {
        parlamentares.push(parlamentarName);
      }
    }

    if (parlamentares.length > 0) {
      parlamentarProjects.push({
        projectName,
        parlamentares
      });
    }
  });

  return parlamentarProjects;
}
