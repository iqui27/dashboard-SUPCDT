import { getDatabase } from '../db/client.js';
import { cleanupOldMetrics } from './geminiMetrics.js';
const CACHE_COLLECTION = 'gemini_pdf_cache';
/**
 * Remove entradas de cache expiradas
 */
export async function cleanupExpiredCache() {
    try {
        const db = await getDatabase();
        const collection = db.collection(CACHE_COLLECTION);
        const result = await collection.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        const deletedCount = result.deletedCount;
        console.log(`[Scheduled Job] Cleaned up ${deletedCount} expired cache entries`);
        return deletedCount;
    }
    catch (error) {
        console.error('[Scheduled Job] Failed to cleanup expired cache:', error);
        return 0;
    }
}
/**
 * Executa todas as tarefas de limpeza
 */
export async function runCleanupJobs() {
    console.log('[Scheduled Job] Starting cleanup jobs...');
    const cacheDeleted = await cleanupExpiredCache();
    const metricsDeleted = await cleanupOldMetrics();
    console.log(`[Scheduled Job] Cleanup complete - ` +
        `Cache: ${cacheDeleted} entries, ` +
        `Metrics: ${metricsDeleted} records`);
}
/**
 * Inicia o scheduler de jobs automáticos
 */
export function startScheduledJobs() {
    const CLEANUP_INTERVAL_HOURS = Number(process.env.CLEANUP_INTERVAL_HOURS) || 24;
    const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    console.log(`[Scheduled Jobs] Starting with ${CLEANUP_INTERVAL_HOURS}h interval`);
    // Executa imediatamente na inicialização
    runCleanupJobs().catch(error => {
        console.error('[Scheduled Job] Initial cleanup failed:', error);
    });
    // Agenda execuções periódicas
    setInterval(() => {
        runCleanupJobs().catch(error => {
            console.error('[Scheduled Job] Scheduled cleanup failed:', error);
        });
    }, intervalMs);
    console.log(`[Scheduled Jobs] Next cleanup in ${CLEANUP_INTERVAL_HOURS} hours`);
}
/**
 * Força execução manual das tarefas de limpeza
 */
export async function manualCleanup() {
    const cacheDeleted = await cleanupExpiredCache();
    const metricsDeleted = await cleanupOldMetrics();
    return {
        cacheDeleted,
        metricsDeleted
    };
}
