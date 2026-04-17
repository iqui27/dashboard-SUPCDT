import 'dotenv/config';
import express, { Request, Response } from 'express';
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
import { ensureAdminUser } from './services/users.js';
import projetosRouter from './routes/projetos.js';
import lancamentosRouter from './routes/lancamentos.js';
import relatoriosRouter from './routes/relatorios.js';
import wifiRouter from './routes/wifi.js';
import wifiEmpresasRouter from './routes/wifiEmpresas.js';
import { modulosEtapasOrcamentoRouter } from './routes/modulosEtapasOrcamento.js';
import { modulosParceirosRiscosGovIndRouter } from './routes/modulosParceirosRiscosGovInd.js';
import { startScheduledJobs } from './services/scheduledJobs.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

// Configuração de CORS mais permissiva para desenvolvimento local
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://dashboard-secti-2025.vercel.app',
  'https://dashboard-supcdt.vercel.app',
  'https://dashboard-supcdt-iqui27s-projects.vercel.app',
  process.env.FRONTEND_URL
].filter((url): url is string => typeof url === 'string');

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
app.use('/api/status-updates', statusUpdatesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projetos', projetosRouter);
app.use('/api/projetos', modulosEtapasOrcamentoRouter);
app.use('/api/projetos', modulosParceirosRiscosGovIndRouter);
app.use('/api/lancamentos', lancamentosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/wifi', wifiRouter);
app.use('/api/wifi-empresas', wifiEmpresasRouter);
app.use('/api/status-responsibles', statusResponsiblesRouter);
app.use('/api/project-overrides', projectOverridesRouter);
app.use('/api/data-sources', dataSourcesRouter);
app.use('/api/gemini-metrics', geminiMetricsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/migration', migrationRouter);
app.use('/api/oscs', oscsRouter);
app.use('/api/parlamentares', parlamentaresRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Middleware de tratamento de erro global
app.use((err: any, req: Request, res: Response, _next: any) => {
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