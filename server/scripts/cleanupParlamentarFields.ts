import { getMongoClient } from '../db/client.js';

interface CleanupOptions {
  dryRun: boolean;
  collections: string[];
}

function parseArguments(): CleanupOptions {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    dryRun: false,
    collections: ['custom_projects', 'oscs'] // Ambas as coleções têm campos de parlamentar
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--collections') {
      options.collections = args[++i]?.split(',') || ['custom_projects', 'oscs'];
      continue;
    }
  }

  return options;
}

async function cleanupParlamentarFields() {
  console.log('🧹 Limpando campos redundantes de parlamentar do banco de dados...');
  
  const options = parseArguments();
  
  try {
    const client = await getMongoClient();
    const db = client.db('secti-dashboard');

    console.log(`\n📊 Coleções: ${options.collections.join(', ')}`);
    console.log(`🔍 Modo: ${options.dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}`);

    let totalModified = 0;

    for (const collectionName of options.collections) {
      const collection = db.collection(collectionName);
      console.log(`\n📋 Processando coleção: ${collectionName}`);

      // 1. Contar documentos que têm os campos redundantes
      const withParlamentarField = await collection.countDocuments({ 
        parlamentar: { $exists: true } 
      });
      
      const withParlamentaresField = await collection.countDocuments({ 
        parlamentares: { $exists: true } 
      });

      const withEmendasField = await collection.countDocuments({ 
        emendasParlamentares: { $exists: true } 
      });

      const totalDocuments = await collection.countDocuments();

      console.log(`   Total de documentos: ${totalDocuments}`);
      console.log(`   Com campo 'parlamentar': ${withParlamentarField}`);
      console.log(`   Com campo 'parlamentares': ${withParlamentaresField}`);
      console.log(`   Com campo 'emendasParlamentares': ${withEmendasField}`);

      // 2. Mostrar exemplos dos dados que serão removidos (apenas no dry run)
      if (options.dryRun && (withParlamentarField > 0 || withParlamentaresField > 0)) {
        console.log(`   🔍 Exemplos de documentos que serão modificados:`);
        
        const samples = await collection.find({
          $or: [
            { parlamentar: { $exists: true } },
            { parlamentares: { $exists: true } }
          ]
        }).limit(2).toArray();

        samples.forEach((doc: any, index) => {
          console.log(`     Exemplo ${index + 1}:`);
          console.log(`       ID: ${doc._id}`);
          if (doc.parlamentar) {
            console.log(`       parlamentar: "${doc.parlamentar}"`);
          }
          if (doc.parlamentares) {
            console.log(`       parlamentares: ${JSON.stringify(doc.parlamentares)}`);
          }
          if (doc.emendasParlamentares) {
            console.log(`       emendasParlamentares: ${doc.emendasParlamentares.length} itens`);
          }
        });
      }

      // 3. Executar a limpeza (se não for dry run)
      if (!options.dryRun) {
        console.log(`   🚀 Executando limpeza...`);
        
        // Para custom_projects: remover parlamentar e parlamentares, manter emendasParlamentares
        // Para oscs: remover parlamentar (não tem emendasParlamentares)
        const unsetFields: any = { parlamentar: "" };
        if (collectionName === 'custom_projects') {
          unsetFields.parlamentares = "";
        }

        const updateResult = await collection.updateMany(
          {}, // Todos os documentos
          { $unset: unsetFields }
        );

        console.log(`   ✅ Limpeza concluída:`);
        console.log(`     Documentos modificados: ${updateResult.modifiedCount}`);
        console.log(`     Documentos correspondentes: ${updateResult.matchedCount}`);
        
        totalModified += updateResult.modifiedCount;
        
        if (updateResult.modifiedCount > 0) {
          console.log(`     🎯 Campos removidos: ${Object.keys(unsetFields).join(', ')}`);
          if (collectionName === 'custom_projects') {
            console.log(`     💡 Mantido: emendasParlamentares (campo correto)`);
          }
        }
      } else {
        console.log(`   ⚠️  MODO DRY RUN: Nenhuma alteração realizada.`);
      }
    }

    if (!options.dryRun) {
      console.log(`\n🎉 RESUMO DA LIMPEZA:`);
      console.log(`   Total de documentos modificados: ${totalModified}`);
      console.log(`   Coleções processadas: ${options.collections.length}`);
      console.log(`   ✅ Campos redundantes removidos com sucesso!`);
    }

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    process.exit(1);
  } finally {
    const client = await getMongoClient();
    await client.close();
  }
}

// Executar script
cleanupParlamentarFields().catch(console.error);
