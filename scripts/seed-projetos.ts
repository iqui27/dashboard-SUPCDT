import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { DBProjeto } from './server/types/projeto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dashboard_supcdt';

async function seed() {
    console.log('Iniciando seed para projetos SUPCDT...');
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const projetosCollection = db.collection<DBProjeto>('projetos_supcdt');
        const lancamentosCollection = db.collection('lancamentos_supcdt');

        // 1. Limpar as collections (opcional, para ambiente de dev)
        await projetosCollection.deleteMany({});
        await lancamentosCollection.deleteMany({});

        // 2. Criar projetos
        const projetosSeed: DBProjeto[] = [
            {
                nome: "RECICLOTECH 3",
                nomeOSC: "Programando o Futuro",
                responsavelSECTI: "Marco",
                numeroTermo: "Termo de Fomento 001/2023",
                parceiro: "Secretaria de Ciência, Tecnologia e Inovação",
                categoria: "Inclusão Digital",
                status: "Ativo",
                dataInicio: new Date('2023-01-01'),
                dataFim: new Date('2024-12-31'),
                valorTotal: 5000000,
                raPerigao: "Gama, Samambaia e outras RAs",
                descricao: "Programa de recondicionamento de computadores para doação a alunos e escolas.",
                objetivos: "Democratizar o acesso à tecnologia com práticas de sustentabilidade.",
                cronograma: {
                    totalTrimestres: 5 // 15 meses de execução em trimestres? Ajustando para 5.
                },
                metas: [
                    {
                        id: "m_recond",
                        codigo: "1.1",
                        descricao: "Recondicionar e doar equipamentos",
                        unidade: "Unidades",
                        totalPrevisto: 700,
                        previstoPorTrimestre: [140, 140, 140, 140, 140],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    },
                    {
                        id: "m_coleta",
                        codigo: "1.2",
                        descricao: "Coletar resíduos eletrônicos",
                        unidade: "Toneladas",
                        totalPrevisto: 70,
                        previstoPorTrimestre: [14, 14, 14, 14, 14],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    },
                    {
                        id: "m_formacao",
                        codigo: "1.3",
                        descricao: "Pessoas formadas em economia circular e robótica",
                        unidade: "Alunos",
                        totalPrevisto: 320,
                        previstoPorTrimestre: [64, 64, 64, 64, 64],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                nome: "Wi-Fi Social",
                nomeOSC: "A definir",
                responsavelSECTI: "TBD",
                numeroTermo: "Em Planejamento",
                parceiro: "TBD",
                categoria: "Infraestrutura",
                status: "Em Planejamento",
                dataInicio: null,
                dataFim: null,
                valorTotal: 0,
                raPerigao: "Múltiplas",
                descricao: "Disponibilização de Wi-Fi gratuito em áreas públicas",
                objetivos: "Inclusão digital via internet em espaços de grande circulação.",
                cronograma: { totalTrimestres: 4 },
                metas: [
                    {
                        id: "m_pontos_wifi",
                        codigo: "1.1",
                        descricao: "Pontos de Wi-Fi ativados",
                        unidade: "Pontos",
                        totalPrevisto: 100,
                        previstoPorTrimestre: [25, 25, 25, 25],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    }
                ],
                createdAt: new Date()
            },
            {
                nome: "Festival Criativo",
                nomeOSC: "A definir",
                responsavelSECTI: "TBD",
                numeroTermo: "Em Planejamento",
                parceiro: "TBD",
                categoria: "Eventos",
                status: "Em Planejamento",
                dataInicio: null,
                dataFim: null,
                valorTotal: 0,
                raPerigao: "Plano Piloto",
                descricao: "Fomento à economia criativa",
                objetivos: "Promover inovação através da economia criativa",
                cronograma: { totalTrimestres: 4 },
                metas: [
                    {
                        id: "m_publico_fc",
                        codigo: "1.1",
                        descricao: "Público alcançado nos eventos",
                        unidade: "Pessoas",
                        totalPrevisto: 10000,
                        previstoPorTrimestre: [2500, 2500, 2500, 2500],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    }
                ],
                createdAt: new Date()
            },
            {
                nome: "Ciência na Estrada",
                nomeOSC: "A definir",
                responsavelSECTI: "TBD",
                numeroTermo: "Em Planejamento",
                parceiro: "TBD",
                categoria: "Popularização da Ciência",
                status: "Em Planejamento",
                dataInicio: null,
                dataFim: null,
                valorTotal: 0,
                raPerigao: "Entorno",
                descricao: "Carreta da ciência visitando escolas",
                objetivos: "Aproximar ciência das crianças nas RAs e entorno.",
                cronograma: { totalTrimestres: 4 },
                metas: [
                    {
                        id: "m_visitas_cne",
                        codigo: "1.1",
                        descricao: "Escolas visitadas",
                        unidade: "Escolas",
                        totalPrevisto: 40,
                        previstoPorTrimestre: [10, 10, 10, 10],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    }
                ],
                createdAt: new Date()
            },
            {
                nome: "Proclima",
                nomeOSC: "A definir",
                responsavelSECTI: "TBD",
                numeroTermo: "Em Planejamento",
                parceiro: "TBD",
                categoria: "Sustentabilidade",
                status: "Em Planejamento",
                dataInicio: null,
                dataFim: null,
                valorTotal: 0,
                raPerigao: "DF",
                descricao: "Monitoramento e mitigação climática",
                objetivos: "Aplicar tecnologia em favor do meio ambiente",
                cronograma: { totalTrimestres: 4 },
                metas: [
                    {
                        id: "m_estacoes",
                        codigo: "1.1",
                        descricao: "Estações de monitoramento instaladas",
                        unidade: "Estações",
                        totalPrevisto: 20,
                        previstoPorTrimestre: [5, 5, 5, 5],
                        realizadoPorTrimestre: [],
                        realizadoTotal: 0
                    }
                ],
                createdAt: new Date()
            }
        ];

        await projetosCollection.insertMany(projetosSeed);
        console.log(`Seed concluído com sucesso. Inseridos ${projetosSeed.length} projetos.`);
    } catch (error) {
        console.error('Erro no seed:', error);
    } finally {
        await client.close();
    }
}

seed();
