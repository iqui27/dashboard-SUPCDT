// Mapa de normalização de parlamentares
// Variante encontrada -> Nome normalizado

const parlamentaresMap = {
  // Daniel Donizet
  "doutora jane": "Doutora Jane",
  
  // Eduardo Pedrosa - Case variations
  "eduardo pedrosa": "Eduardo Pedrosa",
  "Eduardo Pedrosa": "Eduardo Pedrosa",
  
  // Iolando - Multiple variations
  "iolando": "Iolando",
  "Iolando": "Iolando",
  "iolando, manzoni , martins machado": "Iolando",
  "iolando, manzoni , martins machado": "Iolando",
  "Jaqueline Silva e lolano": "Jaqueline Silva",
  "Joaquim Roriz Neto, Lolando": "Iolando",
  "martins e iolando": "Iolando",
  
  // Jaqueline Silva
  "Jaqueline Silva": "Jaqueline Silva",
  
  // Joaquim Roriz Neto - Case variations
  "joaquin roriz neto": "Joaquim Roriz Neto",
  "Joaquim Roriz Neto, Lolando": "Joaquim Roriz Neto",
  
  // Martins Machado - Case variations
  "MARTINS MACHADO": "Martins Machado",
  "iolando, manzoni , martins machado": "Martins Machado",
  
  // Pastor Daniel - Multiple variations
  "pastol daniel de castro": "Pastor Daniel de Castro",
  "pastor daniel": "Pastor Daniel de Castro",
  "pastor daniel /jaquelina": "Pastor Daniel de Castro",
  "pastor daniel de casto": "Pastor Daniel de Castro",
  "pastor daniel de castro": "Pastor Daniel de Castro",
  
  // Ricardo Vale - Case variations
  "ricardo vale": "Ricardo Vale",
  
  // Thiago Manzoni - Already correct
  "Thiago Manzoni": "Thiago Manzoni",
  
  // Others - Already correct
  "Daniel Donizet": "Daniel Donizet",
  "Fábio Felix": "Fábio Felix",
  "Hermeto": "Hermeto",
  "João Cardoso": "João Cardoso",
  "Max Maciel": "Max Maciel",
  "Paula Belmonte": "Paula Belmonte",
  "Pepa": "Pepa",
  "Rogério Morro da Cruz": "Rogério Morro da Cruz"
};

// Estatísticas da normalização
const stats = {
  totalOriginal: 27,
  totalNormalizados: new Set(Object.values(parlamentaresMap)).size,
  variacoesPorParlamentar: {}
};

// Agrupar variações por parlamentar normalizado
Object.entries(parlamentaresMap).forEach(([variante, normalizado]) => {
  if (!stats.variacoesPorParlamentar[normalizado]) {
    stats.variacoesPorParlamentar[normalizado] = [];
  }
  stats.variacoesPorParlamentar[normalizado].push(variante);
});

console.log('🎯 MAPA DE NORMALIZAÇÃO DE PARLAMENTARES');
console.log('='.repeat(80));

Object.entries(stats.variacoesPorParlamentar).forEach(([normalizado, variacoes]) => {
  console.log(`\n📌 ${normalizado}:`);
  variacoes.forEach(variante => {
    if (variante !== normalizado) {
      console.log(`  ➡️  "${variante}" -> "${normalizado}"`);
    } else {
      console.log(`  ✅ "${variante}" (já normalizado)`);
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log(`📊 ESTATÍSTICAS:`);
console.log(`  • Total original: ${stats.totalOriginal} nomes`);
console.log(`  • Total normalizado: ${stats.totalNormalizados} nomes únicos`);
console.log(`  • Redução: ${stats.totalOriginal - stats.totalNormalizados} nomes`);

// Salvar mapa para uso no código
const fs = require('fs');
fs.writeFileSync('parlamentares_normalization_map.json', JSON.stringify(parlamentaresMap, null, 2));
console.log('\n💾 Mapa salvo em: parlamentares_normalization_map.json');
