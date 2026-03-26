---
phase: 11-polish-ux-formularios-pdf
plan: "01"
subsystem: lancamentos-crud + projeto-edit-modal
tags: [backend, frontend, crud, modal, lancamentos, projetos]
dependency_graph:
  requires: []
  provides: [PUT /api/lancamentos/:id, DELETE /api/lancamentos/:id, EditarProjetoModal]
  affects: [DetalheProjeto, lancamentos CRUD, metas recalculation]
tech_stack:
  added: []
  patterns: [findOneAndUpdate, recalculateProjetoMetas, conditional modal rendering]
key_files:
  created:
    - src/components/supcdt/EditarProjetoModal.tsx
  modified:
    - server/routes/lancamentos.ts
    - server/services/lancamentos.ts
    - server/types/projeto.ts
    - src/lib/api/lancamentos.ts
    - src/components/supcdt/DetalheProjeto.tsx
key_decisions:
  - "Reused updateProjeto from src/lib/api/projetos.ts rather than creating new endpoint — existing PUT /api/projetos/:id already handles all editable fields"
  - "Added dataAtividade and updatedAt to DBLancamento type (Rule 2 - missing critical fields) to enable proper date tracking on lançamentos"
  - "recalculateProjetoMetas called after both updateLancamento and deleteLancamento to keep meta progress in sync"
metrics:
  duration: "~6 minutes (cross-session)"
  completed: "2026-03-26"
  tasks_completed: 2
  files_changed: 5
---

# Phase 11 Plan 01: Backend CRUD Lançamentos + EditarProjetoModal Summary

**One-liner:** Backend PUT/DELETE lançamentos with auto-recalculation of metas plus a full-featured EditarProjetoModal wired into DetalheProjeto hero area.

## What Was Built

### Task 1 — Backend PUT/DELETE lançamentos + dataAtividade (commit `f61358f`)

- **`server/types/projeto.ts`** — Added `dataAtividade?: string | null` and `updatedAt?: Date` to `DBLancamento` interface
- **`server/services/lancamentos.ts`** — Added `updateLancamento(id, updateData)` (uses `findOneAndUpdate` + `$set`, strips immutable fields, calls `recalculateProjetoMetas` after) and `deleteLancamento(id)` (fetches projetoId first, deletes, calls `recalculateProjetoMetas`)
- **`server/routes/lancamentos.ts`** — Added `PUT /api/lancamentos/:id` and `DELETE /api/lancamentos/:id` routes, both protected by `requireAuth`, ObjectId validation
- **`src/lib/api/lancamentos.ts`** — Added `updateLancamento(id, data, token)` and `deleteLancamento(id, token)` client-side fetch wrappers

### Task 2 — EditarProjetoModal + DetalheProjeto wiring (commit `01a72af`)

- **`src/components/supcdt/EditarProjetoModal.tsx`** — New 292-line component with all 14 project fields (nome, nomeOSC, status, categoria, responsavelSECTI, parceiro, numeroTermo, processoSEI, valorTotal, dataInicio, dataFim, descricao, objetivos, raPerigao). Grid 2-column layout for short inputs, initialized from current project values, submits via `updateProjeto`, toast feedback, same visual pattern as MetaModal
- **`src/components/supcdt/DetalheProjeto.tsx`** — Import + `isEditarProjetoOpen` state + "Editar projeto" button with `<Pencil>` icon + conditional `EditarProjetoModal` render

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added dataAtividade + updatedAt to DBLancamento**
- **Found during:** Task 1
- **Issue:** `DBLancamento` in `server/types/projeto.ts` was missing `dataAtividade` and `updatedAt` fields which are required for proper lançamento editing functionality
- **Fix:** Added `dataAtividade?: string | null` and `updatedAt?: Date` to the interface
- **Files modified:** `server/types/projeto.ts`
- **Commit:** `f61358f`

**2. [Rule 1 - Bug] Accidentally removed PDF button during button insertion**
- **Found during:** Task 2 editing
- **Issue:** While inserting the "Editar projeto" button, the "PDF indisponível" disabled button was accidentally removed in an intermediate edit
- **Fix:** Restored the PDF button in the same edit that added the "Editar projeto" button
- **Files modified:** `src/components/supcdt/DetalheProjeto.tsx`
- **Commit:** `01a72af`

## Verification

- TypeScript: both `server/tsconfig.json` and root `tsconfig.json` compile with zero errors
- `PUT /api/lancamentos/:id` and `DELETE /api/lancamentos/:id` routes wired with `requireAuth`
- `EditarProjetoModal` uses `updateProjeto` from `src/lib/api/projetos.ts` (correct SUPCDT endpoint)
- No endpoints in `/api/projects`, `/api/data-sources`, or other "other dashboard" routes were touched

## Self-Check: PASSED

- ✅ `src/components/supcdt/EditarProjetoModal.tsx` — FOUND
- ✅ `server/services/lancamentos.ts` — FOUND
- ✅ `.planning/phases/11-polish-ux-formularios-pdf/11-01-SUMMARY.md` — FOUND
- ✅ commit `f61358f` — FOUND
- ✅ commit `01a72af` — FOUND
