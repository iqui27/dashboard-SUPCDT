# Dashboard SUPCDT — Roadmap

## Milestones

- ✅ **v1.0 Fundação + Monitoramento + Wi-Fi Social** - Phases 1-4 (concluído)
- 🚧 **v1.1 Módulos de Monitoramento Avançado** - Phases 5-10 (em andamento)

---

<details>
<summary>✅ v1.0 Fundação + Monitoramento + Wi-Fi Social (Phases 1-4) — CONCLUÍDO</summary>

### Phase 01: Brand, Auth & Data Foundation
**Goal:** Remover atalhos inseguros, dar identidade própria ao produto e alinhar o contrato de dados para que as telas mostrem informação real.
**Requirements:** [AUTH-01, AUTH-02, BRAND-01, DATA-01, DATA-02, UX-01]
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Rebrand do login, remoção do bypass e shell responsivo
- [x] 01-02-PLAN.md — Auditoria de componentes e alinhamento do contrato de dados

**Key Results:**
- Login exclusivo do SUPCDT, sem "entrar sem login"
- Header e navegação consistentes em desktop e mobile
- Componentes principais usando dados reais ou empty states honestos
- Backend e frontend falando o mesmo shape de projeto

---

### Phase 02: Monitoring Model & Operational Readiness
**Goal:** Transformar projetos e metas em um sistema de monitoramento executivo e operacional confiável.
**Requirements:** [MON-01, MON-02, DATA-01, QUAL-01]
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Camada de métricas e estados de monitoramento derivados da base atual
- [x] 02-02-PLAN.md — Modelo de expansão de dados para bloqueios, riscos, responsáveis e evidências

**Key Results:**
- KPIs e alertas derivados de dados reais
- Visão clara de status, vigência, progresso, responsável, risco e saúde operacional
- Gaps de dados documentados e prontos para evolução
- Base operacional pronta para servir de fundação ao módulo Wi-Fi Social

---

### Phase 03: Wi-Fi Social Operations Module
**Goal:** Criar um módulo operacional completo do Wi-Fi Social com mapa do DF, pontos, cobertura e status.
**Requirements:** [WIFI-01, WIFI-02, WIFI-03, MON-02, UX-01]
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Modelo de dados e CRUD operacional de pontos Wi-Fi
- [x] 03-02-PLAN.md — Mapa do DF com pontos, filtros, cobertura e estados
- [x] 03-03-PLAN.md — Fluxos operacionais: incidentes, manutenção, pendências e visão executiva

**Key Results:**
- Cadastro e edição de pontos no mapa
- Status operacional e cobertura por região
- Leitura clara do que está funcionando e do que precisa de ação
- Fila operacional, manutenção e criticidade territorial disponíveis no módulo

---

### Phase 04: Full Product Polish & Production UX
**Goal:** Elevar toda a interface para padrão institucional moderno, responsivo e consistente.
**Requirements:** [UX-01, QUAL-01, BRAND-01]
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Responsividade, navegação e padrões de interação em todo o produto
- [x] 04-02-PLAN.md — Sistema visual final, acessibilidade e acabamento de produção

**Key Results:**
- Produto consistente em mobile e desktop
- UX coesa entre dashboards, detalhes, formulários e relatórios
- Aparência profissional, distinta e pronta para adoção
- Shell mais leve, com code splitting e carregamento progressivo por módulo

</details>

---

## 🚧 v1.1 Módulos de Monitoramento Avançado (Em andamento)

**Milestone Goal:** Cada projeto pode ser monitorado com o nível de detalhe que seu contrato exige — ativando apenas os módulos necessários (etapas, orçamento, parceiros, riscos, governança, indicadores) sem configuração técnica.

## Phases

- [x] **Phase 5: Modelo de Dados** - Tipos TypeScript para os 6 módulos + retrocompatibilidade com projetos existentes (completed 2026-03-24)
- 🚧 **Phase 6: API Backend** - Endpoints REST CRUD para todos os 6 módulos + configuração de módulos ativos (06-01, 06-02 completed 2026-03-24; 06-03 pending)
- [ ] **Phase 7: Wizard — Passo 5** - Aba "Módulos" no CriacaoProjetoWizard para ativar módulos na criação
- [ ] **Phase 8: UI Etapas + Orçamento** - Seções interativas de Etapas e Orçamento no DetalheProjeto
- [ ] **Phase 9: UI Parceiros, Riscos, Governança, Indicadores** - Quatro seções restantes no DetalheProjeto
- [ ] **Phase 10: Painel de Configuração** - Ícone de engrenagem para ativar/desativar módulos pós-criação

## Phase Details

### Phase 5: Modelo de Dados ✅
**Goal**: Todos os tipos TypeScript para os 6 módulos estão definidos no frontend e no backend, e projetos existentes continuam funcionando sem alteração
**Depends on**: Phase 4 (concluída)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10
**Status**: COMPLETE (2026-03-24)
**Plans:** 1/1 plans complete

Plans:
- [x] 05-01-PLAN.md — Tipos dos 6 módulos + ModulosAtivos em src/types/projeto.ts e server/types/projeto.ts

### Phase 6: API Backend 🚧
**Goal**: Gestor consegue criar, editar e excluir itens de qualquer módulo via API REST, e configurar quais módulos estão ativos no projeto
**Depends on**: Phase 5 ✅
**Requirements**: ETAP-01, ETAP-02, ETAP-03, ETAP-04, ETAP-05, ORÇA-01, ORÇA-02, ORÇA-03, ORÇA-04, PARC-01, PARC-02, PARC-03, RISC-01, RISC-02, RISC-03, GOVN-01, GOVN-02, INDC-01, INDC-02, INDC-03, MODU-01
**Success Criteria** (what must be TRUE):
  1. `POST /api/projetos/:id/etapas` cria uma etapa e retorna o projeto atualizado com status 200 ✓ (06-01)
  2. `PATCH /api/projetos/:id/modulos` altera os flags de módulos ativos e persiste no MongoDB ✓ (06-01)
  3. Todos os endpoints de CRUD retornam 401 sem token de autenticação ✓ (06-01, 06-02)
  4. Operações de escrita nos 6 módulos refletem imediatamente no documento do projeto em `projetos_supcdt` ✓ (06-01 para Etapas/Orçamento/Módulos, 06-02 para Parceiros/Riscos/Governança/Indicadores)
  5. Projetos sem campo `modulosAtivos` continuam sendo retornados corretamente pelo `GET /api/projetos` ✓
**Plans:** 3 plans (2/3 complete)

Plans:
- [x] 06-01-PLAN.md — Endpoints CRUD para Etapas, Orçamento e configuração de ModulosAtivos (COMPLETE 2026-03-24)
- [x] 06-02-PLAN.md — Endpoints CRUD para Parceiros, Riscos, Governança e Indicadores (COMPLETE 2026-03-24)
- [ ] 06-03-PLAN.md — (Pendente — Possível: Migrations, Utilities, ou API refinements)

### Phase 7: Wizard — Passo 5
**Goal**: Gestor consegue ativar módulos no momento de criação de um projeto via passo dedicado no wizard
**Depends on**: Phase 6
**Requirements**: WIZD-01, WIZD-02, WIZD-03
**Success Criteria** (what must be TRUE):
  1. O wizard exibe 5 abas de navegação e o passo "5. Módulos" é alcançável após os 4 passos existentes
  2. Cada toggle no passo 5 exibe nome e descrição de uma linha do módulo correspondente
  3. Ao concluir a criação, o projeto salvo no banco contém `modulosAtivos` refletindo os toggles selecionados
**Plans:** 1 plan

Plans:
- [ ] 07-01-PLAN.md — Switch component + Step 5 "Modulos" com toggles no CriacaoProjetoWizard

### Phase 8: UI Etapas + Orçamento
**Goal**: Gestor consegue ver, criar e editar etapas com entregáveis e rubricas orçamentárias diretamente no DetalheProjeto
**Depends on**: Phase 6
**Requirements**: UIET-01, UIET-02, UIET-03, UIET-04, UIET-05, UIOB-01, UIOB-02, UIOB-03, UIOB-04, UIOB-05
**Success Criteria** (what must be TRUE):
  1. A seção "Etapas" aparece no DetalheProjeto apenas quando `modulosAtivos.etapas` é true, e fica oculta caso contrário
  2. Gestor clica no percentual de uma etapa, edita inline e o valor é salvo via API sem recarregar a página
  3. Entregáveis aparecem como checklist; marcar um como concluído persiste o estado imediatamente
  4. A seção "Orçamento" exibe total previsto, executado e saldo no cabeçalho, com variação por rubrica em verde (≤100%) ou vermelho (>100%)
  5. Aditivos de uma rubrica são visíveis em sublista colapsável
**Plans:** 2 plans

Plans:
- [ ] 08-01-PLAN.md — API layer para etapas/orcamento + componente EtapasSection
- [ ] 08-02-PLAN.md — Componente OrcamentoSection + integracao no DetalheProjeto

### Phase 9: UI Parceiros, Riscos, Governança, Indicadores
**Goal**: Gestor consegue gerenciar parceiros, riscos, decisões e indicadores de pesquisa diretamente no DetalheProjeto
**Depends on**: Phase 8
**Requirements**: UIPA-01, UIPA-02, UIPA-03, UIRC-01, UIRC-02, UIRC-03, UIGN-01, UIGN-02, UIIN-01, UIIN-02
**Success Criteria** (what must be TRUE):
  1. Seção "Parceiros" exibe lista divide-y com nome, papel e badge de status; clicar no badge permite editar o status inline
  2. Seção "Riscos" exibe indicador visual de severidade por cor; riscos encerrados aparecem separados com opacidade reduzida
  3. Seção "Decisões" exibe lista cronológica; botão "Nova decisão" abre modal compacto e salva via API
  4. Seção "Indicadores" exibe barras horizontais por série de dados de cada indicador
  5. Todas as quatro seções aparecem somente quando os respectivos módulos estão ativos
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — API modules + ParceirosSection + RiscosSection
- [ ] 09-02-PLAN.md — GovernancaSection + IndicadoresSection + wiring no DetalheProjeto

### Phase 10: Painel de Configuração
**Goal**: Gestor consegue ativar ou desativar módulos em projetos já criados sem perder os dados do módulo
**Depends on**: Phase 9
**Requirements**: UIMD-01, UIMD-02, UIMD-03
**Success Criteria** (what must be TRUE):
  1. Ícone de engrenagem no header do DetalheProjeto abre painel com toggles de módulos
  2. Desativar um módulo oculta sua seção no DetalheProjeto mas os dados permanecem no banco
  3. Reativar o mesmo módulo restaura a seção com todos os dados anteriores intactos
**Plans:** 1 plan

Plans:
- [ ] 10-01-PLAN.md — Popover com gear icon + toggles de módulos no DetalheProjeto

## Progress

**Execution Order:**
5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Brand, Auth & Data Foundation | 2/2 | Complete | 2026-03-19 |
| 2. Monitoring Model & Operational Readiness | 2/2 | Complete | 2026-03-19 |
| 3. Wi-Fi Social Operations Module | 3/3 | Complete | 2026-03-19 |
| 4. Full Product Polish & Production UX | 2/2 | Complete | 2026-03-19 |
| 5. Modelo de Dados | 1/1 | Complete   | 2026-03-24 |
| 6. API Backend | 2/2 | Complete | 2026-03-24 |
| 7. Wizard — Passo 5 | 0/1 | Not started | - |
| 8. UI Etapas + Orçamento | 0/2 | Not started | - |
| 9. UI Parceiros, Riscos, Governança, Indicadores | 0/2 | Not started | - |
| 10. Painel de Configuração | 0/1 | Not started | - |

---

## Requirement IDs (v1.0)

| ID | Descrição |
|----|-----------|
| AUTH-01 | Login personalizado com identidade visual própria do SUPCDT |
| AUTH-02 | Remover qualquer atalho de acesso sem autenticação |
| BRAND-01 | Shell visual coerente entre login, header e dashboard |
| UX-01 | Componentes principais devem ficar responsivos e com UX profissional |
| DATA-01 | Verificar todos os componentes para garantir funcionamento real, sem hardcodes críticos |
| DATA-02 | Alinhar contrato de dados entre Mongo, backend e frontend |
| MON-01 | Extrair indicadores reais de monitoramento com base nos dados atuais de projetos e metas |
| MON-02 | Identificar gaps de monitoramento e preparar modelo de expansão de dados |
| WIFI-01 | Criar módulo do projeto Wi-Fi Social com interface dedicada |
| WIFI-02 | Mapa do DF com cadastro e visualização de pontos, status e cobertura |
| WIFI-03 | Permitir acompanhamento operacional: funcionando, cobertura, necessidade de ação, manutenção |
| QUAL-01 | Revisão ampla dos componentes atuais para acabamento visual e consistência de interação |
