import { google } from 'googleapis';
const DEFAULT_RANGE = 'FOMENTOS 2025';
const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
export async function previewSheetUsingServiceAccount(options) {
    const auth = new google.auth.JWT({
        email: options.serviceAccountEmail,
        key: options.privateKey,
        scopes: SHEETS_SCOPE
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = extractSheetId(options.sheetUrl);
    if (!sheetId) {
        throw new Error('URL inválida: não foi possível extrair o ID da planilha.');
    }
    const spreadsheetResponse = await sheets.spreadsheets.get({
        spreadsheetId: sheetId
    });
    const sheetInfos = (spreadsheetResponse.data.sheets ?? [])
        .filter(sheet => sheet.properties?.title)
        .map(sheet => ({
        sheetId: sheetId,
        title: sheet.properties.title
    }));
    const targetSheet = sheetInfos.find(s => s.title === options.range) || sheetInfos[0];
    let selectedSheetPreview;
    if (targetSheet) {
        const rangeToFetch = toA1Range(targetSheet.title);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: rangeToFetch
        });
        const rows = response.data.values || [];
        const rowCount = rows.length;
        const headerRows = rows.slice(0, 3);
        const dataRows = rows.slice(3, 53);
        const normalizedHeaders = normalizeHeaders(headerRows);
        const headers = Object.keys(normalizedHeaders);
        const sampleRows = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = row[idx] ?? '';
            });
            return obj;
        });
        selectedSheetPreview = {
            sheetId: targetSheet.sheetId,
            title: targetSheet.title,
            rowCount,
            headers,
            sampleRows
        };
    }
    return {
        sheets: sheetInfos,
        selectedSheet: selectedSheetPreview
    };
}
function normalizeHeaders(headerRows) {
    const normalized = {};
    let currentHeader = '';
    for (let rowIdx = 0; rowIdx < headerRows.length; rowIdx++) {
        const row = headerRows[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx]?.trim() || '';
            if (cell) {
                currentHeader = cell;
                if (!normalized[currentHeader]) {
                    normalized[currentHeader] = cell;
                }
            }
            else if (currentHeader && !normalized[currentHeader]) {
                normalized[currentHeader] = '';
            }
        }
    }
    // Remove empty headers and ensure unique keys
    const filtered = {};
    Object.entries(normalized).forEach(([key, value]) => {
        if (value && value.trim()) {
            filtered[key] = value;
        }
    });
    return filtered;
}
export function extractSheetId(sheetUrl) {
    if (!sheetUrl)
        return null;
    const trimmed = sheetUrl.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match)
        return match[1];
    if (/^[a-zA-Z0-9-_]+$/.test(trimmed))
        return trimmed;
    return null;
}
function buildValuesRange(input) {
    const trimmed = input?.trim();
    if (!trimmed) {
        return {
            rangeLabel: DEFAULT_RANGE,
            valuesRange: toA1Range(DEFAULT_RANGE)
        };
    }
    if (trimmed.includes('!')) {
        return {
            rangeLabel: trimmed,
            valuesRange: trimmed
        };
    }
    return {
        rangeLabel: trimmed,
        valuesRange: toA1Range(trimmed)
    };
}
function toA1Range(sheetTitle) {
    const sanitizedTitle = sheetTitle.replace(/'/g, "''");
    return `'${sanitizedTitle}'!A:ZZZ`;
}
export async function importSheetUsingServiceAccount(options) {
    const sheetId = extractSheetId(options.sheetUrl);
    if (!sheetId) {
        throw new Error('Não foi possível reconhecer o ID da planilha. Verifique o link informado.');
    }
    const privateKey = options.privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
        email: options.serviceAccountEmail,
        key: privateKey,
        scopes: SHEETS_SCOPE
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const { rangeLabel, valuesRange } = buildValuesRange(options.range);
    console.log('[SheetImport] Requested range:', options.range, '=>', valuesRange);
    const [spreadsheetInfo, valuesResponse] = await Promise.all([
        sheets.spreadsheets.get({ spreadsheetId: sheetId, includeGridData: false }),
        sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: valuesRange, majorDimension: 'ROWS' })
    ]);
    const values = (valuesResponse.data.values ?? []);
    console.log('[SheetImport] Retrieved rows:', values.length);
    if (!values || values.length === 0) {
        throw new Error('A planilha não possui dados no intervalo informado.');
    }
    const fomentos = convertRowsToFomentos(values);
    if (fomentos.length === 0) {
        throw new Error('Nenhum projeto válido foi encontrado na planilha. Verifique o layout e cabeçalhos.');
    }
    const preview = buildPreviewTable(values, options.selectedColumns);
    const title = spreadsheetInfo.data.properties?.title ?? 'Planilha sem título';
    return {
        sheetId,
        title,
        range: rangeLabel,
        fomentos,
        preview
    };
}
function buildPreviewTable(values, selectedColumns, limit = 30) {
    if (values.length < 4) {
        return { headers: [], rows: [], totalRows: 0, columns: [] };
    }
    const headerRows = values.slice(0, 3);
    const dataRows = values
        .slice(3)
        .filter(row => row.some(cell => (cell ?? '').trim() !== ''));
    if (dataRows.length === 0) {
        return { headers: [], rows: [], totalRows: 0, columns: [] };
    }
    const aliasToColumn = new Map();
    const aliasToCandidates = new Map();
    headerRows.forEach(row => {
        row.forEach((cell, columnIndex) => {
            const trimmed = cell?.trim();
            if (!trimmed)
                return;
            const alias = normalizeHeader(trimmed);
            if (!alias)
                return;
            if (!aliasToColumn.has(alias)) {
                aliasToColumn.set(alias, columnIndex);
            }
            if (!aliasToCandidates.has(alias)) {
                aliasToCandidates.set(alias, []);
            }
            aliasToCandidates.get(alias).push(trimmed);
        });
    });
    let aliases = [];
    if (selectedColumns && selectedColumns.length > 0) {
        aliases = selectedColumns
            .map(column => normalizeHeader(column))
            .filter(alias => aliasToColumn.has(alias));
    }
    if (aliases.length === 0) {
        aliases = Array.from(aliasToColumn.keys());
    }
    aliases = Array.from(new Set(aliases))
        .map(alias => ({ alias, index: aliasToColumn.get(alias) ?? Number.MAX_SAFE_INTEGER }))
        .sort((a, b) => a.index - b.index)
        .map(item => item.alias);
    const selectLabel = (alias) => {
        const candidates = aliasToCandidates.get(alias) ?? [];
        if (candidates.length === 0)
            return alias;
        const preferred = candidates.find(value => /[a-zA-Z]/.test(value));
        return preferred ?? candidates[0];
    };
    const columns = aliases.map(alias => ({ alias, label: selectLabel(alias) }));
    const headers = columns.map(column => column.label);
    const rows = dataRows.slice(0, limit).map(row => {
        const output = {};
        columns.forEach(column => {
            const columnIndex = aliasToColumn.get(column.alias);
            if (columnIndex === undefined)
                return;
            output[column.label] = row[columnIndex] ?? '';
        });
        return output;
    });
    return {
        headers,
        rows,
        totalRows: dataRows.length,
        columns
    };
}
const headerMap = {
    'n° termo de fomento': 'numeroTermoFomento',
    'numero do processo sei': 'processoSEI',
    'processo sei': 'processoSEI',
    'processo': 'processoSEI',
    'nome do projeto (no oficio sisconep)': 'projeto',
    'nome do projeto': 'projeto',
    'projeto': 'projeto',
    'situação': 'situacaoProjeto',
    'situacao': 'situacaoProjeto',
    'status do projeto': 'statusProjetoRaw',
    'status projeto': 'statusProjetoRaw',
    'status': 'statusProjetoRaw',
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
    'valor total': 'valorTotalRaw',
    'valor': 'valorTotalRaw',
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
export function convertRowsToFomentos(values) {
    if (values.length < 4)
        return [];
    const headerRows = values.slice(0, 3);
    const dataRows = values.slice(3).filter(row => row.some(cell => (cell ?? '').trim() !== ''));
    if (dataRows.length === 0)
        return [];
    const maxColumns = Math.max(...headerRows.map(row => row.length));
    const headerAliases = Array.from({ length: maxColumns }, () => []);
    headerRows.forEach(row => {
        row.forEach((cell, columnIndex) => {
            const value = cell?.trim();
            if (value)
                headerAliases[columnIndex].push(value);
        });
    });
    const normalizedHeaders = headerAliases.map(aliases => aliases.map(alias => normalizeHeader(alias)));
    if (process.env.NODE_ENV !== 'production') {
        console.log('[SheetImport] Normalized header aliases:', normalizedHeaders);
    }
    const fomentos = [];
    dataRows.forEach((row, index) => {
        const rowData = {};
        normalizedHeaders.forEach((aliasList, columnIndex) => {
            const usedKeys = new Set();
            aliasList.forEach(alias => {
                const mappedKey = headerMap[alias];
                if (!mappedKey || usedKeys.has(mappedKey))
                    return;
                if (rowData[mappedKey])
                    return;
                rowData[mappedKey] = (row[columnIndex] ?? '').trim();
                usedKeys.add(mappedKey);
            });
        });
        const numeroTermo = rowData.numeroTermoFomento || '';
        const processoSEI = rowData.processoSEI || '';
        const projeto = rowData.projeto || '';
        if (!numeroTermo && !projeto)
            return;
        const assinaturaPublicacao = rowData.assinaturaPublicacaoRaw || '';
        const parlamentares = parseParlamentares(rowData.parlamentar || '');
        const regioesAdministrativas = parseRegioes(rowData.regiaoAdministrativa || '');
        const situacaoProjeto = (rowData.situacaoProjeto || '').trim();
        const etapaProjeto = (rowData.etapaProjeto || situacaoProjeto || '').trim();
        const statusDesde = parseBRDate(rowData.statusDesdeRaw || '') || null;
        const diasParado = statusDesde ? Math.max(0, Math.floor((Date.now() - statusDesde.getTime()) / (1000 * 60 * 60 * 24))) : undefined;
        const prorrogacaoDate = parseBRDate(rowData.prorrogacaoPrestacaoContasMais30 || '');
        const prorrogacaoFlag = rowData.prorrogacaoPrestacaoContasMais30?.toLowerCase() === 'sim';
        const fomentoId = buildFomentoId(numeroTermo, processoSEI, projeto, index);
        const fomento = {
            id: fomentoId,
            origin: 'sheet',
            statusProjeto: deriveAssinaturaStatus(assinaturaPublicacao || rowData.statusProjetoRaw || ''),
            assinaturaPublicacao,
            numeroTermoFomento: numeroTermo,
            processoSEI,
            projeto,
            vigenciaInicio: parseBRDate(rowData.vigenciaInicioRaw || ''),
            vigenciaEvento: parseBRDate(rowData.vigenciaEventoRaw || ''),
            vigenciaFinal: parseBRDate(rowData.vigenciaFinalRaw || ''),
            valorTotal: parseBRLCurrency(rowData.valorTotalRaw || '0'),
            tipoSituacaoPagamento: rowData.tipoSituacaoPagamento || '',
            parlamentar: rowData.parlamentar || '',
            parlamentares,
            etapaProjeto,
            situacao: situacaoProjeto,
            notasObs: rowData.notasObs || '',
            osc: rowData.osc || '',
            presidenteOSC: rowData.presidenteOSC || '',
            coordenadorProjeto: rowData.coordenadorProjeto || '',
            regiaoAdministrativa: rowData.regiaoAdministrativa || '',
            regioesAdministrativas,
            responsavelParecer: rowData.responsavelParecer || '',
            responsavelPlanilha: rowData.responsavelPlanilha || '',
            statusPlanilha: rowData.statusPlanilha || '',
            statusDocumentacao: rowData.statusDocumentacao || '',
            statusEscopoParecer: rowData.statusEscopoParecer || '',
            categoria: normalizeCategoria(rowData.categoria || ''),
            tipoPublicoPrevisto: rowData.tipoPublicoPrevisto || '',
            contrapartidasComissao: rowData.contrapartidasComissao || '',
            statusDesde,
            diasParado,
            diasLimite: undefined,
            historicoMovimentacoes: [],
            financeiroParcela1: parseParcelaValue(rowData.financeiroParcela1 || ''),
            financeiroParcela2: parseParcelaValue(rowData.financeiroParcela2 || ''),
            financeiroParcela3: parseParcelaValue(rowData.financeiroParcela3 || ''),
            financeiroParcela4: parseParcelaValue(rowData.financeiroParcela4 || ''),
            relatorioMonitoramentoAvaliacaoComissao: rowData.relatorioMonitoramentoAvaliacaoComissao || '',
            dataPrestacaoContasOSC: parseBRDate(rowData.dataPrestacaoContasOSC || ''),
            prorrogacaoPrestacaoContasMais30: prorrogacaoDate ?? (rowData.prorrogacaoPrestacaoContasMais30 ? prorrogacaoFlag : null)
        };
        fomentos.push(fomento);
    });
    return fomentos;
}
function normalizeHeader(header) {
    return header
        .normalize('NFD')
        .replace(/[\u0000-\u001f]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}
function buildFomentoId(numeroTermo, processo, projeto, index) {
    const fragment = (value) => value
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
function parseBRDate(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const numericMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (numericMatch) {
        const day = Number(numericMatch[1]);
        const month = Number(numericMatch[2]) - 1;
        let year = Number(numericMatch[3]);
        if (year < 100) {
            year += year >= 70 ? 1900 : 2000;
        }
        const date = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(date.getTime()))
            return date;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()))
        return parsed;
    return null;
}
function parseRegioes(value) {
    if (!value)
        return [];
    const normalized = value
        .replace(/\(([^)]+)\)/g, ', $1')
        .replace(/\b\d+\s+(?:locais?|local)\b:?/gi, '')
        .replace(/\b[a-zçãé]+\s+(?:locais?|local)\b:?/gi, '')
        .replace(/\b(?:locais?|local)\b:?/gi, '')
        .replace(/\b(?:e|ou)\b/gi, ',')
        .replace(/[\/]+/g, ',')
        .replace(/[–—]/g, '-')
        .trim();
    return normalized
        .split(/[,;]/)
        .map(item => item.replace(/\s+/g, ' ').trim())
        .map(item => item.replace(/-\s*df$/i, '').trim())
        .filter(item => item.length > 0);
}
function parseParlamentares(value) {
    if (!value)
        return [];
    const segments = value
        .split(/[\/\n]+/)
        .map(segment => segment.trim())
        .filter(segment => segment.length > 0);
    const result = [];
    segments.forEach(segment => {
        const currencyMatch = segment.match(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/i);
        const valor = currencyMatch ? parseBRLCurrency(currencyMatch[0]) : undefined;
        const nome = segment
            .replace(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/gi, '')
            .replace(/^[\-–]+/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (nome) {
            result.push(valor !== undefined && !Number.isNaN(valor) && valor > 0 ? { nome, valor } : { nome });
        }
    });
    return result;
}
function parseBRLCurrency(value) {
    if (!value)
        return 0;
    const normalized = value
        .replace(/R\$/gi, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .replace(/[a-zA-Z\s]/g, '')
        .trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
}
function parseParcelaValue(value) {
    if (!value)
        return '';
    if (value.includes('R$') || /\d+[.,]\d+/.test(value)) {
        return parseBRLCurrency(value);
    }
    return value;
}
function normalizeCategoria(categoria) {
    const normalized = categoria?.trim().toLowerCase();
    if (!normalized)
        return 'Outro';
    if (normalized.includes('emenda'))
        return 'Emenda';
    if (normalized.includes('inex'))
        return 'INEX';
    if (normalized.includes('convênio') || normalized.includes('convenio'))
        return 'Convênio';
    return 'Outro';
}
function deriveAssinaturaStatus(value) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized)
        return 'Não assinado';
    if (normalized.includes('reprov'))
        return 'Reprovado';
    if (normalized.includes('não assinado') || normalized.includes('nao assinado') || normalized === 'não' || normalized === 'nao')
        return 'Não assinado';
    const parsedDate = parseBRDate(value);
    if (parsedDate)
        return 'Assinado';
    if (/\d/.test(normalized))
        return 'Assinado';
    return 'Assinado';
}
