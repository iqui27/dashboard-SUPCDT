import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function createParlamentaresTable() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti-dashboard');
        console.log('🔧 Criando tabela de parlamentares únicos...');
        // 1. Criar collection de parlamentares
        const parlamentaresCollection = db.collection('parlamentares');
        // Criar índice único no nome normalizado
        await parlamentaresCollection.createIndex({ nomeNormalizado: 1 }, { unique: true });
        await parlamentaresCollection.createIndex({ nome: 1 });
        console.log('✅ Collection parlamentares criada com índices');
        // 2. Inserir parlamentares normalizados
        const parlamentaresNormalizados = [
            "Daniel Donizet",
            "Doutora Jane",
            "Eduardo Pedrosa",
            "Fábio Felix",
            "Hermeto",
            "Iolando",
            "Jaqueline Silva",
            "Joaquim Roriz Neto",
            "João Cardoso",
            "Martins Machado",
            "Max Maciel",
            "Pastor Daniel de Castro",
            "Paula Belmonte",
            "Pepa",
            "Ricardo Vale",
            "Rogério Morro da Cruz",
            "Thiago Manzoni"
        ];
        const parlamentaresToInsert = parlamentaresNormalizados.map(nome => ({
            nome,
            nomeNormalizado: nome.toLowerCase().replace(/\s+/g, '_'),
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const result = await parlamentaresCollection.insertMany(parlamentaresToInsert);
        console.log(`✅ Inseridos ${result.insertedCount} parlamentares únicos`);
        // 3. Criar mapa de nome para ID
        const parlamentaresMap = new Map();
        const insertedParlamentares = await parlamentaresCollection.find({}).toArray();
        insertedParlamentares.forEach(p => {
            parlamentaresMap.set(p.nome, p._id);
        });
        console.log(`✅ Mapa de referências criado com ${parlamentaresMap.size} parlamentares`);
        // 4. Atualizar custom_projects para usar referências
        const customProjectsCollection = db.collection('custom_projects');
        const projects = await customProjectsCollection.find({}).toArray();
        console.log(`🔄 Processando ${projects.length} projetos...`);
        let updatedCount = 0;
        for (const project of projects) {
            const emendasParlamentaresRef = [];
            // Processar emendas existentes
            if (project.emendasParlamentares && Array.isArray(project.emendasParlamentares)) {
                for (const emenda of project.emendasParlamentares) {
                    if (emenda.nome) {
                        // Normalizar o nome
                        const nomeNormalizado = normalizarNomeParlamentar(emenda.nome);
                        const parlamentarId = parlamentaresMap.get(nomeNormalizado);
                        if (parlamentarId) {
                            emendasParlamentaresRef.push({
                                parlamentarId,
                                valor: emenda.valor
                            });
                        }
                        else {
                            console.warn(`⚠️ Parlamentar não encontrado: "${emenda.nome}" -> "${nomeNormalizado}"`);
                        }
                    }
                }
            }
            // Processar campo parlamentar antigo
            if (project.parlamentar && !emendasParlamentaresRef.length) {
                const nomes = separarENormalizar(project.parlamentar);
                for (const nome of nomes) {
                    const parlamentarId = parlamentaresMap.get(nome);
                    if (parlamentarId) {
                        emendasParlamentaresRef.push({
                            parlamentarId,
                            valor: project.valorTotal
                        });
                    }
                }
            }
            // Atualizar projeto se houver emendas
            if (emendasParlamentaresRef.length > 0) {
                await customProjectsCollection.updateOne({ _id: project._id }, {
                    $set: {
                        emendasParlamentares: emendasParlamentaresRef,
                        updatedAt: new Date()
                    },
                    $unset: { parlamentar: 1 } // Remover campo antigo
                });
                updatedCount++;
            }
        }
        console.log(`✅ ${updatedCount} projetos atualizados com referências`);
        // 5. Estatísticas finais
        const totalParlamentares = await parlamentaresCollection.countDocuments();
        const totalProjetosComRef = await customProjectsCollection.countDocuments({
            emendasParlamentares: { $exists: true, $ne: [] }
        });
        console.log('\n📊 ESTATÍSTICAS FINAIS:');
        console.log(`• Parlamentares únicos: ${totalParlamentares}`);
        console.log(`• Projetos com referências: ${totalProjetosComRef}`);
        console.log(`• Projetos atualizados: ${updatedCount}`);
    }
    catch (error) {
        console.error('❌ Erro ao criar tabela de parlamentares:', error);
        throw error;
    }
    finally {
        await client.close();
    }
}
// Funções auxiliares
function normalizarNomeParlamentar(nome) {
    const normalizacaoMap = {
        "doutora jane": "Doutora Jane",
        "eduardo pedrosa": "Eduardo Pedrosa",
        "iolando": "Iolando",
        "Lolando": "Iolando",
        "lolano": "Iolando",
        "Jaqueline Silva": "Jaqueline Silva",
        "jaquelina": "Jaqueline Silva",
        "joaquin roriz neto": "Joaquim Roriz Neto",
        "manzoni": "Thiago Manzoni",
        "MARTINS MACHADO": "Martins Machado",
        "martins": "Martins Machado",
        "martins machado": "Martins Machado",
        "pastol daniel de castro": "Pastor Daniel de Castro",
        "pastor daniel": "Pastor Daniel de Castro",
        "pastor daniel de casto": "Pastor Daniel de Castro",
        "pastor daniel de castro": "Pastor Daniel de Castro",
        "ricardo vale": "Ricardo Vale",
        "Daniel Donizet": "Daniel Donizet",
        "Fábio Felix": "Fábio Felix",
        "Hermeto": "Hermeto",
        "João Cardoso": "João Cardoso",
        "Max Maciel": "Max Maciel",
        "Paula Belmonte": "Paula Belmonte",
        "Pepa": "Pepa",
        "Rogério Morro da Cruz": "Rogério Morro da Cruz",
        "Thiago Manzoni": "Thiago Manzoni"
    };
    return normalizacaoMap[nome.trim()] || nome.trim();
}
function separarENormalizar(texto) {
    if (!texto)
        return [];
    // Casos especiais de múltiplos
    const multiplasMap = {
        "martins e iolando": ["Iolando", "Martins Machado"],
        "Jaqueline Silva e lolano": ["Jaqueline Silva", "Iolando"],
        "Joaquim Roriz Neto, Lolando": ["Joaquim Roriz Neto", "Iolando"],
        "iolando, manzoni , martins machado": ["Iolando", "Thiago Manzoni", "Martins Machado"],
        "pastor daniel /jaquelina": ["Pastor Daniel de Castro", "Jaqueline Silva"]
    };
    const textoLimpo = texto.trim();
    if (multiplasMap[textoLimpo]) {
        return multiplasMap[textoLimpo];
    }
    // Tentar separar por vírgula, "e", "/"
    const separadores = [/,/, / e /i, / \//i];
    let partes = [textoLimpo];
    separadores.forEach(sep => {
        partes = partes.flatMap(parte => parte.split(sep));
    });
    return partes
        .map(parte => parte.trim())
        .filter(parte => parte && parte.toLowerCase() !== 'não se aplica')
        .map(parte => normalizarNomeParlamentar(parte))
        .filter((item, index, arr) => arr.indexOf(item) === index); // Remover duplicados
}
// Executar script
createParlamentaresTable()
    .then(() => {
    console.log('\n🎉 Script concluído com sucesso!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n💥 Script falhou:', error);
    process.exit(1);
});
