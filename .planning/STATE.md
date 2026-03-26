# State — Dashboard SUPCDT

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Cada projeto pode ser monitorado com o nível de detalhe que seu contrato exige — sem configuração técnica
**Current focus:** Phase 11 — UX Polish, Formulários & PDF Export (EXECUTING)

## Current Position

Phase: 11 of 11 (UX Polish, Formulários & PDF Export) — EXECUTING
Plans: 2/4 complete (11-01, 11-02 done; 11-03, 11-04 pending)
Status: Executing Phase 11 — plan 02 complete
Last activity: 2026-03-26 — 11-02 Edição lançamentos + correção MetaModal

Progress: [████░░░░░░] 50% (Phase 11)

## Performance Metrics

**Velocity:**
- Total plans completed: 18 (phases 1-10)
- Average duration: ~3 minutes per plan
- Total execution time: ~3.4 hours cumulative

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Brand, Auth & Data | 2/2 | Complete |
| 2. Monitoring Model | 2/2 | Complete |
| 3. Wi-Fi Social | 3/3 | Complete |
| 4. Product Polish | 2/2 | Complete |
| 5. Data Model v1.1 | 1/1 | Complete |
| 6. API Backend | 2/2 | Complete |
| 7. Wizard Passo 5 | 1/1 | Complete |
| 8. UI Etapas + Orçamento | 2/2 | Complete |
| 9. UI Parceiros, Riscos, Gov, Ind | 2/2 | Complete |
| 10. Config | 1/1 | Complete |
| 11. UX Polish, Formulários & PDF | 1/4 | Executing |

## Accumulated Context

### Decisions

- Dados dos módulos embutidos no documento `custom_projects` — sem novas coleções MongoDB
- Módulos são opcionais via flags `modulosAtivos` com default false — projetos existentes não quebram
- UI segue padrão estabelecido no PR #3 (divide-y, rounded-[1.35rem], botões h-8 rounded-full)
- Passo 5 no wizard para configurar módulos na criação; painel de engrenagem para edição pós-criação
- DB* prefix usado no backend para distinguir tipos com Date nativo de tipos API com string ISO
- parceirosModulo usado no array de módulo para evitar conflito com campo legado parceiro?: string | null
- Switch component usa slate-950 para estado checked, consistente com design do projeto
- Orçamento variation usa verde (emerald) para <=100% e vermelho (rose) para >100%
- EtapasSection e OrcamentoSection retornam null quando módulo não ativo (auto-ocultação)
- StatusParceiro cores: Ativo=green (emerald), Apoiador=blue (sky), Consultor=amber, Inativo=slate
- Risco severity usa matriz 4 cores: critical (red), high (amber), moderate (yellow), low (green) baseado em probabilidade × impacto
- Riscos encerrados mostrados separadamente com opacity-50
  - **11-01:** Backend PUT/DELETE lançamentos + EditarProjetoModal — PUT/DELETE via `findOneAndUpdate` + `deleteOne`; modal usa `updateProjeto` existente, sem novos endpoints
  - **11-02:** LancamentoModal modo edição + date picker + delete; MetaModal envia apenas { metas } (não sobrescreve módulos); previsto padded para totalTrimestres
  - **Phase 11:** PDF export usa window.print() + CSS @media print — sem bibliotecas externas de PDF
- **Phase 11:** Semáforos usam dot colorido (h-2 w-2 rounded-full) com 3 cores: emerald (bom), amber (atenção), rose (crítico)
- **Phase 11:** MetaModal envia apenas `{ metas: novasMetas }` no update (não o projeto inteiro) para evitar sobrescrever dados de módulos

### Pending Todos

- Backend TypeScript errors in modulosEtapasOrcamento.ts and modulosParceirosRiscosGovInd.ts need fixing (pre-existing from Phase 6)

### Blockers/Concerns

- TypeScript espelhado em dois lugares (`src/types/projeto.ts` e `server/types/projeto.ts`) — qualquer alteração nos tipos precisa ser feita em ambos
- Endpoints do outro dashboard (English routes) NÃO podem ser modificados — produção em https://dashboard-secti-2025.vercel.app

## Session Continuity

Last session: 2026-03-26
Stopped at: Phase 11, Plan 02 complete — Edição lançamentos + correção MetaModal
Next planned: Execute Phase 11 Plan 03 — `/gsd-execute-phase 11-polish-ux-formularios-pdf`
Resume file: .planning/phases/11-polish-ux-formularios-pdf/
