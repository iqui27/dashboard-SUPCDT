import { normalizarParlamentares, gerarResumoParlamentaresNormalizado, getParlamentaresUnicos } from '../src/lib/parlamentaresNormalization';

// Testes da normalização
console.log('🧪 TESTANDO NORMALIZAÇÃO DE PARLAMENTARES');
console.log('='.repeat(80));

const casosDeTeste = [
  'doutora jane',
  'eduardo pedrosa',
  'iolando, manzoni , martins machado',
  'pastor daniel /jaquelina',
  'Joaquim Roriz Neto, Lolando',
  'martins e iolando',
  'Jaqueline Silva e lolano',
  'Thiago Manzoni',
  'pastor daniel de castro'
];

console.log('\n📋 CASOS DE TESTE:');
console.log('-'.repeat(80));
casosDeTeste.forEach((caso, index) => {
  const normalizados = normalizarParlamentares(caso);
  const resumo = gerarResumoParlamentaresNormalizado(normalizados);
  
  console.log(`\n${index + 1}. Original: "${caso}"`);
  console.log(`   Normalizados: [${normalizados.map(n => `"${n}"`).join(', ')}]`);
  console.log(`   Resumo: "${resumo}"`);
});

console.log('\n🏁 LISTA FINAL DE PARLAMENTARES NORMALIZADOS:');
console.log('-'.repeat(80));
const unicos = getParlamentaresUnicos();
unicos.forEach((nome, index) => {
  console.log(`${index + 1}. ${nome}`);
});

console.log('\n📊 ESTATÍSTICAS:');
console.log('-'.repeat(80));
console.log(`Total de parlamentares únicos: ${unicos.length}`);
