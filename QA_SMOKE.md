# QA e Smoke Test

## Objetivo
Executar uma checagem curta antes de homologação ou deploy para garantir que os fluxos mínimos do Dashboard SUPCDT continuam íntegros.

## Cobertura atual
- redirecionamento de rota protegida para login
- renderização do login institucional
- validação pública do fluxo de recuperação de senha
- renderização da tela de redefinição com `?token=...`
- fluxo autenticado opcional até o módulo `Wi‑Fi Social`
- separação entre smoke público e smoke autenticado
- bloqueio explícito para API remota no smoke autenticado, salvo opt-in manual
- QA local com fixture reproduzível de projeto, lançamento e pontos Wi‑Fi
- exportação do CSV Saiweb validada com conteúdo real do ambiente local
- criação de novo lançamento validada ponta a ponta entre detalhe do projeto e relatório
- gestão de usuários validada localmente com criação, edição e trava contra auto-rebaixamento do admin
- desativação, reativação e reset de senha validados com login real do usuário gerenciado

## Pré-requisitos
1. Instalar navegador do Playwright:
   ```bash
   npx playwright install chromium
   ```
2. Garantir que o ambiente local tenha backend funcional com `.env` válido.
3. Para o fluxo recomendado, copiar `.env.e2e.local.example` para `.env.e2e.local`.
4. Para o fluxo autenticado local, subir o Mongo isolado:
   ```bash
   npm run e2e:mongo:up
   ```

## Execução

### Smoke pública
Roda sem credenciais e valida apenas os fluxos públicos:
```bash
npm run test:smoke:public
```

### Smoke autenticada
Valida login e navegação básica até o módulo Wi‑Fi Social:
```bash
E2E_USERNAME="seu.usuario" \
E2E_PASSWORD="sua_senha" \
npm run test:smoke:auth
```

### Smoke autenticada local recomendada
Usa `.env.e2e.local`, exige API e Mongo locais, garante o usuário `smoke.qa` e sobe o app com esse ambiente:
```bash
npm run test:smoke:auth:local
```

### QA funcional local
Semeia fixtures reproduzíveis de projeto, lançamento, Wi‑Fi Social e usuários e valida navegação, relatórios, criação de lançamento, exportação CSV, edição local e governança de acesso:
```bash
npm run test:functional:local
```

Para inspecionar manualmente com o mesmo ambiente:
```bash
npm run dev:e2e
```

Para derrubar o Mongo local ao final:
```bash
npm run e2e:mongo:down
```

Se quiser reaproveitar `ADMIN_USERNAME` e `ADMIN_PASSWORD` do `.env`:
```bash
E2E_USE_ADMIN_FROM_ENV=true npm run test:smoke:auth
```

Se a `VITE_API_BASE_URL` do `.env` apontar para uma API remota, o runner bloqueia por padrão. Para assumir esse risco conscientemente:
```bash
E2E_ALLOW_REMOTE_API=true \
E2E_USE_ADMIN_FROM_ENV=true \
npm run test:smoke:auth
```

### Contra ambiente já rodando
Se frontend/backend já estiverem no ar:
```bash
E2E_BASE_URL="http://127.0.0.1:5173" npm run test:smoke:public
```

## Observações
- A suíte usa `npm run dev` automaticamente quando `E2E_BASE_URL` não é informado.
- O fluxo autenticado é opcional e fica em `skip` quando as credenciais não são fornecidas.
- O runner autenticado exige credenciais explícitas ou `E2E_USE_ADMIN_FROM_ENV=true`.
- O runner autenticado recusa API remota por padrão e só libera com `E2E_ALLOW_REMOTE_API=true`.
- O runner `test:smoke:auth:local` exige `.env.e2e.local`, `VITE_API_BASE_URL` local e `MONGODB_URI` local.
- O runner `test:smoke:auth:local` faz preflight de Mongo e aborta cedo se o banco local não estiver acessível.
- O Mongo local recomendado sobe por `docker-compose.e2e.yml` e usa volume persistente `mongo-e2e-data`.
- O runner `test:functional:local` também garante o usuário de smoke, o admin local e semeia fixtures idempotentes de projeto, lançamento, Wi‑Fi e usuários antes do Playwright.
- A suíte funcional local também registra um lançamento novo e confirma sua presença no CSV exportado.
- A suíte funcional local também valida criação e edição de usuário por admin, impede o auto-rebaixamento do usuário autenticado e confirma desativação, reativação e reset de senha com tentativa real de login.
- Os resultados ficam em `test-results/playwright/` quando há falha.

## Checklist manual recomendado
- login com usuário real
- navegação entre `Painel`, `Projetos`, `Wi‑Fi Social` e `Relatórios`
- registro de lançamento com impacto visível no histórico do projeto
- exportação do CSV Saiweb com conteúdo coerente
- cadastro/edição de um ponto Wi‑Fi
- criação/edição de usuário com validação de proteção do próprio admin
- desativação e reset de senha com verificação real de login do usuário afetado
- leitura do detalhe de um projeto
- recuperação de senha em ambiente com e-mail configurado
