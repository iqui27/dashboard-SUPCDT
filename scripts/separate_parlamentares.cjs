const fs = require('fs');
const csv = require('csv-parser');

// Função para separar múltiplos parlamentares
function separarParlamentares(texto) {
  if (!texto) return [];
  
  const separadores = [/,/, / e /i, / \//i, / e /i];
  let nomes = [texto];
  
  separadores.forEach(sep => {
    nomes = nomes.flatMap(nome => nome.split(sep));
  });
  
  return nomes
    .map(nome => nome.trim())
    .filter(nome => nome && nome.toLowerCase() !== 'não se aplica');
}

async function analisarParlamentares() {
  const parlamentaresMap = new Map();
  const multiplasEntries = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv')
      .pipe(csv())
      .on('data', (row) => {
        const parlamentar = row.PARLAMENTAR?.trim();
        if (parlamentar && parlamentar.toLowerCase() !== 'não se aplica' && parlamentar !== '') {
          const separados = separarParlamentares(parlamentar);
          
          if (separados.length > 1) {
            multiplasEntries.push({
              original: parlamentar,
              separados: separados,
              projeto: row.PROJETO,
              valor: row.VALOR
            });
          }
          
          separados.forEach(nome => {
            parlamentaresMap.set(nome, (parlamentaresMap.get(nome) || 0) + 1);
          });
        }
      })
      .on('end', () => {
        const parlamentares = Array.from(parlamentaresMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        console.log('🔍 ANÁLISE COM SEPARAÇÃO DE MÚLTIPLOS PARLAMENTARES');
        console.log('='.repeat(80));
        
        console.log('\n📋 ENTRADAS COM MÚLTIPLOS PARLAMENTARES:');
        console.log('-'.repeat(80));
        multiplasEntries.forEach((entry, index) => {
          console.log(`\n${index + 1}. Original: "${entry.original}"`);
          console.log(`   Projeto: ${entry.projeto}`);
          console.log(`   Valor: ${entry.valor}`);
          console.log(`   Separados: ${entry.separados.map(p => `"${p}"`).join(', ')}`);
        });
        
        console.log('\n📊 PARLAMENTARES ÚNICOS (APÓS SEPARAÇÃO):');
        console.log('-'.repeat(80));
        parlamentares.forEach(([nome, count]) => {
          console.log(`"${nome}": ${count} ocorrências`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log(`📈 ESTATÍSTICAS:`);
        console.log(`  • Entradas com múltiplos: ${multiplasEntries.length}`);
        console.log(`  • Total de ocorrências (com separação): ${parlamentares.reduce((sum, [_, count]) => sum + count, 0)}`);
        console.log(`  • Nomes únicos (após separação): ${parlamentares.length}`);
        
        // Salvar dados
        const dados = {
          multiplasEntries,
          parlamentaresUnicos: parlamentares,
          estatisticas: {
            totalMultiplas: multiplasEntries.length,
            totalOcorrencias: parlamentares.reduce((sum, [_, count]) => sum + count, 0),
            totalUnicos: parlamentares.length
          }
        };
        
        fs.writeFileSync('parlamentares_separated.json', JSON.stringify(dados, null, 2));
        console.log('\n💾 Dados salvos em: parlamentares_separated.json');
        
        resolve(dados);
      })
      .on('error', reject);
  });
}

analisarParlamentares().catch(console.error);
