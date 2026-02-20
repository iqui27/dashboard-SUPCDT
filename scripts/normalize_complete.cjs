// Mapa completo de normalização com separação de múltiplos parlamentares

const parlamentaresMap = {
  // Daniel Donizet
  "doutora jane": "Doutora Jane",
  
  // Eduardo Pedrosa - Case variations
  "eduardo pedrosa": "Eduardo Pedrosa",
  "Eduardo Pedrosa": "Eduardo Pedrosa",
  
  // Iolando - Multiple variations
  "iolando": "Iolando",
  "Iolando": "Iolando",
  "Lolando": "Iolando",  // Variação de "Lolando"
  "lolano": "Iolando",  // Variação de "lolano"
  "martins e iolando": ["Iolando", "Martins Machado"],  // Separar múltiplos
  
  // Jaqueline Silva
  "Jaqueline Silva": "Jaqueline Silva",
  "Jaqueline Silva e lolano": ["Jaqueline Silva", "Iolando"],  // Separar múltiplos
  "jaquelina": "Jaqueline Silva",  // Variação de "jaquelina"
  
  // Joaquim Roriz Neto - Case variations
  "joaquin roriz neto": "Joaquim Roriz Neto",
  "Joaquim Roriz Neto, Lolando": ["Joaquim Roriz Neto", "Iolando"],  // Separar múltiplos
  
  // Thiago Manzoni
  "manzoni": "Thiago Manzoni",  // Variação separada
  
  // Martins Machado - Case variations
  "MARTINS MACHADO": "Martins Machado",
  "martins": "Martins Machado",  // Variação separada
  "martins machado": "Martins Machado",
  "iolando, manzoni , martins machado": ["Iolando", "Thiago Manzoni", "Martins Machado"],  // Separar múltiplos
  
  // Pastor Daniel - Multiple variations
  "pastol daniel de castro": "Pastor Daniel de Castro",
  "pastor daniel": "Pastor Daniel de Castro",
  "pastor daniel /jaquelina": ["Pastor Daniel de Castro", "Jaqueline Silva"],  // Separar múltiplos
  "pastor daniel de casto": "Pastor Daniel de Castro",
  "pastor daniel de castro": "Pastor Daniel de Castro",
  
  // Ricardo Vale - Case variations
  "ricardo vale": "Ricardo Vale",
  
  // Outros - Já normalizados
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

// Função para normalizar e separar parlamentares
function normalizarParlamentares(texto) {
  if (!texto) return [];
  
  // Se já tem mapeamento direto
  if (parlamentaresMap[texto]) {
    const mapeado = parlamentaresMap[texto];
    return Array.isArray(mapeado) ? mapeado : [mapeado];
  }
  
  // Tentar separar por vírgula, "e", "/"
  const separadores = [/,/, / e /i, / \//i];
  let partes = [texto];
  
  separadores.forEach(sep => {
    partes = partes.flatMap(parte => parte.split(sep));
  });
  
  const normalizados = partes
    .map(parte => parte.trim())
    .filter(parte => parte && parte.toLowerCase() !== 'não se aplica')
    .map(parte => parlamentaresMap[parte] || parte)
    .flatMap(item => Array.isArray(item) ? item : [item]);
  
  return normalizados;
}

// Análise final
const stats = {
  totalOriginal: 27,
  multiplasEntries: 5,
  totalAposSeparacao: 0,
  totalUnicos: new Set()
};

// Processar todas as entradas para gerar estatísticas
Object.keys(parlamentaresMap).forEach(original => {
  const normalizados = normalizarParlamentares(original);
  stats.totalAposSeparacao += normalizados.length;
  normalizados.forEach(nome => stats.totalUnicos.add(nome));
});

console.log('🎯 MAPA COMPLETO DE NORMALIZAÇÃO (COM SEPARAÇÃO)');
console.log('='.repeat(80));

// Mostrar mapeamentos especiais (múltiplos)
const multiplasEntries = Object.entries(parlamentaresMap).filter(([_, valor]) => Array.isArray(valor));

console.log('\n📋 ENTRADAS COM MÚLTIPLOS PARLAMENTARES:');
console.log('-'.repeat(80));
multiplasEntries.forEach(([original, normalizados]) => {
  console.log(`"${original}" → [${normalizados.map(n => `"${n}"`).join(', ')}]`);
});

console.log('\n📊 ESTATÍSTICAS FINAIS:');
console.log('-'.repeat(80));
console.log(`• Original: ${stats.totalOriginal} nomes`);
console.log(`• Entradas múltiplas: ${stats.multiplasEntries}`);
console.log(`• Total após separação: ${stats.totalAposSeparacao} ocorrências`);
console.log(`• Únicos normalizados: ${stats.totalUnicos.size} nomes`);

// Lista final normalizada
console.log('\n🏁 LISTA FINAL NORMALIZADA:');
console.log('-'.repeat(80));
Array.from(stats.totalUnicos).sort().forEach((nome, index) => {
  console.log(`${index + 1}. ${nome}`);
});

// Salvar mapa completo
const fs = require('fs');
const mapaCompleto = {
  mapa: parlamentaresMap,
  estatisticas: {
    ...stats,
    totalUnicos: stats.totalUnicos.size
  },
  listaFinal: Array.from(stats.totalUnicos).sort()
};

fs.writeFileSync('parlamentares_normalization_complete.json', JSON.stringify(mapaCompleto, null, 2));
console.log('\n💾 Mapa completo salvo em: parlamentares_normalization_complete.json');
