---
phase: 05-modelo-de-dados
plan: "01"
subsystem: types
tags: [typescript, data-model, modules, retrocompatibility]
dependency_graph:
  requires: []
  provides:
    - src/types/projeto.ts → Entregavel, Etapa, AditivoRubrica, RubricaOrcamentaria, StatusParceiro, Parceiro, ProbabilidadeRisco, ImpactoRisco, StatusRisco, Risco, DecisaoGovernanca, SerieDados, IndicadorPesquisa, ModulosAtivos
    - server/types/projeto.ts → DBEntregavel, DBEtapa, DBAditivoRubrica, DBRubricaOrcamentaria, DBStatusParceiro, DBParceiro, DBProbabilidadeRisco, DBImpactoRisco, DBStatusRisco, DBRisco, DBDecisaoGovernanca, DBSerieDados, DBIndicadorPesquisa, DBModulosAtivos
  affects:
    - Phase 6 (API Backend) — all module endpoints depend on these types
key_files:
  created: []
  modified:
    - src/types/projeto.ts
    - server/types/projeto.ts
decisions:
  - "DB* prefix used in backend types to distinguish MongoDB-native types (e.g. Date) from API/frontend equivalents (ISO string)"
  - "parceirosModulo used for the array field in Projeto to avoid conflict with legacy parceiro?: string | null"
  - "All new fields are optional (?) to guarantee retrocompatibility with existing MongoDB documents"
  - "DBAditivoRubrica.data is Date | null (MongoDB native); frontend AditivoRubrica.data is string | null (ISO serialized)"
  - "DBDecisaoGovernanca.data is Date; frontend DecisaoGovernanca.data is string (ISO serialized at API boundary)"
metrics:
  duration_seconds: 116
  completed_date: "2026-03-24"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 5 Plan 01: Modelo de Dados — Tipos de Módulos Summary

TypeScript module types for 6 advanced monitoring modules (Etapas, Orçamento, Parceiros, Riscos, Governança, Indicadores) added to both frontend and backend type files with full retrocompatibility via optional fields.

## What Was Built

### Frontend — `src/types/projeto.ts`

14 new exported types added before `ProjetoCronograma`:

| Type | Module | Notes |
|------|--------|-------|
| `Entregavel` | Etapas | Leaf type for deliverables |
| `Etapa` | Etapas | Stage with 0-100 percentual |
| `AditivoRubrica` | Orçamento | Value addition; date as ISO string |
| `RubricaOrcamentaria` | Orçamento | Budget line with aditivos array |
| `StatusParceiro` | Parceiros | Union: Ativo \| Apoiador \| Consultor \| Inativo |
| `Parceiro` | Parceiros | Partner entity |
| `ProbabilidadeRisco` | Riscos | Union: Baixa \| Média \| Alta |
| `ImpactoRisco` | Riscos | Union: Baixo \| Médio \| Alto |
| `StatusRisco` | Riscos | Union: Aberto \| Mitigado \| Encerrado |
| `Risco` | Riscos | Risk with mitigation |
| `DecisaoGovernanca` | Governança | Decision record; date as ISO string |
| `SerieDados` | Indicadores | Data series point |
| `IndicadorPesquisa` | Indicadores | Research indicator with series |
| `ModulosAtivos` | Config | All flags optional boolean |

Fields added to `Projeto` and `ProjetoInput` (all optional):
- `modulosAtivos?: ModulosAtivos`
- `etapas?: Etapa[]`
- `rubricas?: RubricaOrcamentaria[]`
- `parceirosModulo?: Parceiro[]`
- `riscos?: Risco[]`
- `decisoes?: DecisaoGovernanca[]`
- `indicadores?: IndicadorPesquisa[]`

### Backend — `server/types/projeto.ts`

14 new exported DB-prefixed types added before `DBProjeto`:

`DBEntregavel`, `DBEtapa`, `DBAditivoRubrica`, `DBRubricaOrcamentaria`, `DBStatusParceiro`, `DBParceiro`, `DBProbabilidadeRisco`, `DBImpactoRisco`, `DBStatusRisco`, `DBRisco`, `DBDecisaoGovernanca`, `DBSerieDados`, `DBIndicadorPesquisa`, `DBModulosAtivos`

Same optional module fields added to `DBProjeto`, `ProjetoApi`, and `ProjetoInput`.

**Key difference from frontend:** `DBAditivoRubrica.data` is `Date | null` and `DBDecisaoGovernanca.data` is `Date` — MongoDB stores native Date objects. The API layer serializes to ISO strings for the frontend.

## Verification Results

- `npx tsc --noEmit -p server/tsconfig.json` → exit code 0, zero errors
- `npx tsc --noEmit` (frontend) → zero errors in projeto.ts files; 4 pre-existing unused-import warnings in unrelated components (out of scope)
- All new fields are `?` optional — a `Projeto` or `DBProjeto` without `modulosAtivos` is valid TypeScript
- `normalizeProjeto()` uses `...projeto` spread — module fields pass through automatically without code changes

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 22e67c3 | feat(05-modelo-de-dados-01): add module types to frontend types |
| 2 | 93c762d | feat(05-modelo-de-dados-01): add DB module types to backend types |

## Self-Check: PASSED

Files exist:
- src/types/projeto.ts — FOUND (109 lines added)
- server/types/projeto.ts — FOUND (119 lines added)

Commits exist:
- 22e67c3 — FOUND
- 93c762d — FOUND
