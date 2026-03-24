---
phase: 09-ui-parceiros-riscos-gov-indicadores
plan: 01
subsystem: frontend
tags: [api-modules, parceiros, riscos, governanca, indicadores, ui-sections]
requires: [08-01, 08-02]
provides:
  - API modules for parceiros, riscos, governanca, indicadores CRUD
  - ParceirosSection component with inline status editing
  - RiscosSection component with severity colors and open/closed separation
affects:
  - DetalheProjeto.tsx (will integrate sections in plan 09-02)
tech-stack:
  added:
    - src/lib/api/parceiros.ts
    - src/lib/api/riscos.ts
    - src/lib/api/governanca.ts
    - src/lib/api/indicadores.ts
    - src/components/supcdt/ParceirosSection.tsx
    - src/components/supcdt/RiscosSection.tsx
  patterns:
    - Typed fetch wrappers following etapas.ts pattern
    - Conditional visibility via modulosAtivos flags
    - Severity color calculation from risk matrix
key-files:
  created:
    - src/lib/api/parceiros.ts
    - src/lib/api/riscos.ts
    - src/lib/api/governanca.ts
    - src/lib/api/indicadores.ts
    - src/components/supcdt/ParceirosSection.tsx
    - src/components/supcdt/RiscosSection.tsx
  modified: []
decisions:
  - Status badge colors follow semantic meaning (Ativo=green, Apoiador=blue, Consultor=amber, Inativo=slate)
  - Risk severity uses 4-level color system based on probabilidade × impacto matrix
  - Encerrados risks shown separately with reduced opacity
  - API modules follow exact pattern from etapas.ts for consistency
metrics:
  duration: 5 minutes
  completed: 2026-03-24
  tasks: 3/3
  files: 6
---

# Phase 9 Plan 01: UI Parceiros, Riscos, Governança, Indicadores - API + First Sections

## One-liner

Created 4 frontend API modules for CRUD operations on parceiros, riscos, governanca, and indicadores, plus ParceirosSection and RiscosSection components with inline editing and severity visualization.

## What Was Built

### Task 1: Frontend API Modules

Created 4 typed API modules following the `etapas.ts` pattern:

**src/lib/api/parceiros.ts**
- `createParceiro(projetoId, data, token)` — POST /api/projetos/:id/parceiros
- `updateParceiro(projetoId, parceiroId, data, token)` — PUT /api/projetos/:id/parceiros/:parceiroId
- `deleteParceiro(projetoId, parceiroId, token)` — DELETE /api/projetos/:id/parceiros/:parceiroId

**src/lib/api/riscos.ts**
- `createRisco(projetoId, data, token)` — POST /api/projetos/:id/riscos
- `updateRisco(projetoId, riscoId, data, token)` — PUT /api/projetos/:id/riscos/:riscoId
- `deleteRisco(projetoId, riscoId, token)` — DELETE /api/projetos/:id/riscos/:riscoId

**src/lib/api/governanca.ts**
- `createDecisao(projetoId, data, token)` — POST /api/projetos/:id/decisoes
- `updateDecisao(projetoId, decisaoId, data, token)` — PUT /api/projetos/:id/decisoes/:decisaoId
- `deleteDecisao(projetoId, decisaoId, token)` — DELETE /api/projetos/:id/decisoes/:decisaoId

**src/lib/api/indicadores.ts**
- `createIndicador(projetoId, data, token)` — POST /api/projetos/:id/indicadores
- `updateIndicador(projetoId, indicadorId, data, token)` — PUT /api/projetos/:id/indicadores/:indicadorId
- `deleteIndicador(projetoId, indicadorId, token)` — DELETE /api/projetos/:id/indicadores/:indicadorId

### Task 2: ParceirosSection Component

Features:
- Conditional visibility: returns `null` when `modulosAtivos.parceiros` is not `true`
- Card layout matching EtapasSection pattern
- Label "Rede" (emerald-700/70) + title "Parceiros"
- divide-y list showing nome, papel, and status badge
- Status badge colors:
  - Ativo → green (emerald)
  - Apoiador → blue (sky)
  - Consultor → amber
  - Inativo → slate/gray
- Inline status editing: clicking badge opens dropdown selector
- Create form with nome (required), papel (optional), status (select)
- Delete button per parceiro

### Task 3: RiscosSection Component

Features:
- Conditional visibility: returns `null` when `modulosAtivos.riscos` is not `true`
- Label "Gestão" (rose-700/70) + title "Riscos"
- Severity color calculation from probabilidade × impacto matrix:
  - **Critical (red-500)**: Alta × Alto, Alta × Médio
  - **High (amber-500)**: Média × Alto, Alta × Baixo
  - **Moderate (yellow-500)**: Média × Médio, Baixa × Alto
  - **Low (green-500)**: Baixa × Médio, Baixa × Baixo, Média × Baixo
- Risk item shows: colored dot + descricao, probabilidade/impacto badges, mitigacao, status badge
- Open/closed separation: open risks first, "Encerrados" divider, closed risks with `opacity-50`
- Status badge colors:
  - Aberto → rose
  - Mitigado → amber
  - Encerrado → slate
- Inline status editing
- Create form with descricao (required), probabilidade (select), impacto (select), mitigacao (optional textarea)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes (no new errors in frontend)
- [x] All 4 API modules exist and export typed functions
- [x] ParceirosSection checks `modulosAtivos.parceiros` for visibility
- [x] RiscosSection checks `modulosAtivos.riscos` for visibility
- [x] RiscosSection separates open and closed risks visually
- [x] Status badges are clickable for inline editing

## Commits

| Commit | Description |
|--------|-------------|
| `3cf0765` | feat(09-01): create frontend API modules for parceiros, riscos, governanca, indicadores |
| `c84e689` | feat(09-01): create ParceirosSection component |
| `26acb8d` | feat(09-01): create RiscosSection component |

## Next Steps

Plan 09-02 will:
1. Create GovernancaSection and IndicadoresSection components
2. Integrate all 4 sections into DetalheProjeto.tsx
3. Test the complete UI flow

## Self-Check: PASSED

All files created and commits verified.