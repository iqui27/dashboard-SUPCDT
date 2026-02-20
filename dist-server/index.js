import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import projetosRouter from './routes/projetos.js';
import lancamentosRouter from './routes/lancamentos.js';
import relatoriosRouter from './routes/relatorios.js';
import { startScheduledJobs } from './services/scheduledJobs.js';
import { authRouter } from './routes/auth.js';
import { ensureAdminUser } from './services/users.js';
const app = express();
const port = Number(process.env.PORT) || 4000;
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
app.use('/api/projetos', projetosRouter);
app.use('/api/lancamentos', lancamentosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Middleware de tratamento de erro global
app.use((err, req, res, _next) => {
    console.error('=== ERRO GLOBAL CAPTURADO ===');
    console.error('Erro:', err);
    console.error('Stack:', err.stack);
    console.error('URL:', req.url);
    console.error('Method:', req.method);
    console.error('Body:', req.body);
    console.error('Headers:', req.headers);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, async () => {
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`   Also available at http://localhost:${port}`);
    // Garante que o usuário admin existe
    await ensureAdminUser();
    // Inicia jobs de limpeza automática
    startScheduledJobs();
});
