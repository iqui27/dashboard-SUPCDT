---
phase: 09-ui-parceiros-riscos-gov-indicadores
plan: 02
subsystem: frontend
tags: [governanca, indicadores, integration, ui-sections]
requires: [09-01]
provides:
  - GovernancaSection component with modal for new decisions
  - IndicadoresSection component with horizontal bar charts
  - Full integration of all 4 module sections in DetalheProjeto
affects:
  - DetalheProjeto.tsx (now renders all 6 module sections)
tech-stack:
  added:
    - src/components/supcdt/GovernancaSection.tsx
    - src/components/supcdt/IndicadoresSection.tsx
  patterns:
    - Modal pattern from MetaModal for GovernancaSection
    - Horizontal bar charts for data visualization
key-files:
  created:
    - src/components/supcdt/GovernancaSection.tsx
    - src/components/supcdt/IndicadoresSection.tsx
  modified:
    - src/components/supcdt/DetalheProjeto.tsx
decisions:
  - GovernancaSection uses modal (not inline form) for better UX with longer decision descriptions
  - IndicadoresSection uses horizontal bar charts proportional to max value in series
  - Section order: Etapas → Orçamento → Parceiros → Riscos → Governança → Indicadores
metrics:
  duration: 5 minutes
  completed: 2026-03-24
  tasks: 3/3
  files: 3
---

# Phase 9 Plan 02: GovernancaSection, IndicadoresSection, Integration

## One-liner

Created GovernancaSection with modal for decisions, IndicadoresSection with horizontal bar charts, and wired all 4 new module sections into DetalheProjeto for complete Phase 9 UI surface.

## What Was Built

### Task 1: GovernancaSection Component

Features:
- Conditional visibility: returns `null` when `modulosAtivos.governanca` is not `true`
- Label "Estratégia" (violet-700/70) + title "Decisões de Governança"
- Chronological list sorted by date descending (most recent first)
- Decision item shows:
  - Date formatted as DD/MM/YYYY
  - Responsável badge (if present)
  - Título (text-sm font-semibold)
  - Descrição (truncated to 2 lines with `line-clamp-2`)
  - Delete button
- Modal form for new decisions (following MetaModal pattern):
  - título (required)
  - data (date input, defaults to today)
  - responsavel (optional)
  - descricao (optional textarea)

### Task 2: IndicadoresSection Component

Features:
- Conditional visibility: returns `null` when `modulosAtivos.indicadores` is not `true`
- Label "Pesquisa" (teal-700/70) + title "Indicadores de Pesquisa"
- Each indicator shows:
  - Nome (text-sm font-semibold)
  - Categoria badge (if present)
  - Horizontal bar chart for SerieDados:
    - Label on the left
    - Bar width proportional to `valor / maxValor` in the series
    - Value on the right
    - Bar color: teal-500
  - Delete button
- Inline form (collapsible):
  - nome (required)
  - categoria (optional)
  - Dynamic series rows with label + valor inputs
  - Add/remove series buttons

### Task 3: Integration into DetalheProjeto

Added imports:
```ts
import { ParceirosSection } from './ParceirosSection';
import { RiscosSection } from './RiscosSection';
import { GovernancaSection } from './GovernancaSection';
import { IndicadoresSection } from './IndicadoresSection';
```

Section render order in left column:
1. EtapasSection (Phase 8)
2. OrcamentoSection (Phase 8)
3. ParceirosSection (Phase 9)
4. RiscosSection (Phase 9)
5. GovernancaSection (Phase 9)
6. IndicadoresSection (Phase 9)
7. Lançamentos (existing)

Each section receives `projeto={projeto} onUpdate={onUpdate}`.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes
- [x] GovernancaSection checks `modulosAtivos.governanca` for visibility
- [x] IndicadoresSection checks `modulosAtivos.indicadores` for visibility
- [x] DetalheProjeto imports all 4 new sections (12 "Section" occurrences)
- [x] All sections receive projeto and onUpdate props

## Commits

| Commit | Description |
|--------|-------------|
| `d22f0a8` | feat(09-02): create GovernancaSection and IndicadoresSection components |
| `e7409f8` | feat(09-02): wire all 4 module sections into DetalheProjeto |

## Self-Check: PASSED

All files created, commits verified, sections wired correctly.

## Phase 9 Complete

Phase 9 is now complete with all 4 monitoring modules implemented:
- ParceirosSection: Partner management with inline status editing
- RiscosSection: Risk tracking with severity colors and open/closed separation
- GovernancaSection: Decision history with modal form
- IndicadoresSection: Research indicators with horizontal bar charts