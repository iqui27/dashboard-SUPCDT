import 'dotenv/config';
import { closeMongoClient, getDatabase } from '../db/client.js';
import { normalizeProjetoInput } from '../services/projetos.js';
import { normalizeWifiPointInput } from '../services/wifi.js';
const PROJETOS_COLLECTION = 'projetos_supcdt';
const WIFI_COLLECTION = 'wifi_social_points';
const LANCAMENTOS_COLLECTION = 'lancamentos_supcdt';
async function main() {
    const db = await getDatabase('dashboard_supcdt');
    const now = new Date();
    const projeto = normalizeProjetoInput({
        numeroUnico: 'QA-PROJ-WIFI-LOCAL-001',
        nome: 'Projeto Wi-Fi Social QA Local',
        nomeOSC: 'OSC Ambiente Local',
        status: 'Em Execução',
        responsavelSECTI: 'Equipe QA Local',
        numeroTermo: 'TF-QA-2026/001',
        processoSEI: '00000-000001/2026-11',
        parceiro: 'SECTI DF',
        categoria: 'Convênio',
        dataInicio: '2026-01-15',
        dataFim: '2026-12-15',
        valorTotal: 250000,
        raPerigao: 'Plano Piloto',
        descricao: 'Projeto seedado para validar navegação, detalhe e monitoramento no ambiente E2E local.',
        objetivos: 'Garantir uma jornada funcional reproduzível para QA de projetos e Wi-Fi Social.',
        metas: [
            {
                id: 'qa-meta-1',
                codigo: 'M1',
                descricao: 'Pontos Wi-Fi ativados',
                unidade: 'unidades',
                totalPrevisto: 12,
                previstoPorTrimestre: [3, 3, 3, 3],
                realizadoTotal: 4,
                realizadoPorTrimestre: [2, 2, 0, 0]
            }
        ],
        cronograma: {
            totalTrimestres: 4
        },
        monitoramento: {
            operacional: {
                statusOperacional: 'Em Operação',
                nivelRisco: 'Moderado',
                saudeEntrega: 'Estável',
                precisaAcao: true,
                incidentesAbertos: 1,
                manutencaoStatus: 'Monitoramento Assistido',
                resumoExecutivo: 'Seed local para validar leitura executiva da carteira e detalhe do projeto.',
                bloqueios: ['Aguardando expansão territorial simulada no ambiente local.'],
                proximosPassos: ['Concluir roteiro E2E local de projetos e Wi-Fi Social.'],
                coberturaDetalhada: ['Plano Piloto', 'Asa Norte'],
                responsavelOperacional: 'Equipe QA Local'
            }
        }
    });
    const wifiPoints = [
        normalizeWifiPointInput({
            nome: 'Ponto QA Asa Norte',
            endereco: 'SQN 104 - Asa Norte',
            regiaoAdministrativa: 'Plano Piloto',
            latitude: -15.7624,
            longitude: -47.8786,
            status: 'online',
            coberturaRaioMetros: 300,
            velocidadeMbps: 180,
            usuariosConectados: 96,
            precisaAcao: false,
            statusManutencao: 'em_dia',
            incidentesAbertos: 0,
            responsavelOperacional: 'Equipe QA Local',
            ultimaManutencao: '2026-03-01',
            observacoes: 'Ponto seedado para leitura positiva da operação local.'
        }),
        normalizeWifiPointInput({
            nome: 'Ponto QA Ceilandia',
            endereco: 'QNN 18 - Ceilandia Norte',
            regiaoAdministrativa: 'Ceilândia',
            latitude: -15.8206,
            longitude: -48.1053,
            status: 'offline',
            coberturaRaioMetros: 250,
            velocidadeMbps: 35,
            usuariosConectados: 12,
            precisaAcao: true,
            statusManutencao: 'corretiva',
            incidentesAbertos: 2,
            responsavelOperacional: 'Equipe QA Local',
            ultimaManutencao: '2025-11-20',
            observacoes: 'Ponto seedado para validar criticidade e filtros operacionais.'
        })
    ];
    await db.collection(PROJETOS_COLLECTION).updateOne({ numeroUnico: 'QA-PROJ-WIFI-LOCAL-001' }, {
        $set: {
            ...projeto,
            updatedAt: now
        },
        $setOnInsert: {
            createdAt: now
        }
    }, { upsert: true });
    const projetoPersistido = await db.collection(PROJETOS_COLLECTION).findOne({ numeroUnico: 'QA-PROJ-WIFI-LOCAL-001' });
    if (!projetoPersistido?._id) {
        throw new Error('Projeto seedado não foi encontrado para vincular o lançamento local.');
    }
    await db.collection(LANCAMENTOS_COLLECTION).deleteMany({ projetoId: projetoPersistido._id });
    await db.collection(LANCAMENTOS_COLLECTION).insertOne({
        projetoId: projetoPersistido._id,
        trimestre: 1,
        dataRegistro: now,
        registradoPor: 'smoke.qa',
        valores: [
            {
                metaId: 'qa-meta-1',
                valorRealizado: 4,
                observacao: 'Seed local para relatório Saiweb e histórico do projeto.'
            }
        ],
        localAtendido: 'Plano Piloto',
        descricaoAtividade: 'Ativação inicial da operação local de QA.',
        createdAt: now
    });
    await db.collection(WIFI_COLLECTION).deleteMany({
        nome: { $regex: '^Ponto QA ' }
    });
    await db.collection(WIFI_COLLECTION).insertMany(wifiPoints.map(point => ({
        ...point,
        createdAt: now,
        updatedAt: now
    })));
    console.log('Projeto local seedado: Projeto Wi-Fi Social QA Local');
    console.log(`Pontos Wi-Fi locais seedados: ${wifiPoints.length}`);
    console.log('Lançamento local seedado: trimestre 1 do projeto QA');
}
main()
    .catch(error => {
    console.error('Falha ao seedar dados locais de QA:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
})
    .finally(async () => {
    await closeMongoClient().catch(() => undefined);
});
