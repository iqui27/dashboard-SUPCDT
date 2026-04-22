import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/client.js';
import { ObjectId } from 'mongodb';
import { fetchSheetProjects, fetchParlamentaresFromSheet, type SheetProject } from '../services/sheetFomentos.js';

const migrationRouter = Router();

interface MigrationStatus {
  totalProjects: number;
  migratedProjects: number;
  pendingProjects: number;
  lastSyncDate?: string;
  errors: string[];
  skippedProjects?: string[]; // Adicionar nomes dos projetos pulados
}

interface ProjectFieldAnalysis {
  projectId: string;
  projectName: string;
  missingFields: string[];      // Campos que existem na planilha mas não no BD
  emptyFields: string[];        // Campos que estão vazios/null no BD
  differentFields: {            // Campos com valores diferentes
    field: string;
    dbValue: any;
    sheetValue: any;
  }[];
  canPopulate: boolean;         // Se tem campos para popular
  hasConflicts: boolean;        // Se tem conflitos para substituir
}

interface SyncConflict {
  projectId: string;
  projectName: string;
  field: string;
  sheetValue: any;
  dbValue: any;
  needsApproval: boolean;
}

// GET /api/migration/status - Verificar status da migração
migrationRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    
    // Buscar projetos da planilha
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    
    // Buscar projetos do MongoDB
    const dbProjects = await db.collection('custom_projects').find({}).toArray();
    
    const migratedProjectNames = new Set(
      dbProjects.map((p: any) => p.projeto?.toLowerCase().trim()).filter(Boolean)
    );
    
    // Encontrar quais projetos da planilha já existem no BD (pulados)
    const skippedProjects: string[] = [];
    sheetProjects.forEach((project: SheetProject) => {
      const projectName = project.raw.projeto?.trim();
      if (projectName && migratedProjectNames.has(projectName.toLowerCase())) {
        skippedProjects.push(projectName);
      }
    });
    
    const totalProjects = sheetProjects.length;
    const migratedProjects = migratedProjectNames.size;
    const pendingProjects = totalProjects - migratedProjects;
    
    const status: MigrationStatus = {
      totalProjects,
      migratedProjects,
      pendingProjects,
      skippedProjects, // Adicionar lista de projetos pulados
      errors: []
    };
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get migration status' });
  }
});

// POST /api/migration/migrate-all - Migrar todos os projetos da planilha
migrationRouter.post('/migrate-all', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    
    const results = {
      migrated: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    for (const project of sheetProjects) {
      try {
        // Verificar se já existe
        const existing = await db.collection('custom_projects').findOne({
          projeto: { $regex: new RegExp(`^${project.raw.projeto}$`, 'i') }
        });
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        // Preparar documento para migração
        const doc = {
          ...project.raw,
          origin: 'migrated_from_sheet',
          migratedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Inserir no MongoDB
        await db.collection('custom_projects').insertOne(doc);
        results.migrated++;
        
      } catch (error) {
        const errorMsg = `Failed to migrate project "${project.raw.projeto}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }
    
    res.json({
      message: `Migration completed: ${results.migrated} migrated, ${results.skipped} skipped, ${results.errors.length} errors`,
      ...results
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to migrate projects' });
  }
});

// POST /api/migration/migrate/:projectName - Migrar projeto específico
migrationRouter.post('/migrate/:projectName', async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params as { projectName: string };
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    
    const project = sheetProjects.find((p: SheetProject) => 
      p.raw.projeto?.toLowerCase().trim() === projectName.toLowerCase().trim()
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found in sheet' });
    }
    
    const db = await getDatabase();
    
    // Verificar se já existe
    const existing = await db.collection('custom_projects').findOne({
      projeto: { $regex: new RegExp(`^${project.raw.projeto}$`, 'i') }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Project already exists in database' });
    }
    
    // Migrar projeto
    const doc = {
      ...project.raw,
      origin: 'migrated_from_sheet',
      migratedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('custom_projects').insertOne(doc);
    
    res.status(201).json({
      message: 'Project migrated successfully',
      projectId: result.insertedId.toHexString(),
      projectName: project.raw.projeto
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to migrate project' });
  }
});

// GET /api/migration/analyze-existing - Analisar projetos existentes vs planilha
migrationRouter.get('/analyze-existing', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    const dbProjects = await db.collection('custom_projects').find({}).toArray();

    const analysis: ProjectFieldAnalysis[] = [];
    
    // Campos importantes para verificar
    const importantFields = [
      'situacao', 'statusProjeto', 'statusPlanilha', 'statusDocumentacao',
      'statusEscopoParecer', 'setor', 'responsavelParecer', 'responsavelPlanilha',
      'valorTotal', 'vigenciaInicio', 'vigenciaFinal', 'dataPrestacaoContasOSC',
      'objeto', 'justificativa', 'descricao', 'emendasParlamentares',
      'regioes', 'publicoAlvo', 'beneficiariosDiretos', 'beneficiariosIndiretos'
    ];

    for (const dbProject of dbProjects) {
      const sheetProject = sheetProjects.find((p: SheetProject) => 
        p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
      );

      if (!sheetProject) continue;

      const missingFields: string[] = [];
      const emptyFields: string[] = [];
      const differentFields: { field: string; dbValue: any; sheetValue: any }[] = [];

      // Analisar cada campo importante
      for (const field of importantFields) {
        const sheetValue = sheetProject.raw[field];
        const dbValue = dbProject[field];

        // Campo existe na planilha mas não no BD
        if (sheetValue && sheetValue.trim() !== '' && dbValue === undefined) {
          missingFields.push(field);
        }
        // Campo existe no BD mas está vazio/null
        else if (dbValue === undefined || dbValue === null || dbValue === '') {
          if (sheetValue && sheetValue.trim() !== '') {
            emptyFields.push(field);
          }
        }
        // Campo existe em ambos mas com valores diferentes
        else if (JSON.stringify(sheetValue) !== JSON.stringify(dbValue)) {
          if (sheetValue && sheetValue.trim() !== '') {
            differentFields.push({
              field,
              dbValue,
              sheetValue
            });
          }
        }
      }

      const projectAnalysis: ProjectFieldAnalysis = {
        projectId: dbProject._id?.toString() || '',
        projectName: dbProject.projeto || '',
        missingFields,
        emptyFields,
        differentFields,
        canPopulate: missingFields.length > 0 || emptyFields.length > 0,
        hasConflicts: differentFields.length > 0
      };

      analysis.push(projectAnalysis);
    }

    res.json({
      totalAnalyzed: analysis.length,
      projectsNeedingUpdate: analysis.filter(p => p.canPopulate || p.hasConflicts).length,
      projectsWithMissingFields: analysis.filter(p => p.missingFields.length > 0).length,
      projectsWithEmptyFields: analysis.filter(p => p.emptyFields.length > 0).length,
      projectsWithConflicts: analysis.filter(p => p.hasConflicts).length,
      analysis
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze existing projects' });
  }
});

// POST /api/migration/populate-fields - Popular campos vazios/ausentes
migrationRouter.post('/populate-fields', async (req: Request, res: Response) => {
  try {
    const { selectedProjects, selectedFields } = req.body;

    if (!Array.isArray(selectedProjects) || !Array.isArray(selectedFields)) {
      return res.status(400).json({ error: 'selectedProjects and selectedFields must be arrays' });
    }

    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;

    const results = {
      updated: 0,
      errors: [] as string[]
    };

    for (const projectId of selectedProjects) {
      try {
        // Buscar projeto no BD
        const dbProject = await db.collection('custom_projects').findOne({ 
          _id: new ObjectId(projectId) 
        });

        if (!dbProject) {
          results.errors.push(`Project not found: ${projectId}`);
          continue;
        }

        // Buscar projeto correspondente na planilha
        const sheetProject = sheetProjects.find((p: SheetProject) => 
          p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
        );

        if (!sheetProject) {
          results.errors.push(`Sheet project not found for: ${dbProject.projeto}`);
          continue;
        }

        // Preparar atualização apenas para os campos selecionados
        const updateDoc: Record<string, any> = {
          updatedAt: new Date(),
          lastPopulatedFromSheet: new Date()
        };

        for (const field of selectedFields) {
          const sheetValue = sheetProject.raw[field];
          if (sheetValue && sheetValue.trim() !== '') {
            updateDoc[field] = sheetValue;
          }
        }

        // Atualizar no BD
        await db.collection('custom_projects').updateOne(
          { _id: new ObjectId(projectId) },
          { $set: updateDoc }
        );

        results.updated++;

      } catch (error) {
        const errorMsg = `Failed to populate project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }

    res.json({
      message: `Population completed: ${results.updated} updated, ${results.errors.length} errors`,
      ...results
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to populate fields' });
  }
});

// POST /api/migration/replace-fields - Substituir campos existentes
migrationRouter.post('/replace-fields', async (req: Request, res: Response) => {
  try {
    const { selectedProjects, selectedReplacements } = req.body;

    if (!Array.isArray(selectedProjects) || !Array.isArray(selectedReplacements)) {
      return res.status(400).json({ error: 'selectedProjects and selectedReplacements must be arrays' });
    }

    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;

    const results = {
      updated: 0,
      errors: [] as string[]
    };

    for (const replacement of selectedReplacements) {
      try {
        const { projectId, field } = replacement;

        // Buscar projeto no BD
        const dbProject = await db.collection('custom_projects').findOne({ 
          _id: new ObjectId(projectId) 
        });

        if (!dbProject) {
          results.errors.push(`Project not found: ${projectId}`);
          continue;
        }

        // Buscar projeto correspondente na planilha
        const sheetProject = sheetProjects.find((p: SheetProject) => 
          p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
        );

        if (!sheetProject) {
          results.errors.push(`Sheet project not found for: ${dbProject.projeto}`);
          continue;
        }

        const sheetValue = sheetProject.raw[field];
        if (!sheetValue || sheetValue.trim() === '') {
          results.errors.push(`Empty sheet value for field ${field} in project ${dbProject.projeto}`);
          continue;
        }

        // Atualizar campo específico
        const updateDoc = {
          [field]: sheetValue,
          updatedAt: new Date(),
          lastReplacedFromSheet: new Date()
        };

        await db.collection('custom_projects').updateOne(
          { _id: new ObjectId(projectId) },
          { $set: updateDoc }
        );

        results.updated++;

      } catch (error) {
        const errorMsg = `Failed to replace field: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }

    res.json({
      message: `Replacement completed: ${results.updated} updated, ${results.errors.length} errors`,
      ...results
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to replace fields' });
  }
});

// GET /api/migration/full-comparison - Comparação completa BD vs Planilha
migrationRouter.get('/full-comparison', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    const dbProjects = await db.collection('custom_projects').find({}).toArray();

    const fullComparison: {
      projectId: string;
      projectName: string;
      status: 'identical' | 'missing_fields' | 'different_values' | 'both' | 'missing_in_sheet';
      missingInDB: string[];
      missingInSheet: string[];
      differentValues: { field: string; dbValue: any; sheetValue: any }[];
      totalDifferences: number;
    }[] = [];

    // Lista completa de todos os campos possíveis
    const allPossibleFields = new Set<string>();
    
    // Coletar todos os campos da planilha
    sheetProjects.forEach((project: SheetProject) => {
      Object.keys(project.raw).forEach(field => allPossibleFields.add(field));
    });
    
    // Coletar todos os campos do BD
    dbProjects.forEach((project: any) => {
      Object.keys(project).forEach(field => {
        // Ignorar campos internos do MongoDB
        if (!['_id', 'origin', 'migratedAt', 'createdAt', 'updatedAt', 'lastSyncFromSheet', 'lastPopulatedFromSheet', 'lastReplacedFromSheet'].includes(field)) {
          allPossibleFields.add(field);
        }
      });
    });

    for (const dbProject of dbProjects) {
      const sheetProject = sheetProjects.find((p: SheetProject) => 
        p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
      );

      if (!sheetProject) {
        // Projeto existe no BD mas não na planilha
        fullComparison.push({
          projectId: dbProject._id?.toString() || '',
          projectName: dbProject.projeto || '',
          status: 'missing_in_sheet',
          missingInDB: [],
          missingInSheet: Array.from(allPossibleFields),
          differentValues: [],
          totalDifferences: allPossibleFields.size
        });
        continue;
      }

      const missingInDB: string[] = [];
      const missingInSheet: string[] = [];
      const differentValues: { field: string; dbValue: any; sheetValue: any }[] = [];

      // Comparar cada campo possível
      for (const field of allPossibleFields) {
        const dbValue = dbProject[field];
        const sheetValue = sheetProject.raw[field];

        // Campo existe na planilha mas não no BD
        if (sheetValue !== undefined && sheetValue !== null && sheetValue !== '' && 
            (dbValue === undefined || dbValue === null || dbValue === '')) {
          missingInDB.push(field);
        }
        // Campo existe no BD mas não na planilha
        else if (dbValue !== undefined && dbValue !== null && dbValue !== '' && 
                 (sheetValue === undefined || sheetValue === null || sheetValue === '')) {
          missingInSheet.push(field);
        }
        // Campo existe em ambos mas com valores diferentes
        else if (JSON.stringify(normalizeValue(dbValue)) !== JSON.stringify(normalizeValue(sheetValue))) {
          differentValues.push({
            field,
            dbValue,
            sheetValue
          });
        }
      }

      let status: 'identical' | 'missing_fields' | 'different_values' | 'both' = 'identical';
      if (missingInDB.length > 0 && differentValues.length > 0) {
        status = 'both';
      } else if (missingInDB.length > 0 || missingInSheet.length > 0) {
        status = 'missing_fields';
      } else if (differentValues.length > 0) {
        status = 'different_values';
      }

      fullComparison.push({
        projectId: dbProject._id?.toString() || '',
        projectName: dbProject.projeto || '',
        status,
        missingInDB,
        missingInSheet,
        differentValues,
        totalDifferences: missingInDB.length + missingInSheet.length + differentValues.length
      });
    }

    // Estatísticas gerais
    const stats = {
      totalProjects: fullComparison.length,
      identicalProjects: fullComparison.filter(p => p.status === 'identical').length,
      projectsWithMissingFields: fullComparison.filter(p => p.status === 'missing_fields' || p.status === 'both').length,
      projectsWithDifferentValues: fullComparison.filter(p => p.status === 'different_values' || p.status === 'both').length,
      totalMissingInDB: fullComparison.reduce((sum, p) => sum + p.missingInDB.length, 0),
      totalMissingInSheet: fullComparison.reduce((sum, p) => sum + p.missingInSheet.length, 0),
      totalDifferentValues: fullComparison.reduce((sum, p) => sum + p.differentValues.length, 0),
      totalDifferences: fullComparison.reduce((sum, p) => sum + p.totalDifferences, 0)
    };

    res.json({
      stats,
      comparison: fullComparison
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to perform full comparison' });
  }
});

// POST /api/migration/sync-to-sheet - Sincronizar BD para ficar idêntico à planilha
migrationRouter.post('/sync-to-sheet', async (req: Request, res: Response) => {
  try {
    const { selectedProjects, syncOptions } = req.body;

    if (!Array.isArray(selectedProjects)) {
      return res.status(400).json({ error: 'selectedProjects must be an array' });
    }

    const options = {
      addMissingFields: syncOptions?.addMissingFields !== false, // default: true
      updateDifferentValues: syncOptions?.updateDifferentValues !== false, // default: true
      removeExtraFields: syncOptions?.removeExtraFields === true, // default: false (mais seguro)
      backupBeforeSync: syncOptions?.backupBeforeSync !== false // default: true
    };

    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;

    const results = {
      synced: 0,
      skipped: 0,
      errors: [] as string[],
      backupId: null as string | null,
      changes: [] as { projectId: string; projectName: string; changes: string[] }[]
    };

    // Criar backup antes de sincronizar
    if (options.backupBeforeSync) {
      try {
        const backupCollection = db.collection('custom_projects_backup_' + Date.now());
        const dbProjects = await db.collection('custom_projects').find({}).toArray();
        if (dbProjects.length > 0) {
          await backupCollection.insertMany(dbProjects);
          results.backupId = backupCollection.collectionName;
        }
      } catch (backupError) {
        results.errors.push(`Failed to create backup: ${backupError instanceof Error ? backupError.message : 'Unknown error'}`);
      }
    }

    for (const projectId of selectedProjects) {
      try {
        // Buscar projeto no BD
        const dbProject = await db.collection('custom_projects').findOne({ 
          _id: new ObjectId(projectId) 
        });

        if (!dbProject) {
          results.errors.push(`Project not found: ${projectId}`);
          continue;
        }

        // Buscar projeto correspondente na planilha
        const sheetProject = sheetProjects.find((p: SheetProject) => 
          p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
        );

        if (!sheetProject) {
          results.skipped++;
          continue; // Pular projetos que não existem na planilha
        }

        const updateDoc: Record<string, any> = {
          updatedAt: new Date(),
          lastSyncedToSheet: new Date()
        };

        const projectChanges: string[] = [];

        // Adicionar campos que faltam no BD
        if (options.addMissingFields) {
          Object.keys(sheetProject.raw).forEach(field => {
            const sheetValue = sheetProject.raw[field];
            const dbValue = dbProject[field];

            if (sheetValue !== undefined && sheetValue !== null && sheetValue !== '' && 
                (dbValue === undefined || dbValue === null || dbValue === '')) {
              updateDoc[field] = sheetValue;
              projectChanges.push(`Added field: ${field}`);
            }
          });
        }

        // Atualizar valores diferentes
        if (options.updateDifferentValues) {
          Object.keys(sheetProject.raw).forEach(field => {
            const sheetValue = sheetProject.raw[field];
            const dbValue = dbProject[field];

            if (sheetValue !== undefined && sheetValue !== null && sheetValue !== '' &&
                dbValue !== undefined && dbValue !== null && dbValue !== '' &&
                JSON.stringify(normalizeValue(dbValue)) !== JSON.stringify(normalizeValue(sheetValue))) {
              updateDoc[field] = sheetValue;
              projectChanges.push(`Updated field: ${field}`);
            }
          });
        }

        // Remover campos extras (cuidado - apenas se explicitamente solicitado)
        if (options.removeExtraFields) {
          Object.keys(dbProject).forEach(field => {
            if (!['_id', 'origin', 'migratedAt', 'createdAt', 'updatedAt'].includes(field) &&
                sheetProject.raw[field] === undefined) {
              updateDoc[field] = null; // Remove o campo
              projectChanges.push(`Removed field: ${field}`);
            }
          });
        }

        if (Object.keys(updateDoc).length > 2) { // Mais de apenas updatedAt e lastSyncedToSheet
          await db.collection('custom_projects').updateOne(
            { _id: new ObjectId(projectId) },
            { $set: updateDoc }
          );
          results.synced++;
          results.changes.push({
            projectId,
            projectName: dbProject.projeto || '',
            changes: projectChanges
          });
        } else {
          results.skipped++;
        }

      } catch (error) {
        const errorMsg = `Failed to sync project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }

    res.json({
      message: `Sync completed: ${results.synced} synced, ${results.skipped} skipped, ${results.errors.length} errors`,
      ...results
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to sync to sheet' });
  }
});

// Função auxiliar para normalizar valores para comparação
function normalizeValue(value: any): any {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    // Tratar array vazio como null/vazio para comparação
    if (value.length === 0) return '';
    return value.map(v => normalizeValue(v)).sort();
  }
  if (typeof value === 'object') {
    if (value.nome) return normalizeValue(value.nome);
    return JSON.stringify(value).toLowerCase();
  }
  return value;
}

// GET /api/migration/frontend-comparison - Comparar dados exatos do frontend
migrationRouter.get('/frontend-comparison', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    const dbProjects = await db.collection('custom_projects').find({}).toArray();

    // Campos que o frontend realmente usa (excluindo ID que é gerado dinamicamente)
    const frontendFields = [
      'statusProjeto', 'numeroTermoFomento', 'processoSEI', 
      'projeto', 'osc', 'parlamentar', 'parlamentares', 'categoria', 
      'regiaoAdministrativa', 'regioesAdministrativas', 'vigenciaInicio', 
      'vigenciaFinal', 'valorTotal', 'tipoSituacaoPagamento', 
      'dataPrestacaoContasOSC'
    ];

    // Converter dados da planilha para o formato esperado pelo frontend
    const sheetDataFormatted = sheetProjects.map(sheetProject => {
      const formatted: any = {
        id: `sheet-${sheetProject.raw.projeto?.trim().replace(/\s+/g, '-').toLowerCase()}`,
        origin: 'sheet'
      };
      
      frontendFields.forEach(field => {
        if (field === 'id' || field === 'origin') return;
        
        let value: any = sheetProject.raw[field];
        
        // Converter datas
        if (field.includes('vigencia') || field.includes('data')) {
          if (value && typeof value === 'string') {
            // Tentar converter string de data para Date
            const dateMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              value = new Date(`${year}-${month}-${day}`);
            }
          }
        }
        
        // Converter números
        if (field === 'valorTotal' && value) {
          const numValue = typeof value === 'string' ? 
            parseFloat(value.replace(/[R$\.\s]/g, '').replace(',', '.')) : 
            value;
          value = isNaN(numValue) ? 0 : numValue;
        }
        
        // Converter arrays
        if (field === 'parlamentares' && !value) {
          value = sheetProject.raw.parlamentar ? [{ nome: sheetProject.raw.parlamentar }] : [];
        }
        
        if (field === 'regioesAdministrativas' && !value) {
          value = sheetProject.raw.regiaoAdministrativa ? [sheetProject.raw.regiaoAdministrativa] : [];
        }
        
        formatted[field] = value;
      });
      
      return formatted;
    });

    // Converter dados do MongoDB para o formato do frontend
    const dbDataFormatted = dbProjects.map(dbProject => {
      const formatted: any = { origin: 'mongodb' };
      
      frontendFields.forEach(field => {
        if (field === 'origin') return;
        formatted[field] = dbProject[field];
      });
      
      return formatted;
    });

    // Função para comparar dois objetos de forma segura
    const compareObjects = (obj1: any, obj2: any, fields: string[]) => {
      const differences: { field: string; sheetValue: any; dbValue: any }[] = [];
      
      fields.forEach(field => {
        const val1 = obj1[field];
        const val2 = obj2[field];
        
        // Normalizar valores para comparação
        const normalized1 = normalizeValue(val1);
        const normalized2 = normalizeValue(val2);
        
        // Para arrays, comparar como sets (ordem não importa)
        if (Array.isArray(val1) && Array.isArray(val2)) {
          const set1 = new Set(val1.map(v => normalizeValue(v)));
          const set2 = new Set(val2.map(v => normalizeValue(v)));
          if (set1.size !== set2.size || ![...set1].every(x => set2.has(x))) {
            differences.push({
              field,
              sheetValue: val1,
              dbValue: val2
            });
          }
        } else if (JSON.stringify(normalized1) !== JSON.stringify(normalized2)) {
          differences.push({
            field,
            sheetValue: val1,
            dbValue: val2
          });
        }
      });
      
      return differences;
    };

    // Comparar projetos que existem em ambos
    const comparison: {
      projectName: string;
      sheetId: string;
      dbId: string;
      differences: { field: string; sheetValue: any; dbValue: any }[];
      isIdentical: boolean;
    }[] = [];

    sheetDataFormatted.forEach(sheetProject => {
      const dbProject = dbDataFormatted.find(db => 
        db.projeto?.toLowerCase().trim() === sheetProject.projeto?.toLowerCase().trim()
      );
      
      if (dbProject) {
        const differences = compareObjects(sheetProject, dbProject, frontendFields);
        comparison.push({
          projectName: sheetProject.projeto || 'Sem nome',
          sheetId: sheetProject.id,
          dbId: dbProject.id,
          differences,
          isIdentical: differences.length === 0
        });
      }
    });

    // Estatísticas
    const stats = {
      totalCompared: comparison.length,
      identicalProjects: comparison.filter(p => p.isIdentical).length,
      projectsWithDifferences: comparison.filter(p => !p.isIdentical).length,
      totalDifferences: comparison.reduce((sum, p) => sum + p.differences.length, 0),
      sheetOnlyProjects: sheetDataFormatted.length - comparison.length,
      dbOnlyProjects: dbDataFormatted.length - comparison.length
    };

    // Análise por campo
    const fieldAnalysis: { [key: string]: { differentCount: number; examples: any[] } } = {};
    comparison.forEach(project => {
      project.differences.forEach(diff => {
        if (!fieldAnalysis[diff.field]) {
          fieldAnalysis[diff.field] = { differentCount: 0, examples: [] };
        }
        fieldAnalysis[diff.field].differentCount++;
        if (fieldAnalysis[diff.field].examples.length < 3) {
          fieldAnalysis[diff.field].examples.push({
            project: project.projectName,
            sheetValue: diff.sheetValue,
            dbValue: diff.dbValue
          });
        }
      });
    });

    res.json({
      stats,
      fieldAnalysis,
      comparison: comparison.filter(p => !p.isIdentical), // Apenas os diferentes
      summary: {
        readyToSwitch: stats.projectsWithDifferences === 0,
        confidence: stats.totalCompared > 0 ? (stats.identicalProjects / stats.totalCompared) * 100 : 0
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to compare frontend data' });
  }
});

// POST /api/migration/sync-frontend-fields - Sincronizar campos específicos do frontend
migrationRouter.post('/sync-frontend-fields', async (req: Request, res: Response) => {
  try {
    const { selectedProjects } = req.body;

    if (!Array.isArray(selectedProjects)) {
      return res.status(400).json({ error: 'selectedProjects must be an array' });
    }

    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;

    const results = {
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      changes: [] as { projectId: string; projectName: string; field: string; oldValue: any; newValue: any }[]
    };

    for (const projectId of selectedProjects) {
      try {
        // Buscar projeto no BD
        const dbProject = await db.collection('custom_projects').findOne({ 
          _id: new ObjectId(projectId) 
        });

        if (!dbProject) {
          results.errors.push(`Project not found: ${projectId}`);
          continue;
        }

        // Buscar projeto correspondente na planilha
        const sheetProject = sheetProjects.find((p: SheetProject) => 
          p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
        );

        if (!sheetProject) {
          results.skipped++;
          continue;
        }

        const updateDoc: Record<string, any> = {
          updatedAt: new Date()
        };

        // Sincronizar campos específicos do frontend
        const frontendFields = ['parlamentares', 'regioesAdministrativas'];
        
        frontendFields.forEach(field => {
          let processedValue: any = null;
          
          if (field === 'parlamentares') {
            const parlamentarValue = sheetProject.raw.parlamentar;
            if (parlamentarValue && parlamentarValue.trim()) {
              processedValue = [{ nome: parlamentarValue.trim() }];
            }
          } else if (field === 'regioesAdministrativas') {
            const regiaoValue = sheetProject.raw.regiaoAdministrativa;
            if (regiaoValue && regiaoValue.trim()) {
              processedValue = [regiaoValue.trim()];
            }
          }
          
          // Verificar se precisa atualizar
          const dbValue = dbProject[field];
          const normalizedOld = normalizeValue(dbValue);
          const normalizedNew = normalizeValue(processedValue);
          
          if (JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew)) {
            updateDoc[field] = processedValue;
            results.changes.push({
              projectId,
              projectName: dbProject.projeto || '',
              field,
              oldValue: dbValue,
              newValue: processedValue
            });
          }
        });

        if (Object.keys(updateDoc).length > 1) { // Mais que apenas updatedAt
          await db.collection('custom_projects').updateOne(
            { _id: new ObjectId(projectId) },
            { $set: updateDoc }
          );
          results.updated++;
        } else {
          results.skipped++;
        }

      } catch (error) {
        const errorMsg = `Failed to sync project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }

    res.json({
      message: `Frontend fields sync completed: ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
      ...results
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to sync frontend fields' });
  }
});

// GET /api/migration/sync-conflicts - Verificar conflitos de sincronização
migrationRouter.get('/sync-conflicts', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    const dbProjects = await db.collection('custom_projects').find({}).toArray();
    
    const conflicts: SyncConflict[] = [];
    
    for (const dbProject of dbProjects) {
      const sheetProject = sheetProjects.find((p: SheetProject) => 
        p.raw.projeto?.toLowerCase().trim() === dbProject.projeto?.toLowerCase().trim()
      );
      
      if (!sheetProject) continue;
      
      // Comparar campos relevantes
      const fieldsToCompare = [
        'situacao', 'statusProjeto', 'statusPlanilha', 'statusDocumentacao',
        'statusEscopoParecer', 'setor', 'responsavelParecer', 'responsavelPlanilha',
        'valorTotal', 'vigenciaInicio', 'vigenciaFinal', 'dataPrestacaoContasOSC'
      ];
      
      for (const field of fieldsToCompare) {
        const sheetValue = sheetProject.raw[field];
        const dbValue = dbProject[field];
        
        // Comparação simples (pode ser melhorada)
        if (JSON.stringify(sheetValue) !== JSON.stringify(dbValue)) {
          conflicts.push({
            projectId: dbProject._id?.toString() || '',
            projectName: dbProject.projeto || '',
            field,
            sheetValue,
            dbValue,
            needsApproval: true
          });
        }
      }
    }
    
    res.json({
      totalConflicts: conflicts.length,
      conflicts
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to check sync conflicts' });
  }
});

// POST /api/migration/approve-sync - Aprovar atualizações da planilha
migrationRouter.post('/approve-sync', async (req: Request, res: Response) => {
  try {
    const { conflicts, selectedConflicts } = req.body;
    
    if (!Array.isArray(selectedConflicts)) {
      return res.status(400).json({ error: 'selectedConflicts must be an array' });
    }
    
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    
    const results = {
      updated: 0,
      errors: [] as string[]
    };
    
    for (const conflictIndex of selectedConflicts) {
      try {
        const conflict = conflicts[conflictIndex];
        if (!conflict) continue;
        
        const sheetProject = sheetProjects.find((p: SheetProject) => 
          p.raw.projeto?.toLowerCase().trim() === conflict.projectName.toLowerCase().trim()
        );
        
        if (!sheetProject) {
          results.errors.push(`Sheet project not found: ${conflict.projectName}`);
          continue;
        }
        
        // Atualizar apenas o campo específico
        const updateDoc = {
          [conflict.field]: sheetProject.raw[conflict.field],
          updatedAt: new Date(),
          lastSyncFromSheet: new Date()
        };
        
        await db.collection('custom_projects').updateOne(
          { _id: new ObjectId(conflict.projectId) },
          { $set: updateDoc }
        );
        
        results.updated++;
        
      } catch (error) {
        const errorMsg = `Failed to update conflict ${conflictIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
      }
    }
    
    res.json({
      message: `Sync completed: ${results.updated} updated, ${results.errors.length} errors`,
      ...results
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve sync' });
  }
});

// POST /api/migration/sync-parlamentares - Sincronizar parlamentares da aba específica
migrationRouter.post('/sync-parlamentares', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const parlamentarProjects = await fetchParlamentaresFromSheet();
    const dbProjects = await db.collection('custom_projects').find({}).toArray();

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    console.log(`Found ${parlamentarProjects.length} projects with parlamentares in sheet`);

    for (const sheetProject of parlamentarProjects) {
      try {
        // Buscar projeto correspondente no MongoDB pelo nome (mais flexível)
        let dbProject = dbProjects.find((p: any) => 
          p.projeto?.toLowerCase().trim() === sheetProject.projectName.toLowerCase().trim()
        );

        // Se não encontrar exato, tentar matching parcial
        if (!dbProject) {
          const sheetNameClean = sheetProject.projectName.toLowerCase().replace(/[^\w\s]/g, '').trim();
          dbProject = dbProjects.find((p: any) => {
            const dbNameClean = p.projeto?.toLowerCase().replace(/[^\w\s]/g, '').trim();
            return dbNameClean?.includes(sheetNameClean) || sheetNameClean?.includes(dbNameClean);
          });
        }

        if (!dbProject) {
          notFound++;
          console.log(`Project not found in DB: "${sheetProject.projectName}"`);
          continue;
        }

        // Atualizar parlamentares no MongoDB usando o campo _id do MongoDB
        const parlamentaresArray = sheetProject.parlamentares.map(nome => ({ nome }));
        const parlamentaresString = sheetProject.parlamentares.join(' / ');

        await db.collection('custom_projects').updateOne(
          { id: dbProject.id }, // Usar o campo id custom em vez de _id
          { 
            $set: {
              parlamentares: parlamentaresArray,
              parlamentar: parlamentaresString,
              updatedAt: new Date()
            }
          }
        );

        console.log(`Updated parlamentares for: ${sheetProject.projectName}`);
        updated++;

      } catch (error) {
        const errorMessage = `Error updating ${sheetProject.projectName}: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    res.json({
      message: `Parlamentares sync completed: ${updated} updated, ${notFound} not found, ${errors.length} errors`,
      updated,
      notFound,
      errors,
      totalProcessed: parlamentarProjects.length
    });

  } catch (error) {
    console.error('Failed to sync parlamentares:', error);
    res.status(500).json({ error: 'Failed to sync parlamentares' });
  }
});

// POST /api/migration/sync-all-parlamentares - Sincronizar todos os parlamentares da planilha principal
migrationRouter.post('/sync-all-parlamentares', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sheetResult = await fetchSheetProjects();
    const sheetProjects = sheetResult.projects;
    const dbProjects = await db.collection('custom_projects').find({}).toArray();

    let updated = 0;
    let notFound = 0;
    let emptyParlamentar = 0;
    const errors: string[] = [];

    console.log(`Processing ${sheetProjects.length} projects from sheet`);

    for (const sheetProject of sheetProjects) {
      try {
        const parlamentarValue = sheetProject.raw.parlamentar;
        
        if (!parlamentarValue || parlamentarValue.trim() === '') {
          emptyParlamentar++;
          continue;
        }

        // Buscar projeto correspondente no MongoDB pelo nome
        const dbProject = dbProjects.find((p: any) => 
          p.projeto?.toLowerCase().trim() === sheetProject.raw.projeto?.toLowerCase().trim()
        );

        if (!dbProject) {
          notFound++;
          console.log(`Project not found in DB: ${sheetProject.raw.projeto}`);
          continue;
        }

        // Atualizar parlamentares no MongoDB
        const parlamentaresArray = [{ nome: parlamentarValue.trim() }];
        const parlamentaresString = parlamentarValue.trim();

        await db.collection('custom_projects').updateOne(
          { id: dbProject.id },
          { 
            $set: {
              parlamentares: parlamentaresArray,
              parlamentar: parlamentaresString,
              updatedAt: new Date()
            }
          }
        );

        console.log(`Updated parlamentares for: ${sheetProject.raw.projeto} -> ${parlamentaresString}`);
        updated++;

      } catch (error) {
        const errorMessage = `Error updating ${sheetProject.raw.projeto}: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    res.json({
      message: `All parlamentares sync completed: ${updated} updated, ${notFound} not found, ${emptyParlamentar} empty, ${errors.length} errors`,
      updated,
      notFound,
      emptyParlamentar,
      errors,
      totalProcessed: sheetProjects.length
    });

  } catch (error) {
    console.error('Failed to sync all parlamentares:', error);
    res.status(500).json({ error: 'Failed to sync all parlamentares' });
  }
});

export { migrationRouter };
