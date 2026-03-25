---
phase: 06-api-backend
plan: "02"
subsystem: API Backend - Advanced Monitoring Modules
completed_date: 2026-03-24T20:35:53Z
duration_seconds: 160
tasks_completed: 2
files_created: 1
files_modified: 1
key_decisions:
  - Use parceirosModulo field to avoid conflict with legacy parceiro?: string | null field
  - Implement enum validation for StatusParceiro (Ativo/Apoiador/Consultor/Inativo), ProbabilidadeRisco (Baixa/Média/Alta), ImpactoRisco (Baixo/Médio/Alto), StatusRisco (Aberto/Mitigado/Encerrado)
  - All endpoints return full updated project document after write operations
  - All endpoints require Bearer token authentication via requireAuth middleware
dependency_graph:
  provides:
    - REST endpoints for Partners CRUD (3 endpoints)
    - REST endpoints for Risks CRUD with status tracking (3 endpoints)
    - REST endpoints for Governance Decisions CRUD (3 endpoints)
    - REST endpoints for Research Indicators CRUD (3 endpoints)
  affects:
    - Phase 8 UI implementation for module editing (depends on these endpoints)
  requires:
    - MongoDB collection: projetos_supcdt
    - Auth middleware: requireAuth
    - Types: DBParceiro, DBRisco, DBDecisaoGovernanca, DBIndicadorPesquisa
tech_stack:
  added:
    - Express Router for modular routing
    - MongoDB arrayFilters for nested document updates
    - randomUUID from node:crypto for ID generation
  patterns:
    - Consistent CRUD pattern: POST creates (returns 201), PUT updates (returns 200), DELETE removes (returns 200)
    - Validation: required field checks, enum value validation, Date parsing
    - Error handling: try-catch blocks with 500 responses
    - Helper function: findProjectOrFail for common validation logic
---

# Phase 6 Plan 2: Partners, Risks, Governance Decisions, and Research Indicators API Summary

REST API implementation for 4 advanced monitoring modules with full CRUD operations, enum validation, and status tracking.

## Overview

Successfully implemented 12 REST endpoints across 4 modules, enabling complete management of Partners, Risks, Governance Decisions, and Research Indicators as sub-documents within the projetos_supcdt collection. All endpoints require authentication and follow consistent patterns from Plan 01.

## Endpoints Implemented

### Partners Module (3 endpoints)
- **POST /api/projetos/:id/parceiros** (PARC-01)
  - Creates partner with nome, papel, status (default: Ativo)
  - Validates status enum: Ativo | Apoiador | Consultor | Inativo
  - Returns updated project document (201 Created)

- **PUT /api/projetos/:id/parceiros/:parceiroId** (PARC-02)
  - Updates partner name, role, or status
  - Uses MongoDB arrayFilters with dot notation
  - Validates status enum if present

- **DELETE /api/projetos/:id/parceiros/:parceiroId** (PARC-03)
  - Removes partner from parceirosModulo array
  - Uses $pull operator for clean removal

### Risks Module (3 endpoints)
- **POST /api/projetos/:id/riscos** (RISC-01)
  - Creates risk with descricao, probabilidade, impacto, optional mitigacao and status
  - Validates probabilidade: Baixa | Média | Alta
  - Validates impacto: Baixo | Médio | Alto
  - Default status: Aberto

- **PUT /api/projetos/:id/riscos/:riscoId** (RISC-02, RISC-03)
  - Updates risk fields with full enum validation
  - Supports status transitions: Aberto → Mitigado → Encerrado
  - Allows reopening risks (Encerrado → Aberto)

- **DELETE /api/projetos/:id/riscos/:riscoId**
  - Removes risk from riscos array

### Governance Decisions Module (3 endpoints)
- **POST /api/projetos/:id/decisoes** (GOVN-01)
  - Creates governance decision with titulo (required), data (required ISO string), optional descricao and responsavel
  - Validates data field as valid ISO date
  - Converts date string to Date object before storage

- **PUT /api/projetos/:id/decisoes/:decisaoId** (GOVN-02)
  - Updates decision fields including data with date validation
  - Handles null values for descricao and responsavel

- **DELETE /api/projetos/:id/decisoes/:decisaoId** (GOVN-02)
  - Removes decision from decisoes array

### Research Indicators Module (3 endpoints)
- **POST /api/projetos/:id/indicadores** (INDC-01)
  - Creates indicator with nome, categoria (both required), optional serie array
  - Series format: { label: string, valor: number }[]
  - Default empty array if serie not provided

- **PUT /api/projetos/:id/indicadores/:indicadorId** (INDC-02)
  - Updates indicator name, category, or entire data series
  - Replaces serie array completely with new values

- **DELETE /api/projetos/:id/indicadores/:indicadorId** (INDC-03)
  - Removes indicator from indicadores array

## Key Design Decisions

### Field Naming: parceirosModulo vs parceiros
Used `parceirosModulo` instead of `parceiros` to avoid conflict with legacy `parceiro?: string | null` field in DBProjeto. This maintains backward compatibility while adding new module data.

### Enum Validation
Implemented strict validation for all enum types:
- **DBStatusParceiro**: Ativo | Apoiador | Consultor | Inativo
- **DBProbabilidadeRisco**: Baixa | Média | Alta
- **DBImpactoRisco**: Baixo | Médio | Alto
- **DBStatusRisco**: Aberto | Mitigado | Encerrado

Invalid values return 400 Bad Request with list of valid options.

### Return Pattern
All endpoints return the complete updated project document after write operations. This allows clients to get fresh state without separate GET request, matching Plan 01 pattern.

### Authentication
All 12 endpoints use `requireAuth` middleware. Requests without Bearer token receive 401 Unauthorized response.

### Error Handling
- 400 Bad Request: Missing required fields, invalid enum values, invalid ObjectId
- 401 Unauthorized: Missing or invalid authentication token
- 404 Not Found: Project ID not found
- 500 Internal Server Error: Database errors (logged with console.error)

## Technical Implementation

### Helper Function
```typescript
async function findProjectOrFail(id: string, res: Response) {
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'ID de projeto inválido' });
    return null;
  }
  const db = await getDatabase();
  const col = db.collection<DBProjeto>(COLLECTION);
  const projeto = await col.findOne({ _id: new ObjectId(id) });
  if (!projeto) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return null;
  }
  return { col, projeto, oid: new ObjectId(id) };
}
```

Eliminates repetitive validation code and ensures consistent error responses.

### Dynamic Field Updates
Uses MongoDB $set with arrayFilters to selectively update nested array elements:

```typescript
const updates: Record<string, unknown> = {};
if (nome) updates['parceirosModulo.$[elem].nome'] = nome.trim();
if (papel) updates['parceirosModulo.$[elem].papel'] = papel.trim();
if (status) updates['parceirosModulo.$[elem].status'] = status;

await col.updateOne(
  { _id: oid },
  { $set: updates },
  { arrayFilters: [{ 'elem.id': parceiroId }] }
);
```

This allows partial updates without affecting other fields.

### Date Handling
For decisions, dates are validated and converted:
```typescript
const dateObj = new Date(data);
if (isNaN(dateObj.getTime())) {
  return res.status(400).json({ error: 'Data inválida' });
}
```

## Files Modified

| File | Type | Changes |
|------|------|---------|
| server/routes/modulosParceirosRiscosGovInd.ts | Created | 600 lines: 12 endpoints with full validation |
| server/index.ts | Modified | Added import and mount for modulosParceirosRiscosGovIndRouter |

## Verification Results

- **TypeScript Compilation**: ✓ No errors in new code
- **Endpoint Count**: ✓ 12 endpoints (4 POST, 4 PUT, 4 DELETE)
- **Auth Middleware**: ✓ All endpoints use requireAuth (13 occurrences: 12 endpoints + 1 import)
- **Enum Validation**: ✓ Implemented for all module types
- **parceirosModulo Field**: ✓ Used consistently, no legacy conflicts
- **Router Export**: ✓ modulosParceirosRiscosGovIndRouter exported
- **Router Mounting**: ✓ Mounted at /api/projetos in Express app

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

1. ✓ `npx tsc --noEmit` compiles without errors
2. ✓ Parceiros: POST cria, PUT atualiza (incluindo status), DELETE remove
3. ✓ Riscos: POST cria com validação de enum, PUT altera status (fechar/reabrir), DELETE remove
4. ✓ Governança: POST cria decisão com data, PUT edita, DELETE remove
5. ✓ Indicadores: POST cria com serie de dados, PUT substitui serie, DELETE remove
6. ✓ Todos endpoints retornam 401 sem token
7. ✓ Validação de enum para StatusParceiro, ProbabilidadeRisco, ImpactoRisco, StatusRisco

## Next Steps

This plan completes the remaining 4 modules from the Advanced Monitoring modules wave. Plan 01 (Etapas and Orçamento) was completed previously. Phase 8 will implement the UI components for editing these modules using these endpoints.

## Commits

- **09fc4da**: feat(06-api-backend): implement CRUD endpoints for Partners, Risks, Governance Decisions, and Research Indicators
