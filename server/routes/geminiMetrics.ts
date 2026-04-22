import { Router, Request, Response } from 'express';
import { getMetricsSummary, getRecentMetrics } from '../services/geminiMetrics.js';

export const geminiMetricsRouter = Router();

/**
 * GET /api/gemini-metrics/recent
 * Retorna métricas das últimas 24 horas
 */
geminiMetricsRouter.get('/recent', async (_req: Request, res: Response) => {
  try {
    const metrics = await getRecentMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Failed to fetch recent Gemini metrics', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/gemini-metrics/summary?startDate=...&endDate=...
 * Retorna métricas para um período específico
 */
geminiMetricsRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate query parameters are required (ISO format)'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO format (e.g., 2024-01-01T00:00:00Z)'
      });
    }

    const metrics = await getMetricsSummary(start, end);
    res.json(metrics);
  } catch (error) {
    console.error('Failed to fetch Gemini metrics summary', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});
