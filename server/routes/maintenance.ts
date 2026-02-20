import { Router, Request, Response } from 'express';
import { manualCleanup } from '../services/scheduledJobs.js';

export const maintenanceRouter = Router();

/**
 * POST /api/maintenance/cleanup
 * Executa limpeza manual de cache e métricas antigas
 */
maintenanceRouter.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    const result = await manualCleanup();
    res.json({
      message: 'Cleanup completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Manual cleanup failed', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * GET /api/maintenance/status
 * Retorna status do sistema de manutenção
 */
maintenanceRouter.get('/status', (_req: Request, res: Response) => {
  const cleanupIntervalHours = Number(process.env.CLEANUP_INTERVAL_HOURS) || 24;
  const cacheEnabled = process.env.GEMINI_CACHE_ENABLED !== 'false';
  const cacheTtlDays = Number(process.env.GEMINI_CACHE_TTL_DAYS) || 7;

  res.json({
    cleanupSchedule: {
      intervalHours: cleanupIntervalHours,
      nextCleanup: 'Every ' + cleanupIntervalHours + ' hours'
    },
    cache: {
      enabled: cacheEnabled,
      ttlDays: cacheTtlDays
    },
    metrics: {
      retentionDays: 30
    }
  });
});
