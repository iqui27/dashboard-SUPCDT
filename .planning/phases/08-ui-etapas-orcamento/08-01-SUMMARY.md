---
phase: 08-ui-etapas-orcamento
plan: 01
subsystem: frontend
tags: [api, etapas, orcamento, components, crud]
requires:
  - 06-01-PLAN.md (backend endpoints)
  - 05-01-PLAN.md (type definitions)
provides:
  - API layer for etapas CRUD (6 functions)
  - API layer for orcamento CRUD (4 functions)
  - EtapasSection component for DetalheProjeto
affects:
  - src/lib/api/etapas.ts
  - src/lib/api/orcamento.ts
  - src/components/supcdt/EtapasSection.tsx
tech-stack:
  added: []
  patterns:
    - Typed fetch wrappers following projetos.ts pattern
    - normalizeProjeto on all responses
    - Conditional rendering based on modulosAtivos
key-files:
  created:
    - src/lib/api/etapas.ts
    - src/lib/api/orcamento.ts
    - src/components/supcdt/EtapasSection.tsx
  modified: []
decisions:
  - API functions return normalized Projeto for consistency
  - EtapasSection handles its own conditional visibility (returns null)
  - Inline forms for new etapa/add entregável (not modals)
metrics:
  duration: 3 minutes
  completed: 2026-03-24
  tasks: 2
  files: 3
---

# Phase 8 Plan 1: API Layer + EtapasSection Summary

## One-liner

Created frontend API modules for etapas (6 functions) and orcamento (4 functions), plus the EtapasSection component with inline editing, deliverable checklists, and conditional visibility.

## Changes Made

### Task 1: API Modules
- Created `src/lib/api/etapas.ts` with 6 CRUD functions:
  - `createEtapa`, `updateEtapa`, `deleteEtapa`
  - `toggleEntregavel`, `addEntregavel`, `deleteEntregavel`
- Created `src/lib/api/orcamento.ts` with 4 CRUD functions:
  - `createRubrica`, `updateRubrica`, `deleteRubrica`, `addAditivo`
- All functions typed, use Bearer token, return `normalizeProjeto(await response.json())`

### Task 2: EtapasSection Component
- Conditional visibility: returns `null` when `modulosAtivos.etapas` is not `true`
- Layout: `rounded-[1.35rem]` card matching DetalheProjeto pattern
- Features:
  - Inline percent editing (click to edit, Enter/blur to save)
  - Entregáveis checklist with toggle via PATCH API
  - Add entregável inline input
  - Nova etapa inline form (nome + percentual)
  - Delete etapa/entregável with trash icon
- Uses `useAuth()` for token, `toast` from sonner for errors

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/api/etapas.ts` | API functions for etapas CRUD |
| `src/lib/api/orcamento.ts` | API functions for orcamento CRUD |
| `src/components/supcdt/EtapasSection.tsx` | Etapas UI section |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:
1. ✅ TypeScript compiles without new errors
2. ✅ `etapas.ts` exports 6 functions
3. ✅ `orcamento.ts` exports 4 functions
4. ✅ `EtapasSection.tsx` exports EtapasSection component
5. ✅ Component checks `modulosAtivos.etapas` and returns null when falsy

## Commits

1. `a0ee091` - feat(08-01): add frontend API modules for etapas and orcamento
2. `5134a06` - feat(08-01): create EtapasSection component

## Next Steps

- 08-02: Create OrcamentoSection component + wire both sections into DetalheProjeto