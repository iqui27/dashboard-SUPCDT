# AGENTS.md - Dashboard SECTI

Este arquivo fornece orientações para agentes de código AI trabalhando no Dashboard SECTI.

**Idioma**: Português (pt-BR)  
**Última atualização**: 2026-02-05

---

## Visão Geral do Projeto

O **Dashboard SECTI** é um sistema de gestão e acompanhamento de projetos de fomento ("Fomentos") do governo brasileiro. A aplicação gerencia status de projetos, acompanhamento financeiro, alocações parlamentares, distribuição regional, fluxos de aprovação de parcerias com organizações da sociedade civil (OSCs), e autenticação de usuários com controle de acesso baseado em papéis.

---

## Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Roteamento**: React Router v6
- **UI Library**: Tailwind CSS 3.4 + shadcn/ui (componentes Radix UI)
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **Estado**: React Context API (AuthContext)

### Backend
- **Runtime**: Node.js + Express.js 5
- **Linguagem**: TypeScript
- **Execução**: tsx (dev), compilado para dist-server/ (prod)

### Banco de Dados
- **MongoDB 6** com driver oficial
- Coleções principais: `custom_projects`, `status_updates`, `users`, `oscs`, `parlamentares`, `gemini_pdf_cache`

### Autenticação
- JWT (jsonwebtoken) + bcrypt para hash de senhas
- Papéis: `admin`, `editor`, `viewer`

### APIs Externas
- **Google Sheets API**: Leitura de dados de planilhas públicas e importação via service account
- **Google Gemini AI**: Extração de dados de PDFs (modelo gemini-1.5-flash-latest)
- **Email**: Nodemailer (SMTP) ou Resend API + React Email templates

---

## Estrutura do Projeto

```
Dashboard SECTI/
├── src/                          # Frontend React
│   ├── App.tsx                   # App principal com 7 abas
│   ├── AppRouter.tsx             # Roteamento com proteção de rotas
│   ├── index.tsx                 # Entry point React
│   ├── contexts/
│   │   └── AuthContext.tsx       # Estado de autenticação
│   ├── components/               # Componentes React
│   │   ├── Dashboard.tsx         # Painel principal com KPIs
│   │   ├── ManageProjects/       # CRUD de projetos (modular)
│   │   ├── charts/               # Componentes de gráficos
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/                    # Hooks customizados
│   ├── lib/                      # Utilitários e API clients
│   └── types/                    # Tipos TypeScript
│       ├── fomento.ts            # Modelo principal de dados
│       └── osc.ts                # Modelo de OSCs
│
├── server/                       # Backend Express
│   ├── index.ts                  # Setup do Express, rotas
│   ├── db/client.ts              # Conexão MongoDB (singleton)
│   ├── middleware/
│   │   └── auth.ts               # Verificação JWT
│   ├── routes/                   # Rotas da API
│   │   ├── auth.ts               # Login, logout, users
│   │   ├── projects.ts           # CRUD de projetos + import PDF
│   │   ├── osc.ts                # Gestão de OSCs
│   │   └── ...
│   ├── services/                 # Lógica de negócio
│   │   ├── geminiImport.ts       # Importação AI de PDFs
│   │   ├── users.ts              # CRUD de usuários
│   │   └── scheduledJobs.ts      # Jobs de limpeza automática
│   ├── emails/                   # Templates React Email
│   └── scripts/                  # Scripts utilitários (~40 arquivos)
│
├── dist/                         # Build do frontend (Vite)
├── dist-server/                  # Build do backend (TypeScript)
├── public/                       # Assets estáticos
├── .env                          # Variáveis de ambiente (não commitar)
├── package.json                  # Dependências e scripts
├── vite.config.ts                # Configuração Vite
├── tailwind.config.js            # Configuração Tailwind
└── Dockerfile                    # Container Docker
```

---

## Comandos de Build e Desenvolvimento

### Desenvolvimento Frontend
```bash
npm install                 # Instalar dependências
npm run dev                 # Servidor Vite dev (http://localhost:5173)
npm run build              # Build produção (saída em dist/)
npm run preview            # Preview do build local
npm run lint               # ESLint em arquivos TS/React
```

### Desenvolvimento Backend
```bash
npm run server             # Executar backend em dev (tsx)
npm run build:server       # Compilar TypeScript (saída em dist-server/)
npm run start:server       # Executar servidor compilado
npm start                  # Alias para start:server
```

### Deployment
```bash
npm run heroku-postbuild   # Roda automaticamente no Heroku
```

### Criar Usuário via Terminal
```bash
tsx server/scripts/createUser.ts <username> <password> [email] [perfil]
# perfil: admin | editor | viewer (padrão: viewer)
```

---

## Variáveis de Ambiente

### Frontend (.env - prefixo VITE_)
```env
VITE_GOOGLE_SHEETS_API_KEY=    # Chave pública da API Sheets
VITE_GOOGLE_SHEET_ID=          # ID da planilha Google padrão
VITE_GOOGLE_SHEETS_RANGE=      # Range (ex: 'FOMENTOS 2025')
VITE_API_BASE_URL=             # URL do backend (padrão: http://localhost:4000)
```

### Backend (.env - sem prefixo)
```env
# Database & Server
MONGODB_URI=                   # Connection string MongoDB
PORT=                          # Porta do servidor (padrão: 4000)
HOST=                          # Host (padrão: 0.0.0.0)
NODE_ENV=                      # 'production' ou 'development'
FRONTEND_URL=                  # URL frontend para CORS

# Autenticação
JWT_SECRET=                    # Segredo para assinar JWT (ALTERAR EM PROD)
JWT_EXPIRES_IN=                # Expiração JWT (padrão: 24h)
ADMIN_USERNAME=                # Admin padrão (padrão: admin)
ADMIN_PASSWORD=                # Senha admin padrão
ADMIN_EMAIL=                   # Email admin padrão
APP_BASE_URL=                  # URL base para links de reset de senha

# Email (SMTP via Nodemailer)
SMTP_HOST=                     # Host SMTP
SMTP_PORT=                     # Porta SMTP (padrão: 587)
SMTP_USER=                     # Usuário SMTP
SMTP_PASSWORD=                 # Senha SMTP
SMTP_SECURE=                   # Usar TLS
RESEND_API_KEY=                # API key Resend (alternativa ao SMTP)
MAIL_FROM=                     # Email remetente

# Google Services
GOOGLE_SERVICE_ACCOUNT_EMAIL=  # Conta de serviço para Sheets
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=  # Chave privada da conta de serviço
GOOGLE_SHEETS_API_KEY=         # Chave API server-side
GOOGLE_SHEET_ID=               # ID da planilha server-side
GOOGLE_SHEETS_RANGE=           # Range server-side

# Gemini AI
GEMINI_API_KEY=                # Chave API Google Gemini (obrigatória)
GEMINI_MODEL=                  # Modelo (padrão: models/gemini-1.5-flash-latest)
GEMINI_MAX_FILE_SIZE_MB=       # Limite tamanho PDF (padrão: 16)
GEMINI_MAX_RETRIES=            # Tentativas retry (padrão: 3)
GEMINI_RETRY_DELAY_MS=         # Delay base retry (padrão: 1000)
GEMINI_CACHE_ENABLED=          # Habilitar cache (padrão: true)
GEMINI_CACHE_TTL_DAYS=         # TTL cache em dias (padrão: 7)

# Manutenção
CLEANUP_INTERVAL_HOURS=        # Intervalo limpeza automática (padrão: 24)
```

---

## Modelos de Dados Principais

### Fomento (Projeto)
```typescript
interface Fomento {
  id: string;
  origin?: 'custom' | 'sheet';
  statusProjeto: 'Reprovada' | 'Em andamento' | 'Assinado' | 'Encerrado';
  categoria: 'Emenda' | 'INEX' | 'Convênio' | 'Outro' | 'Recurso Proprio';
  tipoInstrumento?: 'Termo de Colaboração' | 'Termo de Fomento';
  
  // Identificadores
  numeroTermoFomento: string;      // Número do termo de fomento
  processoSEI: string;             // Número processo SEI
  projeto: string;                 // Nome do projeto
  assinaturaPublicacao: string;    // Info assinatura/publicação
  
  // Timeline
  vigenciaInicio: Date | null;
  vigenciaEvento: Date | null;
  vigenciaFinal: Date | null;
  statusDesde: Date | null;
  
  // Financeiro
  valorTotal: number;
  financeiroParcela1-4: number | string;
  tipoSituacaoPagamento: string;
  aditivosVigencia: AditivoVigencia[];
  aditivosValor: AditivoValor[];
  
  // Stakeholders
  parlamentar: string;
  emendasParlamentares: EmendaParlamentar[];
  osc: string;
  presidenteOSC: string;
  coordenadorProjeto: string;
  
  // Localização
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
  
  // Prazos
  prazos: Prazos;                  // 5 deadlines + flags de cumprimento
  diasParado?: number;
  diasLimite?: number;
  
  // Histórico
  historicoMovimentacoes: MovimentacaoHistorico[];
  notasObs: string;
}
```

### Usuário
```typescript
type UserRole = 'admin' | 'editor' | 'viewer';

interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;       // bcrypt
  role?: UserRole;
  email?: string;
  fullName?: string;
  department?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}
```

### Papéis de Usuário
| Perfil   | Permissões |
|----------|-----------|
| `admin`  | Acesso total: gerenciar usuários, criar/excluir projetos, editar qualquer dado |
| `editor` | Editar projetos, importar PDFs, registrar atualizações. Não acessa gerenciamento de usuários |
| `viewer` | Somente leitura: visualizar dashboards e detalhes, sem salvar alterações |

---

## Rotas da API

### Autenticação (`/api/auth`)
- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/me` - Info do usuário atual
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Alterar senha
- `POST /api/auth/forgot-password` - Solicitar reset de senha
- `POST /api/auth/reset-password` - Reset com token
- `GET /api/auth/users` - Listar usuários (admin)
- `POST /api/auth/users` - Criar usuário (admin)
- `PATCH /api/auth/users/:id` - Atualizar usuário (admin)

### Projetos (`/api/projects`)
- `GET /api/projects` - Listar projetos customizados
- `GET /api/projects/:id` - Obter projeto específico
- `POST /api/projects` - Criar projeto (requer auth)
- `PUT /api/projects/:id` - Atualizar projeto (requer auth)
- `DELETE /api/projects/:id` - Excluir projeto (requer auth)
- `POST /api/projects/import` - Importar de PDF via Gemini AI

### OSCs (`/api/oscs`)
- `GET /api/oscs` - Listar OSCs
- `POST /api/oscs` - Criar OSC
- `PUT /api/oscs/:id` - Atualizar OSC
- `DELETE /api/oscs/:id` - Excluir OSC
- `POST /api/oscs/bulk` - Bulk upsert

### Outras rotas
- `/api/status-updates` - Histórico de status
- `/api/status-responsibles` - Responsáveis por projeto
- `/api/project-overrides` - Sobrescritas de campos
- `/api/data-sources` - Fontes de dados (Google Sheets)
- `/api/parlamentares` - Dados de parlamentares
- `/api/migration` - Migração e sincronização
- `/api/gemini-metrics` - Métricas de uso da AI
- `/api/maintenance` - Manutenção do sistema

---

## Convenções de Código

### Importações
- Usar alias `@/` para imports de `src/`:
  ```typescript
  import { Button } from '@/components/ui/button';
  ```

### Nomenclatura
- **Componentes**: PascalCase (ex: `Dashboard.tsx`)
- **Hooks**: camelCase prefixado com `use` (ex: `useOscs.ts`)
- **Utilitários**: camelCase (ex: `currencyUtils.ts`)
- **Tipos/Interfaces**: PascalCase (ex: `Fomento`, `UserRole`)
- **Enums**: PascalCase para tipo, UPPER_SNAKE_CASE para valores

### Organização de Componentes
- Componentes grandes são modularizados em subpastas (ex: `ManageProjects/`)
- Cada subcomponente em arquivo separado
- Hooks customizados em pasta `hooks/`
- Utilitários específicos em pasta `utils/`

### Tratamento de Datas
- Armazenar como ISO strings no MongoDB
- Converter para `Date` no cliente via `parseDate()` em `src/lib/utils.ts`
- Formatar exibição via `formatDate()`

### Formatação Financeira
- Usar `formatCurrency()` para Brazilian Real (R$)
- Separador de milhares, duas casas decimais

---

## Testes

### Configuração
- **Playwright** configurado para E2E (`@playwright/test`)
- ESLint para linting de TypeScript/React

### Executar
```bash
npm run lint               # Verificação de lint
# Testes E2E são executados via Playwright CLI
```

---

## Deploy

### Plataformas Suportadas
1. **Heroku**: Configurado via `heroku-postbuild` script
2. **Vercel**: Configuração em `vercel.json` (SPA rewrite)
3. **Docker**: Multi-stage build (`Dockerfile` + `docker-compose.yml`)

### Docker
```bash
# Build e execução
docker-compose up -d

# Acesso em http://localhost:8080
```

### Notas de Deploy
- Frontend e backend são builds separados
- Frontend servido via nginx no container
- Backend requer todas as variáveis de ambiente configuradas
- MongoDB deve estar acessível na rede

---

## Manutenção e Monitoramento

### Métricas Gemini AI
```bash
GET /api/gemini-metrics/recent          # Últimas 24h
GET /api/gemini-metrics/summary?startDate=...&endDate=...  # Range custom
```

### Jobs de Limpeza Automática
- Executam a cada 24 horas (configurável)
- Limpam cache de PDFs expirados (7 dias TTL)
- Remove métricas antigas (30 dias retenção)

### Limpeza Manual
```bash
POST /api/maintenance/cleanup
```

---

## Segurança

### Considerações Importantes
1. **Nunca commitar** `.env` ou arquivos com credenciais
2. `JWT_SECRET` deve ser único e forte em produção
3. CORS configurado para permitir apenas origens específicas em produção
4. Senhas sempre hasheadas com bcrypt
5. Tokens de reset de senha expiram após 1 hora
6. Upload de PDFs limitado por tamanho (padrão 16MB)

### Admin Padrão
- Criado automaticamente na primeira execução do servidor
- Configurado via `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`

---

## Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| "Cannot find module '@/...'" | Verificar alias em `vite.config.ts` |
| Erros CORS | Verificar backend rodando e `VITE_API_BASE_URL` |
| Falha conexão MongoDB | Verificar `MONGODB_URI` e acesso de rede |
| Google Sheets 403 | Verificar API key e permissões da planilha |
| Falha importação Gemini | Verificar `GEMINI_API_KEY` e tamanho do PDF |
| Cache não funciona | Verificar MongoDB e coleção `gemini_pdf_cache` |
| Erros TypeScript no server | Rodar `npm run build:server` para diagnosticar |
| Problemas de auth | Verificar `JWT_SECRET` e expiração do token |

---

## Arquitetura de Dados

### Fluxo de Dados
1. **Autenticação**: Login → JWT token → Header `Authorization: Bearer`
2. **Carregamento**: App monta e carrega em paralelo: projetos, status-updates, overrides
3. **Merge**: No cliente, merges acontecem em `App.tsx`:
   - Overrides aplicados aos campos dos projetos
   - Status updates mergeados em `historicoMovimentacoes`
   - Resultados ordenados por atividade recente
4. **Atualizações**: REST API com autenticação JWT

### Modelo Híbrido
- Dados de Google Sheets são **read-only** do ponto de vista do frontend
- Para "editar", criar **project override** via API
- Projetos customizados são read-write em MongoDB
- Overrides aplicados client-side antes da renderização

---

## Padrões de Desenvolvimento

### Novo Componente Frontend
1. Criar em `src/components/`
2. Importar em `App.tsx` se for nova aba
3. Usar componentes shadcn/ui quando possível

### Nova Rota API
1. Criar arquivo em `server/routes/`
2. Montar em `server/index.ts`
3. Adicionar middleware `requireAuth` ou `requireAdmin` conforme necessário

### Novo Tipo
1. Atualizar `src/types/fomento.ts` (frontend)
2. Atualizar `server/types/fomento.ts` (backend) - são arquivos separados

### Fetching de Dados
```typescript
useEffect(() => {
  Promise.all([
    fetchCustomProjects(),
    fetchStatusUpdates(),
    fetchProjectOverrides(),
  ]).then(([projects, updates, overrides]) => {
    // Merge e ordenação
  });
}, []);
```

---

## Recursos Adicionais

### Documentação Existente
- `CLAUDE.md` - Documentação técnica detalhada
- `README.md` - Guia rápido de início
- `IMPLEMENTACAO_COMPLETA.md` - Histórico de implementação
- `REFATORACAO_E_AUTENTICACAO.md` - Detalhes da autenticação
- Arquivos `*.md` adicionais na raiz com documentação específica

### Scripts Úteis em `server/scripts/`
- `createUser.ts` - Criar usuário via CLI
- `importOscsFromCsv.ts` - Importar OSCs de CSV
- `checkDatabase.ts` - Verificar estado do banco
- `update*.ts` - Scripts de migração de dados
- `inspect*.ts` - Scripts de inspeção

---

## Contato e Suporte

Para dúvidas sobre o projeto, consultar:
1. Este arquivo (`AGENTS.md`)
2. `CLAUDE.md` para detalhes técnicos profundos
3. Código-fonte em `src/` e `server/`

---

## 🧠 Memória Compartilhada (clawd-memory)

Você tem acesso a uma **memória compartilhada** via `~/clawd-memory/` para persistir conhecimento entre sessões.

### Comandos Essenciais
```bash
# Sincronizar memória (início e fim da sessão)
~/clawd-memory/scripts/sync.sh

# Consultar memória (antes de responder)
~/clawd-memory/scripts/query.sh "termo de busca"
```

### Workflow Recomendado
1. **Início**: Execute `sync.sh` para atualizar conhecimento local
2. **Antes de responder**: Use `query.sh` para verificar se há contexto relevante
3. **Aprendeu algo**: Crie nota em `vault/knowledge/` ou `vault/decisions/`
4. **Final**: Execute `sync.sh` para persistir alterações

### Estrutura do Vault
```
~/clawd-memory/vault/
├── projects/     # Projetos ativos
├── knowledge/    # Conhecimento geral
├── decisions/    # Decisões arquiteturais
├── meetings/     # Notas de reuniões
└── scratch/      # Rascunhos temporários
```

### ⚠️ Regra de Ouro
> Se aprender algo novo ou tomar uma decisão importante, **documente no vault e sincronize**.

Documentação completa: https://github.com/iqui27/clawd-memory/blob/main/AGENT_CONTEXT.md
