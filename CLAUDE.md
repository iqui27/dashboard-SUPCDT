# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **SECTI Dashboard** - a project funding and management system for tracking Brazilian government funding projects ("Fomentos"). The application manages project status, financial tracking, parliamentarian allocations, regional distribution, approval workflows for civil society organization (OSC) partnerships, and user authentication with role-based access control.

Language: Portuguese (pt-BR)

## Development Commands

### Frontend Development
```bash
npm install                 # Install dependencies
npm run dev                 # Start Vite dev server (default: http://localhost:5173)
npm run build              # Build frontend for production (outputs to dist/)
npm run preview            # Preview production build locally
npm run lint               # Run ESLint on TypeScript/React files
```

### Backend Development
```bash
npm run server             # Run backend in development mode with tsx
npm run build:server       # Compile TypeScript server to JavaScript (outputs to dist-server/)
npm run start:server       # Run compiled production server
npm start                  # Alias for start:server
```

### Deployment
```bash
npm run heroku-postbuild   # Automatically runs build:server on Heroku deployment
```

Deployment config files: `vercel.json`, `Dockerfile`, `docker-compose.yml`

## Architecture Overview

### Stack
- **Frontend**: React 18 + TypeScript + Vite + React Router v6
- **UI**: Tailwind CSS 3.4 + shadcn/ui (Radix UI primitives) + Lucide icons
- **Charts**: Recharts for data visualization
- **Backend**: Express.js 5 + TypeScript
- **Database**: MongoDB 6 (document storage)
- **Auth**: JWT (jsonwebtoken) + bcrypt password hashing
- **Email**: Nodemailer (SMTP) + Resend + React Email templates
- **External APIs**: Google Sheets API, Google Gemini AI (PDF analysis)

### Project Structure

```
src/                              # Frontend React application
├── App.tsx                       # Main app with 7-tab routing, state management
├── AppRouter.tsx                 # React Router wrapper with auth guards
├── index.tsx                     # React entry point
├── index.css                     # Global styles
├── contexts/
│   └── AuthContext.tsx            # Authentication state & provider
├── components/
│   ├── Header.tsx                # Navigation header with theme toggle
│   ├── Login.tsx                 # Authentication login form
│   ├── ForgotPassword.tsx        # Password recovery request
│   ├── ResetPassword.tsx         # Password reset via token
│   ├── ProtectedRoute.tsx        # Route protection wrapper (requires auth)
│   ├── Dashboard.tsx             # Home view: KPIs, charts, metrics
│   ├── KPICards.tsx              # Key performance indicator cards
│   ├── DeadlinesWidget.tsx       # Project deadline tracking
│   ├── AttentionProjects.tsx     # Projects requiring attention
│   ├── ProjectSelector.tsx       # Project detail view with search/filter
│   ├── FomentosTableEditor.tsx   # Spreadsheet-like table view
│   ├── PlanilhaManager.tsx       # Data source import management
│   ├── DataSpreadsheetPanel.tsx  # Spreadsheet data panel
│   ├── ManageOscs.tsx            # OSC management interface
│   ├── SyncDashboard.tsx         # Data synchronization dashboard
│   ├── MigrationDashboard.tsx    # Data migration interface
│   ├── UserManagement.tsx        # Admin user management
│   ├── UpdateStatusModal.tsx     # Status update modal dialog
│   ├── StatusTimeline.tsx        # Status history visualization
│   ├── NewFeaturesModal.tsx      # Feature announcement modal
│   ├── OnlineTables.tsx          # Online data table views
│   ├── DataSourceTest.tsx        # Data source connectivity test
│   ├── ParlamentaresNormalizationViewer.tsx  # Parliamentarian name normalization
│   ├── ManageProjects/           # CRUD for custom projects (modular)
│   │   ├── ManageProjects.tsx    # Main component
│   │   ├── constants.ts          # Component constants
│   │   ├── index.ts              # Barrel exports
│   │   ├── components/           # Sub-components
│   │   │   ├── AccordionSection.tsx
│   │   │   ├── AditivosManager.tsx
│   │   │   ├── EmendasReport.tsx
│   │   │   ├── HelpModal.tsx
│   │   │   ├── ImportConfirmationModal.tsx
│   │   │   ├── ImportProgressModal.tsx
│   │   │   ├── ParlamentaresManager.tsx
│   │   │   ├── PrazosManager.tsx
│   │   │   ├── ResponsibleSelectionModal.tsx
│   │   │   └── ValidationAlert.tsx
│   │   ├── hooks/
│   │   │   ├── useAditivos.ts
│   │   │   ├── useFormValidation.ts
│   │   │   ├── usePdfImport.ts
│   │   │   └── useProjectForm.ts
│   │   └── utils/
│   │       ├── formBuilders.ts
│   │       ├── formParsers.ts
│   │       ├── formatters.ts
│   │       ├── prazosUtils.ts
│   │       └── validators.ts
│   ├── charts/                   # Recharts visualization components
│   │   ├── CategoryChart.tsx
│   │   ├── FinancialChart.tsx
│   │   ├── OSCValorChart.tsx
│   │   ├── ParlamentarChart.tsx
│   │   ├── ParlamentarQuantidadeChart.tsx
│   │   ├── PaymentStatusChart.tsx
│   │   ├── RegionChart.tsx
│   │   └── StatusChart.tsx
│   └── ui/                       # shadcn/ui components (Radix-based)
│       ├── alert.tsx, badge.tsx, button.tsx, card.tsx
│       ├── chart.tsx, currency-input.tsx, input.tsx
│       ├── progress.tsx, select.tsx, table.tsx
│       ├── textarea.tsx, timeline.tsx
├── hooks/
│   ├── useOscs.ts                # OSC data fetching and management
│   ├── useStatusResponsibles.ts  # Responsible party assignment
│   └── useStatusUpdates.ts       # Status update fetching and caching
├── lib/
│   ├── auth.ts                   # Authentication (login, logout, token mgmt)
│   ├── customProjects.ts         # Custom project CRUD operations
│   ├── currencyUtils.ts          # Currency formatting and parsing
│   ├── dataSources.ts            # Data source import/management API
│   ├── googleSheets.ts           # Google Sheets API client and parser
│   ├── migration.ts              # Data migration utilities
│   ├── oscs.ts                   # OSC data operations
│   ├── parlamentaresAPI.ts       # Parliamentarian API interface
│   ├── parlamentaresNormalization.ts  # Name normalization logic
│   ├── parlamentaresUtils.ts     # Parliamentarian data utilities
│   ├── projectImports.ts         # PDF import workflow utilities
│   ├── projectOverrides.ts       # Override management API
│   ├── statusResponsibles.ts     # Responsible party API operations
│   ├── statusUpdates.ts          # Status update API operations
│   ├── users.ts                  # User management API
│   └── utils.ts                  # General formatting/parsing utilities
└── types/
    ├── fomento.ts                # Core Fomento data model, enums, interfaces
    └── osc.ts                    # OSC data model interfaces

server/                           # Backend Express application
├── index.ts                      # Express setup, CORS, route mounting
├── db/client.ts                  # MongoDB connection singleton
├── middleware/
│   └── auth.ts                   # JWT verification (requireAuth, requireAdmin)
├── routes/
│   ├── auth.ts                   # Login, logout, password reset, user CRUD
│   ├── projects.ts               # CRUD + PDF import via Gemini
│   ├── statusUpdates.ts          # Status history tracking
│   ├── statusResponsibles.ts     # Responsible party listing
│   ├── projectOverrides.ts       # Override field values
│   ├── dataSources.ts            # Import/list Google Sheets datasets
│   ├── geminiMetrics.ts          # Gemini AI usage metrics
│   ├── maintenance.ts            # System maintenance operations
│   ├── migration.ts              # Data migration/sync endpoints
│   ├── osc.ts                    # OSC CRUD + bulk operations
│   └── parlamentares.ts          # Parliamentarian data endpoints
├── services/
│   ├── auth.ts                   # JWT generation, token validation
│   ├── users.ts                  # User CRUD, ensureAdminUser
│   ├── email.ts                  # Email sending (Nodemailer/Resend)
│   ├── passwordReset.ts          # Password reset email flow
│   ├── fomentos.ts               # Core fomento logic
│   ├── customFomentos.ts         # Custom project handling
│   ├── sheetFomentos.ts          # Sheet-specific logic
│   ├── googleSheetImport.ts      # Service account Sheets fetching
│   ├── geminiImport.ts           # Gemini AI PDF extraction w/ caching
│   ├── geminiMetrics.ts          # Gemini usage tracking and reporting
│   ├── oscs.ts                   # OSC business logic
│   └── scheduledJobs.ts          # Automated cleanup jobs
├── emails/
│   └── PasswordResetEmail.tsx    # React Email template
├── types/
│   ├── fomento.ts                # Backend Fomento interface
│   ├── osc.ts                    # Backend OSC interface
│   ├── sheet.ts                  # Google Sheets data structures
│   └── user.ts                   # User model, roles, auth types
└── scripts/                      # Database utility scripts (~40 files)
    ├── check*.ts                 # Database inspection scripts
    ├── update*.ts                # Data update scripts
    ├── import*.ts, migrate*.ts   # Data migration scripts
    ├── create*.ts                # Initialization scripts
    └── ...
```

### Key Data Flow

1. **Authentication**:
   - `POST /api/auth/login` → JWT token issued
   - Token stored client-side, sent via `Authorization: Bearer` header
   - `AuthContext.tsx` manages auth state across the app
   - `ProtectedRoute.tsx` guards all main app routes

2. **Data Loading** (parallel on app mount):
   - `/api/projects` → Custom projects from MongoDB
   - `/api/status-updates` → Status history
   - `/api/project-overrides` → Field overrides
   - `/api/data-sources` → Available local datasets

3. **Data Merging** (client-side in `App.tsx`):
   - Custom projects loaded
   - Overrides applied to project fields
   - Status updates merged into project records via `mergeStatusUpdateIntoFomento()`
   - Historical movements tracked in `historicoMovimentacoes`
   - Results sorted by recent activity

4. **Updates** (REST API, requires auth):
   - Custom projects: `POST/PUT/DELETE /api/projects`
   - Overrides: `PUT /api/project-overrides/:projectId`
   - Status updates: `POST /api/status-updates`

5. **PDF Import** (AI-powered):
   - Upload PDF → `POST /api/projects/import` → Gemini AI analyzes → Extracts `Fomento` fields

### Core Data Model

**Fomento** (Project Record):
```typescript
type StatusProjeto = 'Reprovada' | 'Em andamento' | 'Assinado' | 'Encerrado';
type Categoria = 'Emenda' | 'INEX' | 'Convênio' | 'Outro' | 'Recurso Proprio';
type StatusEmenda = 'Bloqueada' | 'Desbloqueada' | 'Anulada' | 'SERP' | 'SEEC';
type TipoInstrumento = 'Termo de Colaboração' | 'Termo de Fomento';

interface Fomento {
  id: string;
  origin?: 'custom' | 'sheet';
  statusProjeto: StatusProjeto;
  categoria: Categoria;
  tipoInstrumento?: TipoInstrumento;

  // Identifiers
  numeroTermoFomento: string;          // Funding agreement number
  processoSEI: string;                 // SEI process number
  projeto: string;                     // Project name
  assinaturaPublicacao: string;        // Signature/publication info

  // Timeline
  vigenciaInicio: Date | null;
  vigenciaEvento: Date | null;
  vigenciaFinal: Date | null;
  statusDesde: Date | null;
  dataPrestacaoContasOSC: Date | null;
  prorrogacaoPrestacaoContasMais30: Date | boolean | null;

  // Financial
  valorTotal: number;
  financeiroParcela1: number | string;
  financeiroParcela2: number | string;
  financeiroParcela3: number | string;
  financeiroParcela4: number | string;
  tipoSituacaoPagamento: string;
  aditivosVigencia: AditivoVigencia[];   // Duration extensions
  aditivosValor: AditivoValor[];         // Value additions

  // Stakeholders
  parlamentar: string;                   // Main parliamentarian name
  emendasParlamentares: EmendaParlamentar[];  // Parliamentary amendments
  osc: string;                           // Civil society organization
  presidenteOSC: string;
  coordenadorProjeto: string;

  // Location
  regiaoAdministrativa: string;
  regioesAdministrativas: string[];
  setor?: string;

  // Workflow
  etapaProjeto: string;
  situacao: string;
  responsavelParecer?: string;
  responsavelPlanilha?: string;
  responsavelAlteracao?: string;
  statusPlanilha: string;
  statusDocumentacao: string;
  statusEscopoParecer: string;

  // Governance
  tipoPublicoPrevisto: string;
  contrapartidasComissao: string;
  relatorioMonitoramentoAvaliacaoComissao: string;
  prazos: Prazos;                        // 5 key deadlines + completion flags
  diasParado?: number;
  diasLimite?: number;

  // Tracking
  historicoMovimentacoes: MovimentacaoHistorico[];
  notasObs: string;
  createdAt?: Date | string;
  createdBy?: string;

  // Override/sync fields (for Google Sheets data)
  localStatusUpdate?: StatusUpdate;
  overrideNeedsSync?: boolean;
  overrideLastUpdatedAt?: Date | null;
  overrideLastSyncedAt?: Date | null;
}
```

**EmendaParlamentar** (Parliamentary Amendment):
```typescript
interface EmendaParlamentar {
  id: string;
  parlamentarId: string;        // Reference to parlamentares collection
  nome?: string;                // Legacy compatibility
  descentralizacao: boolean;
  numeroPortaria?: string;
  numeroOficio?: string;
  dataPublicacao?: Date;
  origem?: string;
  status: StatusEmenda;
  valor: number;
  historico: EmendaHistorico[];
}
```

**Prazos** (Deadlines):
```typescript
interface Prazos {
  rma: Date | null;
  despachoHomologacao: Date | null;
  relatorioExecucaoObjeto: Date | null;
  parecerTecnicoRelatorio: Date | null;
  decisaoFinal: Date | null;
  rmaCumprido?: boolean;
  despachoHomologacaoCumprido?: boolean;
  relatorioExecucaoObjetoCumprido?: boolean;
  parecerTecnicoRelatorioCumprido?: boolean;
  decisaoFinalCumprido?: boolean;
}
```

**User**:
```typescript
type UserRole = 'admin' | 'editor' | 'viewer';

interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;       // bcrypt hashed
  role?: UserRole;
  email?: string;
  fullName?: string;
  department?: string;
  isActive: boolean;
  isAdmin?: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}
```

**OSC** (Civil Society Organization):
```typescript
interface OSC {
  id: string;
  processo: string;
  osc: string;
  projeto: string;
  parlamentar?: string;
  valor: number;
  valorRaw?: string;
  cnpj?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_GOOGLE_SHEETS_API_KEY    # Public API key for Sheets
VITE_GOOGLE_SHEET_ID          # Default Google Sheet ID
VITE_GOOGLE_SHEETS_RANGE      # Sheet range (e.g., 'FOMENTOS 2025')
VITE_API_BASE_URL             # Backend API URL (default: http://localhost:4000)
```

**Backend** (`.env`):
```
# Database & Server
MONGODB_URI                   # MongoDB connection string
PORT                          # Server port (default: 4000)
HOST                          # Server host (default: 0.0.0.0)
NODE_ENV                      # 'production' or 'development'
FRONTEND_URL                  # Frontend URL for CORS whitelist

# Authentication
JWT_SECRET                    # JWT signing secret (CHANGE in production)
JWT_EXPIRES_IN                # JWT expiration (default: 24h)
ADMIN_USERNAME                # Default admin username (default: admin)
ADMIN_PASSWORD                # Default admin password (default: admin123)
ADMIN_EMAIL                   # Default admin email
APP_BASE_URL                  # Base URL for password reset links

# Email (SMTP via Nodemailer)
SMTP_HOST                     # SMTP server host
SMTP_PORT                     # SMTP port (default: 587)
SMTP_USER                     # SMTP username
SMTP_PASSWORD                 # SMTP password (or SMTP_PASS)
SMTP_SECURE                   # Use TLS (default: true for port 465)
RESEND_API_KEY                # Resend API key (alternative to SMTP)
MAIL_FROM                     # Sender email address

# Google Services
GOOGLE_SERVICE_ACCOUNT_EMAIL  # Service account for Sheets import
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  # Service account private key
GOOGLE_SHEETS_API_KEY         # Server-side Sheets API key
GOOGLE_SHEET_ID               # Server-side Sheet ID
GOOGLE_SHEETS_RANGE           # Server-side Sheet range

# Gemini AI
GEMINI_API_KEY                # Google Gemini AI API key (required)
GEMINI_MODEL                  # Model to use (default: models/gemini-1.5-flash-latest)
GEMINI_MAX_FILE_SIZE_MB       # PDF size limit (default: 16)
GEMINI_MAX_RETRIES            # Retry attempts on failure (default: 3)
GEMINI_RETRY_DELAY_MS         # Base retry delay in ms (default: 1000)
GEMINI_CACHE_ENABLED          # Enable PDF caching (default: true)
GEMINI_CACHE_TTL_DAYS         # Cache expiration in days (default: 7)

# Maintenance
CLEANUP_INTERVAL_HOURS        # Auto-cleanup interval (default: 24)
```

### API Routes

#### Authentication (`/api/auth`)
- `POST /api/auth/login` - User login (returns JWT token)
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)
- `POST /api/auth/change-password` - Change password (requires auth)
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/users` - List all users (requires admin)
- `POST /api/auth/users` - Create user (requires admin)
- `PATCH /api/auth/users/:id` - Update user (requires admin)

#### Projects (`/api/projects`)
- `GET /api/projects` - List all custom projects
- `GET /api/projects/:id` - Get specific project
- `POST /api/projects` - Create custom project (requires auth)
- `PUT /api/projects/:id` - Update custom project (requires auth)
- `DELETE /api/projects/:id` - Delete custom project (requires auth)
- `POST /api/projects/import` - Import project from PDF via Gemini AI (requires auth, multipart/form-data)

#### Status Updates (`/api/status-updates`)
- `GET /api/status-updates` - Get status updates (optional query: `projectId`)
- `POST /api/status-updates` - Create status update (requires auth)

#### Status Responsibles (`/api/status-responsibles`)
- `GET /api/status-responsibles` - List all responsible party assignments

#### Project Overrides (`/api/project-overrides`)
- `GET /api/project-overrides` - Get overrides (optional query: `projectId`)
- `PUT /api/project-overrides/:projectId` - Create/update override (requires auth)
- `POST /api/project-overrides/:projectId/sync` - Flag override for sheet sync (requires auth)

#### Data Sources (`/api/data-sources`)
- `GET /api/data-sources` - List available data sources
- `POST /api/data-sources/preview` - Preview Google Sheet before import
- `POST /api/data-sources/import` - Import Google Sheet as local dataset
- `GET /api/data-sources/local/:id` - Fetch local dataset by ID
- `PUT /api/data-sources/local/:id` - Update local dataset
- `DELETE /api/data-sources/local/:id` - Delete local dataset

#### OSCs (`/api/oscs`)
- `GET /api/oscs` - List OSCs (optional query: `search`)
- `POST /api/oscs` - Create OSC
- `PUT /api/oscs/:id` - Update OSC
- `DELETE /api/oscs/:id` - Delete OSC
- `POST /api/oscs/bulk` - Bulk upsert OSCs
- `POST /api/oscs/upsert` - Upsert single OSC by processo

#### Parlamentares (`/api/parlamentares`)
- `GET /api/parlamentares` - List all parliamentarians
- `GET /api/parlamentares/map` - Get name-to-ID mapping
- `POST /api/parlamentares/popular-emendas` - Populate parliamentarian data in amendments

#### Migration (`/api/migration`)
- `GET /api/migration/status` - Check migration status
- `POST /api/migration/migrate-all` - Migrate all projects from sheet
- `POST /api/migration/migrate/:projectName` - Migrate specific project
- `GET /api/migration/analyze-existing` - Analyze existing vs sheet projects
- `POST /api/migration/populate-fields` - Populate empty fields from sheet
- `POST /api/migration/replace-fields` - Replace field values from sheet
- `GET /api/migration/full-comparison` - Full comparison BD vs sheet
- `POST /api/migration/sync-to-sheet` - Sync BD to match sheet exactly
- `GET /api/migration/frontend-comparison` - Compare frontend-specific fields
- `POST /api/migration/sync-frontend-fields` - Sync frontend-specific fields
- `GET /api/migration/sync-conflicts` - Check for sync conflicts
- `POST /api/migration/approve-sync` - Approve sync updates
- `POST /api/migration/sync-parlamentares` - Sync parliamentarians from sheet
- `POST /api/migration/sync-all-parlamentares` - Sync all parliamentarians

#### Gemini Metrics (`/api/gemini-metrics`)
- `GET /api/gemini-metrics/recent` - Get Gemini metrics for last 24h
- `GET /api/gemini-metrics/summary?startDate=...&endDate=...` - Get metrics for date range

#### Maintenance (`/api/maintenance`)
- `GET /api/maintenance/status` - Get maintenance system status
- `POST /api/maintenance/cleanup` - Manually trigger cache/metrics cleanup

#### Health
- `GET /health` - Health check

### MongoDB Collections

- `custom_projects` - User-created projects (full `Fomento` documents)
- `status_updates` - Historical status changes
- `status_responsibles` - Responsible party assignments per project
- `project_overrides` - Field-level overrides for Google Sheets projects
- `planilha_datasets` - Imported spreadsheet datasets
- `users` - User accounts with hashed passwords and roles
- `parlamentares` - Parliamentarian reference data (name normalization)
- `oscs` - Civil society organization records
- `gemini_pdf_cache` - PDF import cache (SHA-256 hash-based, 7-day TTL)
- `gemini_metrics` - Gemini AI usage metrics (30-day retention)

### Path Alias

The frontend uses `@/` as an alias for `src/`:
```typescript
import { Button } from '@/components/ui/button';
// Resolves to: src/components/ui/button
```

### External Services

**Google Sheets API** (Public):
- Used for fetching remote project data
- Requires API key in `VITE_GOOGLE_SHEETS_API_KEY`
- Parsing handles multi-row headers with accent normalization
- Located in: `src/lib/googleSheets.ts`

**Google Sheets API** (Service Account):
- Used for importing user-selected Sheets as local datasets
- Requires service account credentials in backend
- Located in: `server/services/googleSheetImport.ts`

**Google Gemini AI**:
- Extracts project data from PDF uploads
- Model: `gemini-1.5-flash-latest` (configurable via `GEMINI_MODEL`)
- Located in: `server/services/geminiImport.ts`
- Max file size configurable via `GEMINI_MAX_FILE_SIZE_MB` (default: 16MB)
- **Features**:
  - Automatic retry with exponential backoff (3 attempts by default)
  - SHA-256 hash-based caching (7-day TTL)
  - Zod schema validation for response data
  - Progress tracking with XMLHttpRequest
  - Comprehensive metrics collection
- **Cache**: MongoDB collection `gemini_pdf_cache`
- **Metrics**: MongoDB collection `gemini_metrics`

**Email (Password Reset)**:
- Sends password reset links via Nodemailer (SMTP) or Resend API
- React Email templates in `server/emails/`
- Located in: `server/services/email.ts`, `server/services/passwordReset.ts`

### Navigation Tabs

The app has 7 navigation tabs (defined as `AppTab` type):

| Tab | Key | Component | Description |
|-----|-----|-----------|-------------|
| Painel | `home` | `Dashboard` | KPI metrics, charts, overview |
| Projetos | `projects` | `ProjectSelector` | Browse/search/filter all projects |
| Planilha | `table` | `DataSpreadsheetPanel` + `PlanilhaManager` | Import & view spreadsheet data |
| Gerenciar | `manage` | `ManageProjects` | CRUD operations, PDF import |
| OSCs | `osc` | `ManageOscs` | Manage civil society organizations |
| Sincronização | `migration` | `SyncDashboard` | Data migration/sync utilities |
| Usuários | `users` | `UserManagement` | User admin (admin role only) |

### UI Components

All UI components use shadcn/ui (Radix UI) + Tailwind CSS:
- Located in `src/components/ui/`
- Import path: `@/components/ui/[component]`
- Components: `alert`, `badge`, `button`, `card`, `chart`, `currency-input`, `input`, `progress`, `select`, `table`, `textarea`, `timeline`

### Styling

- **Tailwind CSS 3.4** with custom configuration
- Dark/light mode support via class-based toggling
- Color scheme: Blue accent (`bg-blue-600`, `text-blue-500`)
- Layout: Sidebar navigation with collapsible menu
- Responsive breakpoints follow Tailwind defaults

### TypeScript Configuration

- Frontend: `tsconfig.json` with Vite defaults + `@/` path alias
- Backend: `server/tsconfig.json` with Node.js target, outputs to `dist-server/`
- Strict mode enabled
- ES module format (`"type": "module"` in `package.json`)

## Authentication System

### Overview
- JWT-based authentication with role-based access control
- Roles: `admin`, `editor`, `viewer`
- Middleware: `requireAuth` (any authenticated user), `requireAdmin` (admin only)
- On server startup, `ensureAdminUser()` creates default admin if none exists

### Flow
1. User logs in via `POST /api/auth/login` → receives JWT token
2. Frontend stores token, managed by `AuthContext`
3. All protected API calls include `Authorization: Bearer <token>` header
4. `ProtectedRoute` component redirects unauthenticated users to `/login`
5. Password reset via email: forgot-password → email with token → reset-password

### Key Files
- Frontend: `src/contexts/AuthContext.tsx`, `src/lib/auth.ts`, `src/lib/users.ts`
- Backend: `server/middleware/auth.ts`, `server/services/auth.ts`, `server/services/users.ts`
- Email: `server/services/email.ts`, `server/services/passwordReset.ts`, `server/emails/PasswordResetEmail.tsx`

## Development Workflow

### Adding New Features

1. **New Frontend Component**: Add to `src/components/`, import in `App.tsx` if adding a new tab
2. **New API Endpoint**: Add route in `server/routes/`, mount in `server/index.ts`
3. **New Data Type**: Update `src/types/fomento.ts` (backend has its own copy in `server/types/fomento.ts`)
4. **New Database Collection**: Add queries in relevant service file under `server/services/`
5. **Protected Route**: Add `requireAuth` or `requireAdmin` middleware to route handlers

### Working with Google Sheets Data

- Sheet data is **read-only** from the frontend perspective
- To "edit" sheet data, create a **project override** via `PUT /api/project-overrides/:projectId`
- Overrides are merged client-side in `App.tsx`
- Check `overrideNeedsSync` flag to detect pending changes

### Working with Custom Projects

- Custom projects are stored in MongoDB (`custom_projects` collection)
- Fully editable via `ManageProjects` component
- Support PDF import via Gemini AI
- Use `origin: 'custom'` to distinguish from sheet data

### Working with Status Updates

- Status history is tracked in `status_updates` collection
- Each update creates a new `MovimentacaoHistorico` entry
- Updates are merged into `historicoMovimentacoes` array client-side
- Calculate `diasParado` (days stalled) based on `statusDesde` field

### Working with Parlamentares & Emendas

- Parliamentarians stored in `parlamentares` collection with normalized names
- `EmendaParlamentar` references parliamentarian by `parlamentarId`
- Name mapping available via `GET /api/parlamentares/map`
- Normalization logic in `src/lib/parlamentaresNormalization.ts`

## Testing & Quality

- **Linting**: `npm run lint` (ESLint + TypeScript ESLint)
- **E2E Testing**: Playwright configured (`@playwright/test` in devDependencies)
- Manual testing via `npm run dev` + `npm run server` in separate terminals

## Common Patterns

### Date Handling
- Dates stored as ISO strings in MongoDB
- Parsed to `Date` objects client-side via `parseDate()` in `src/lib/utils.ts`
- Display formatted via `formatDate()` utility

### Financial Formatting
- Currency formatted via `formatCurrency()` in `src/lib/utils.ts`
- Additional utilities in `src/lib/currencyUtils.ts`
- Brazilian Real (R$) with thousands separator

### API Error Handling
- Server errors return JSON: `{ error: string }`
- Global error middleware in `server/index.ts` catches unhandled errors
- In development, stack traces included in error responses
- Frontend wraps API calls in try-catch blocks

### Data Fetching Pattern
```typescript
// Parallel loading on mount
useEffect(() => {
  Promise.all([
    fetchCustomProjects(),
    fetchStatusUpdates(),
    fetchProjectOverrides(),
  ]).then(([projects, updates, overrides]) => {
    // Merge status updates, apply overrides, sort
  });
}, []);
```

### Authentication Pattern
```typescript
// Protected API call
const response = await fetch('/api/projects', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Important Notes

- **Sensitive Data**: `.env` file contains API keys, JWT secret, and MongoDB credentials - never commit to Git
- **CORS**: Permissive in development; production restricts to allowed origins list
- **MongoDB Connection**: Connection established on server startup via singleton, not per-request
- **File Uploads**: PDF uploads limited by `GEMINI_MAX_FILE_SIZE_MB` (default 16MB)
- **Google Sheets Range**: Must match header structure in `src/lib/googleSheets.ts` parsing logic
- **Default Admin**: Server auto-creates admin user on startup if none exists (`ADMIN_USERNAME`/`ADMIN_PASSWORD`)
- **Deployment**: Supports Heroku (`heroku-postbuild`), Vercel (`vercel.json`), and Docker (`Dockerfile` + `docker-compose.yml`)

## Key Architectural Decisions

1. **Hybrid Data Model**: Combines remote Google Sheets (read-only) with local MongoDB (read-write)
2. **Override System**: Allows "editing" Google Sheets data without modifying source
3. **Client-Side Merging**: All data merging/filtering happens in React state for responsiveness
4. **AI-Powered Import**: Gemini AI extracts structured data from unstructured PDFs
5. **Status History**: Immutable audit trail of all status changes
6. **Multi-Tenant Data Sources**: Users can import/switch between multiple Google Sheets
7. **JWT Authentication**: Stateless auth with role-based access control (admin/editor/viewer)
8. **Parlamentar Normalization**: Separate collection with normalized names to handle variations

## Monitoring & Maintenance

### Gemini AI Metrics

The system automatically collects comprehensive metrics for all Gemini AI operations:

**Tracked Metrics**:
- Request duration (ms)
- Cache hit/miss rate
- Success/error counts
- Token usage
- File sizes
- Retry attempts
- Error types and frequency
- Requests per hour

**Accessing Metrics**:
```bash
# Get metrics for last 24 hours
GET /api/gemini-metrics/recent

# Get metrics for custom date range
GET /api/gemini-metrics/summary?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z
```

**Response Example**:
```json
{
  "totalRequests": 150,
  "successfulRequests": 145,
  "failedRequests": 5,
  "cacheHitRate": 65.5,
  "avgDurationMs": 3200,
  "avgFileSize": 1048576,
  "totalTokensUsed": 45000,
  "totalRetries": 8,
  "errorsByType": {
    "Resposta vazia do Gemini ao processar o PDF": 3,
    "O Gemini não retornou um objeto JSON válido": 2
  },
  "requestsByHour": {
    "2025-01-15T10": 25,
    "2025-01-15T11": 30
  }
}
```

### Automatic Cleanup Jobs

The server automatically runs cleanup jobs on a schedule (default: every 24 hours):

1. **Expired Cache Cleanup**: Removes PDF cache entries past their TTL (7 days)
2. **Old Metrics Cleanup**: Removes metrics older than 30 days

**Manual Cleanup**:
```bash
POST /api/maintenance/cleanup

# Response:
{
  "message": "Cleanup completed successfully",
  "cacheDeleted": 45,
  "metricsDeleted": 1200
}
```

**Check Maintenance Status**:
```bash
GET /api/maintenance/status

# Response:
{
  "cleanupSchedule": {
    "intervalHours": 24,
    "nextCleanup": "Every 24 hours"
  },
  "cache": {
    "enabled": true,
    "ttlDays": 7
  },
  "metrics": {
    "retentionDays": 30
  }
}
```

### Performance Optimization

**Gemini AI Cost & Speed**:
- Using `gemini-1.5-flash-latest` provides ~60% cost savings vs `gemini-1.5-pro`
- Cache hit rate typically 60-80% for repeated PDFs
- Automatic retry handles transient API failures
- Average response time: 3-6 seconds (uncached), <100ms (cached)

**Best Practices**:
1. Monitor cache hit rate via metrics API
2. Adjust `GEMINI_CACHE_TTL_DAYS` based on data freshness requirements
3. Set `CLEANUP_INTERVAL_HOURS` to match usage patterns
4. Review error metrics to identify problematic PDFs

## Troubleshooting

- **"Cannot find module '@/...'"**: Check `vite.config.ts` path alias is configured
- **CORS errors**: Ensure backend is running and `VITE_API_BASE_URL` is correct
- **MongoDB connection fails**: Verify `MONGODB_URI` is correct and network allows connection
- **Google Sheets 403**: Check API key is valid and Sheet is publicly accessible
- **Gemini import fails**: Verify `GEMINI_API_KEY` is valid and PDF is under size limit
- **Gemini slow/expensive**: Check cache is enabled (`GEMINI_CACHE_ENABLED=true`) and review metrics
- **Cache not working**: Verify MongoDB is accessible and collection `gemini_pdf_cache` exists
- **TypeScript errors in server**: Run `npm run build:server` to check for compilation issues
- **Auth issues**: Verify `JWT_SECRET` is set; check token expiration (`JWT_EXPIRES_IN`)
- **Password reset not working**: Verify SMTP or Resend credentials are configured
- **No admin user**: Check `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars; server auto-creates on startup
