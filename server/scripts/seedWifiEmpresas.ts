/**
 * Script para seed de empresas Wi-Fi
 * 
 * Uso:
 * tsx server/scripts/seedWifiEmpresas.ts
 */

import 'dotenv/config';
import { getDatabase } from '../db/client.js';
import type { DBWifiEmpresa } from '../types/wifi.js';

const SEED_EMPRESAS: Array<Omit<DBWifiEmpresa, '_id' | 'createdAt' | 'updatedAt'>> = [
  {
    nome: 'uaifacil',
    contato: 'claudio henrique',
    telefone: '61984272787',
    email: 'claudio@uaifacil.com.br'
  },
  {
    nome: 'maiwifi',
    contato: 'bruna/rafael',
    telefone: '61983236748',
    email: 'bruna@gestaopublicidade.com.br'
  },
  {
    nome: 'clickmidia',
    contato: 'bruna/rafael',
    telefone: '61983236748',
    email: 'bruna@gestaopublicidade.com.br'
  },
  {
    nome: 'mfi',
    contato: 'bruna/rafael',
    telefone: '61983236748',
    email: 'bruna@gestaopublicidade.com.br'
  },
  {
    nome: 'sr midia',
    contato: 'bruna/rafael',
    telefone: '61983236748',
    email: 'bruna@gestaopublicidade.com.br'
  },
  {
    nome: 'conecta',
    contato: 'alesson Silva',
    telefone: '61999227775',
    email: 'alesson@uaisfacil.com.br'
  },
  {
    nome: 'cleanmídia',
    contato: 'felix silva',
    telefone: '991816101',
    email: 'felixestera@gmail.com'
  },
  {
    nome: 'mixdftelecom',
    contato: 'bruno melo',
    telefone: '61998271477',
    email: 'bruno@mixdftelecom.com.br'
  },
  {
    nome: 'mobtv',
    contato: 'pedro',
    telefone: '62 991584939',
    email: 'redes@dsgroupbr.com'
  }
];

async function main() {
  try {
    console.log('🌱 Iniciando seed de empresas Wi-Fi...');
    
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection<DBWifiEmpresa>('wifi_empresas');

    // Verifica se já existem empresas
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Já existem ${existingCount} empresas no banco. Deseja adicionar novas?`);
      console.log('   Para limpar o banco primeiro, execute: tsx server/scripts/clearWifiEmpresas.ts');
      console.log('   Para adicionar duplicatas, o script pode ser modificado.');
    }

    // Prepara documentos com timestamps
    const now = new Date();
    const documentos: DBWifiEmpresa[] = SEED_EMPRESAS.map((empresa) => ({
      ...empresa,
      createdAt: now,
      updatedAt: now
    }));

    // Insere empresas
    const result = await collection.insertMany(documentos);
    
    console.log(`✅ ${result.insertedCount} empresas inseridas com sucesso!`);
    console.log('   IDs criados:');
    for (const id of Object.values(result.insertedIds)) {
      console.log(`   - ${id}`);
    }

    // Lista empresas inseridas
    const empresas = await collection.find({}).sort({ nome: 1 }).toArray();
    console.log('\n📋 Empresas no banco:');
    for (const empresa of empresas) {
      console.log(`   - ${empresa.nome} (${empresa.contato ?? 'sem contato'}) - ${empresa._id}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();