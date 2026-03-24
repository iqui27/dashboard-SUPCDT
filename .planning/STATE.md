# State — Dashboard SUPCDT

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Cada projeto pode ser monitorado com o nível de detalhe que seu contrato exige — sem configuração técnica
**Current focus:** Phase 5 — Modelo de Dados (v1.1 Módulos de Monitoramento Avançado)

## Current Position

Phase: 5 of 10 (Modelo de Dados)
Plan: 1 of ? in current phase
Status: In progress
Last activity: 2026-03-24 — Plan 05-01 completo: tipos de módulos TypeScript definidos (frontend + backend)

Progress: [████░░░░░░] 40% (phases 1-4 completas, 6 novas iniciando)

## Performance Metrics

**Velocity:**
- Total plans completed: 9 (phases 1-4)
- Average duration: not tracked
- Total execution time: not tracked

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Brand, Auth & Data | 2/2 | Complete |
| 2. Monitoring Model | 2/2 | Complete |
| 3. Wi-Fi Social | 3/3 | Complete |
| 4. Product Polish | 2/2 | Complete |
| 5-10. Módulos v1.1 | 1/? | In progress |

## Accumulated Context

### Decisions

- Dados dos módulos embutidos no documento `custom_projects` — sem novas coleções MongoDB
- Módulos são opcionais via flags `modulosAtivos` com default false — projetos existentes não quebram
- UI segue padrão estabelecido no PR #3 (divide-y, rounded-[1.35rem], botões h-8 rounded-full)
- Passo 5 no wizard para configurar módulos na criação; painel de engrenagem para edição pós-criação
- DB* prefix usado no backend para distinguir tipos com Date nativo de tipos API com string ISO
- parceirosModulo usado no array de módulo para evitar conflito com campo legado parceiro?: string | null

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 8 e Phase 9 podem ser executadas em paralelo (UI independente), mas Phase 8 deve terminar primeiro para validar o padrão visual antes da Phase 9
- TypeScript espelhado em dois lugares (`src/types/projeto.ts` e `server/types/projeto.ts`) — qualquer alteração nos tipos precisa ser feita em ambos

## Session Continuity

Last session: 2026-03-24
Stopped at: Completed 05-01-PLAN.md — tipos de módulos TypeScript (frontend + backend) definidos
Resume file: None
