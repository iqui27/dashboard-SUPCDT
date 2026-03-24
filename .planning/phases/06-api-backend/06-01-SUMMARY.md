---
phase: 06-api-backend
plan: "01"
subsystem: Backend APIs
tags: [REST, CRUD, MongoDB, Express, Stages, Budget, ModuleConfig]
completed_date: "2026-03-24"
duration_seconds: 486
dependency_graph:
  requires:
    - server/types/projeto.ts (DBEtapa, DBRubricaOrcamentaria, DBModulosAtivos)
    - server/middleware/auth.ts (requireAuth)
    - server/db/client.ts (getDatabase)
  provides:
    - server/routes/modulosEtapasOrcamento.ts (11 endpoints)
    - Mounted on /api/projetos in server/index.ts
  affects:
    - Requirements: ETAP-01, ETAP-02, ETAP-03, ETAP-04, ETAP-05, ORÇA-01, ORÇA-02, ORÇA-03, ORÇA-04, MODU-01
tech_stack:
  added:
    - MongoDB array filters with dot notation (UpdateFilter[])
    - randomUUID() for resource ID generation
  patterns:
    - Nested resource CRUD (entregaveis under etapas, aditivos under rubricas)
    - Helper function for project validation (findProjectOrFail)
    - Dynamic $set construction for partial updates
key_files:
  created:
    - server/routes/modulosEtapasOrcamento.ts
  modified:
    - server/index.ts
decisions: []
---

# Phase 06 Plan 01: API Backend — Summary

REST API endpoints for project stages (etapas), budget (rubricas), and module configuration with MongoDB nested array operations.

## Execution Overview

**Tasks completed:** 2/2 ✓
**Commits:** 2
**Duration:** 8 minutes 6 seconds

## Endpoints Implemented

### Stages Module (Etapas) — 6 endpoints

| Task | Req | Method | Path | Description |
|------|-----|--------|------|-------------|
| ETAP-01 | ✓ | POST | `/:id/etapas` | Create new stage with name, optional percentual, and initial deliverables |
| ETAP-02 | ✓ | PUT | `/:id/etapas/:etapaId` | Update stage name and/or percentual (0-100) |
| ETAP-03 | ✓ | DELETE | `/:id/etapas/:etapaId` | Remove stage and all its deliverables |
| ETAP-04 | ✓ | PATCH | `/:id/etapas/:etapaId/entregaveis/:entId` | Toggle deliverable concluido flag |
| ETAP-05a | ✓ | POST | `/:id/etapas/:etapaId/entregaveis` | Add deliverable to existing stage |
| ETAP-05b | ✓ | DELETE | `/:id/etapas/:etapaId/entregaveis/:entId` | Remove deliverable from stage |

### Budget Module (Rubricas) — 4 endpoints

| Task | Req | Method | Path | Description |
|------|-----|--------|------|-------------|
| ORÇA-01 | ✓ | POST | `/:id/rubricas` | Create budget line (rubrica) with name, optional previsto/executado |
| ORÇA-02 | ✓ | PUT | `/:id/rubricas/:rubricaId` | Update budget line name, previsto, and/or executado values |
| ORÇA-03 | ✓ | POST | `/:id/rubricas/:rubricaId/aditivos` | Add budget adjustment (aditivo) with description, value, and optional date |
| ORÇA-04 | ✓ | DELETE | `/:id/rubricas/:rubricaId` | Remove budget line and all aditivos |

### Module Configuration — 1 endpoint

| Task | Req | Method | Path | Description |
|------|-----|--------|------|-------------|
| MODU-01 | ✓ | PATCH | `/:id/modulos` | Toggle module activation flags: etapas, orcamento, parceiros, riscos, governanca, indicadores |

## Response Format

All endpoints (except 404/400 errors):
- **Success:** Returns full updated `DBProjeto` document (JSON)
- **Auth:** 401 Unauthorized without Bearer token
- **Validation:** 400 Bad Request for missing/invalid fields
- **Not Found:** 404 for missing project/resource
- **Server Error:** 500 with error message

## Implementation Details

### Helper Function

```typescript
async function findProjectOrFail(id: string, res: Response) {
  // Validates ObjectId, retrieves document, returns {col, projeto, oid}
  // Returns early with 400/404 on validation failures
}
```

### Key Patterns

1. **ID Generation:** All resources use `randomUUID()` from Node.js crypto module
2. **Array Operations:** MongoDB array filters with dot notation:
   ```typescript
   arrayFilters: [{ 'etapa.id': etapaId }]
   $set: { 'etapas.$[etapa].entregaveis.$[ent].concluido': value }
   ```

3. **Dynamic Updates:** Endpoints build `$set` object only with provided fields:
   ```typescript
   const setObj: Record<string, unknown> = {};
   if (nome !== undefined) setObj['...'] = nome;
   if (percentual !== undefined) setObj['...'] = percentual;
   ```

4. **Return Fresh Document:** After each write, use `findOneAndUpdate` with `returnDocument: 'after'` to ensure response reflects persisted state

5. **Nested Resources:** Sub-resources (entregaveis, aditivos) use `$push` and `$pull` with array filters to target parent

### Authentication & Authorization

- All 11 endpoints require `requireAuth` middleware
- Returns 401 if no Bearer token provided
- No role-based restrictions (all authenticated users can access)

## Database Interaction

- **Collection:** `projetos_supcdt`
- **Operations:** findOneAndUpdate with $push, $pull, $set operators
- **Arrays:** etapas[], rubricas[] with nested entregaveis[], aditivos[]
- **Backward Compatibility:** modulosAtivos field is optional; projects without it are unaffected

## Verification Results

```bash
$ npx tsc --noEmit
# Exit code 0 — No TypeScript errors in new code
# (Pre-existing warnings in other components unrelated to this plan)
```

## Deviations from Plan

None — plan executed exactly as written.

## Key Architectural Decisions

1. **Stateless Helper:** `findProjectOrFail` centralizes validation and early returns, reducing duplication
2. **Dynamic $set:** Only fields present in request body are updated, allowing partial updates without re-sending unchanged data
3. **randomUUID:** Uses Node.js native crypto for UUIDs instead of uuid package (no additional dependency)
4. **Nested Routes:** Sub-resources (entregaveis, aditivos) mounted under parent resources in path, with array filters handling multi-level nesting

## Files Modified

- **Created:** `server/routes/modulosEtapasOrcamento.ts` (507 lines, all new code)
- **Modified:** `server/index.ts` (+3 lines: import + mount)

## Commits

1. **fceaa98** — Create router with 11 endpoints for stages, budget, module config
2. **7b3be6c** — Mount router in Express app on /api/projetos prefix

## Next Steps (Phase 06-02)

The remaining modules (Parceiros, Riscos, Governança, Indicadores) will follow the same pattern in a subsequent plan.
