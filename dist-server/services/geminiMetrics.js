import { getDatabase } from '../db/client.js';
const METRICS_COLLECTION = 'gemini_metrics';
/**
 * Registra uma métrica de operação do Gemini
 */
export async function recordMetric(metric) {
    try {
        const db = await getDatabase();
        const collection = db.collection(METRICS_COLLECTION);
        await collection.insertOne({
            ...metric,
            timestamp: new Date()
        });
        if (metric.status === 'success') {
            console.log(`[Gemini Metrics] Success - Duration: ${metric.durationMs}ms, ` +
                `Cache: ${metric.cacheHit ? 'HIT' : 'MISS'}, ` +
                `Tokens: ${metric.tokensUsed || 'N/A'}, ` +
                `Retries: ${metric.retries || 0}`);
        }
        else if (metric.status === 'error') {
            console.error(`[Gemini Metrics] Error - Duration: ${metric.durationMs}ms, ` +
                `Message: ${metric.errorMessage || 'Unknown'}, ` +
                `Retries: ${metric.retries || 0}`);
        }
        else if (metric.status === 'cache_hit') {
            console.log(`[Gemini Metrics] Cache HIT - Duration: ${metric.durationMs}ms`);
        }
    }
    catch (error) {
        console.warn('Failed to record Gemini metric:', error);
    }
}
/**
 * Obtém resumo de métricas para um período
 */
export async function getMetricsSummary(startDate, endDate) {
    const db = await getDatabase();
    const collection = db.collection(METRICS_COLLECTION);
    const metrics = await collection.find({
        timestamp: { $gte: startDate, $lte: endDate }
    }).toArray();
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.status === 'success').length;
    const failedRequests = metrics.filter(m => m.status === 'error').length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    const avgDurationMs = totalRequests > 0
        ? metrics.reduce((sum, m) => sum + m.durationMs, 0) / totalRequests
        : 0;
    const filesWithSize = metrics.filter(m => m.fileSize);
    const avgFileSize = filesWithSize.length > 0
        ? filesWithSize.reduce((sum, m) => sum + (m.fileSize || 0), 0) / filesWithSize.length
        : 0;
    const totalTokensUsed = metrics.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const totalRetries = metrics.reduce((sum, m) => sum + (m.retries || 0), 0);
    const errorsByType = {};
    metrics.filter(m => m.status === 'error').forEach(m => {
        const errorType = m.errorMessage || 'Unknown';
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });
    const requestsByHour = {};
    metrics.forEach(m => {
        const hour = new Date(m.timestamp).toISOString().substring(0, 13);
        requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;
    });
    return {
        totalRequests,
        successfulRequests,
        failedRequests,
        cacheHitRate,
        avgDurationMs,
        avgFileSize,
        totalTokensUsed,
        totalRetries,
        errorsByType,
        requestsByHour
    };
}
/**
 * Obtém métricas das últimas 24 horas
 */
export async function getRecentMetrics() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    return getMetricsSummary(startDate, endDate);
}
/**
 * Remove métricas antigas (mais de 30 dias)
 */
export async function cleanupOldMetrics() {
    try {
        const db = await getDatabase();
        const collection = db.collection(METRICS_COLLECTION);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await collection.deleteMany({
            timestamp: { $lt: thirtyDaysAgo }
        });
        console.log(`[Gemini Metrics] Cleaned up ${result.deletedCount} old metrics`);
        return result.deletedCount;
    }
    catch (error) {
        console.warn('Failed to cleanup old Gemini metrics:', error);
        return 0;
    }
}
