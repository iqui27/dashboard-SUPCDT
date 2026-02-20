const fs = require('fs');
const csv = require('csv-parser');

async function getParlamentaresFromCSV() {
  const parlamentaresMap = new Map();
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv')
      .pipe(csv())
      .on('data', (row) => {
        const parlamentar = row.PARLAMENTAR?.trim();
        if (parlamentar && parlamentar.toLowerCase() !== 'não se aplica' && parlamentar !== '') {
          parlamentaresMap.set(parlamentar, (parlamentaresMap.get(parlamentar) || 0) + 1);
        }
      })
      .on('end', () => {
        const parlamentares = Array.from(parlamentaresMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        console.log('PARLAMENTARES ENCONTRADOS NA PLANILHA:');
        console.log('='.repeat(60));
        parlamentares.forEach(([nome, count]) => {
          console.log(`"${nome}": ${count} ocorrências`);
        });
        console.log('='.repeat(60));
        console.log(`Total de nomes únicos: ${parlamentares.length}`);
        
        // Salvar em arquivo para análise
        fs.writeFileSync('parlamentares_analysis.json', JSON.stringify(parlamentares, null, 2));
        console.log('\nDados salvos em: parlamentares_analysis.json');
        
        resolve(parlamentares);
      })
      .on('error', reject);
  });
}

getParlamentaresFromCSV().catch(console.error);
