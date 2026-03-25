import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
import express from 'express';
import cors from 'cors';
import { statusUpdatesRouter } from './routes/statusUpdates.js';
import { projectsRouter } from './routes/projects.js';
import { statusResponsiblesRouter } from './routes/statusResponsibles.js';
import { projectOverridesRouter } from './routes/projectOverrides.js';
import { dataSourcesRouter } from './routes/dataSources.js';
import { geminiMetricsRouter } from './routes/geminiMetrics.js';
import { maintenanceRouter } from './routes/maintenance.js';
import { migrationRouter } from './routes/migration.js';
import { oscsRouter } from './routes/osc.js';
import parlamentaresRouter from './routes/parlamentares.js';
import { authRouter } from './routes/auth.js';
import projetosRouter from './routes/projetos.js';
import lancamentosRouter from './routes/lancamentos.js';
import relatoriosRouter from './routes/relatorios.js';
import wifiRouter from './routes/wifi.js';
import { modulosEtapasOrcamentoRouter } from './routes/modulosEtapasOrcamento.js';
import { modulosParceirosRiscosGovIndRouter } from './routes/modulosParceirosRiscosGovInd.js';
import { startScheduledJobs } from './services/scheduledJobs.js';
import { ensureAdminUser } from './services/users.js';
const app = express();
const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';
const SENSITIVE_KEYS = new Set([
    'authorization',
    'cookie',
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken'
]);
function sanitizeValue(value) {
    if (typeof value === 'string') {
        return value.length > 120 ? `${value.slice(0, 117)}...` : value;
    }
    if (Array.isArray(value)) {
        return `[array:${value.length}]`;
    }
    if (value && typeof value === 'object') {
        return '[object]';
    }
    return value;
}
function sanitizeObject(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return undefined;
    }
    return Object.fromEntries(Object.entries(input).map(([key, value]) => {
        if (SENSITIVE_KEYS.has(key)) {
            return [key, '[redacted]'];
        }
        return [key, sanitizeValue(value)];
    }));
}
// Configuração de CORS mais permissiva para desenvolvimento local
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://dashboard-secti-2025.vercel.app', // URL Antiga
    'https://dashboard-supcdt.vercel.app', // URL Nova Produção
    process.env.FRONTEND_URL
].filter((url) => typeof url === 'string');
// Em desenvolvimento, permite qualquer origem da rede local
const isDevelopment = process.env.NODE_ENV !== 'production';
app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ex: mobile apps, Postman)
        if (!origin) {
            return callback(null, true);
        }
        // Em desenvolvimento, permite qualquer origem
        if (isDevelopment) {
            return callback(null, true);
        }
        // Em produção, apenas origens permitidas
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projetos', projetosRouter);
app.use('/api/projetos', modulosEtapasOrcamentoRouter);
app.use('/api/projetos', modulosParceirosRiscosGovIndRouter);
app.use('/api/lancamentos', lancamentosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/wifi', wifiRouter);
app.use('/api/data-sources', dataSourcesRouter);
app.use('/api/status-updates', statusUpdatesRouter);
app.use('/api/project-overrides', projectOverridesRouter);
app.use('/api/status-responsibles', statusResponsiblesRouter);
app.use('/api/oscs', oscsRouter);
app.use('/api/parlamentares', parlamentaresRouter);
app.use('/api/gemini-metrics', geminiMetricsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/migration', migrationRouter);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Middleware de tratamento de erro global
app.use((err, req, res, _next) => {
    console.error('=== ERRO GLOBAL CAPTURADO ===');
    console.error('Erro:', err);
    console.error('Stack:', err.stack);
    console.error('Request:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
        body: sanitizeObject(req.body),
        headers: sanitizeObject({
            authorization: req.headers.authorization,
            cookie: req.headers.cookie,
            'content-type': req.headers['content-type']
        })
    });
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
app.listen(port, host, async () => {
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`   Also available at http://localhost:${port}`);
    // Garante que o usuário admin existe
    await ensureAdminUser();
    // Inicia jobs de limpeza automática
    startScheduledJobs();
});
