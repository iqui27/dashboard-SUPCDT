---
phase: 07-wizard-passo-5
plan: 01
subsystem: frontend
tags: [wizard, modules, switch, ui, forms]
requires:
  - 06-01-PLAN.md (API backend for modulosAtivos)
  - 05-01-PLAN.md (ModulosAtivos type definition)
provides:
  - Step 5 "Módulos" in project creation wizard
  - Switch component for toggle UI
affects:
  - CriacaoProjetoWizard.tsx
  - switch.tsx
tech-stack:
  added:
    - "@radix-ui/react-switch"
  patterns:
    - shadcn/ui Switch component
    - Radix UI primitives
key-files:
  created:
    - src/components/ui/switch.tsx
  modified:
    - src/components/supcdt/CriacaoProjetoWizard.tsx
    - package.json
    - package-lock.json
decisions:
  - Switch component uses slate-950 for checked state to match project design
  - MODULOS_CONFIG constant defines module metadata in Portuguese
  - modulosAtivos defaults to empty object {} (all modules off by default)
metrics:
  duration: 2.8 minutes
  completed: 2026-03-24
  tasks: 2
  files: 4
---

# Phase 7 Plan 1: Wizard — Passo 5 Summary

## One-liner

Added Step 5 "Módulos" to the project creation wizard with 6 module toggle switches, enabling users to activate monitoring modules during project creation.

## Changes Made

### Task 1: Switch Component
- Installed `@radix-ui/react-switch` dependency
- Created `src/components/ui/switch.tsx` following shadcn/ui pattern
- Styled with `rounded-full` track and thumb
- Uses `slate-950` for checked state to match project design system

### Task 2: Step 5 "Módulos"
- Added 5th step to wizard navigation array: `{ id: 'modulos', label: '5. Módulos' }`
- Created `MODULOS_CONFIG` constant with 6 module definitions (etapas, orcamento, parceiros, riscos, governanca, indicadores)
- Added `modulosAtivos: {}` to form state initialization
- Implemented module toggle UI with Switch components
- Each toggle shows module name and one-line description
- "Salvar projeto" button now appears on step 5 (final step)

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/switch.tsx` | Created - shadcn/ui Switch component |
| `src/components/supcdt/CriacaoProjetoWizard.tsx` | Added Step 5 with module toggles |
| `package.json` | Added @radix-ui/react-switch dependency |
| `package-lock.json` | Lockfile update |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✅ TypeScript compiles without new errors
2. ✅ `grep -c "5. Módulos" CriacaoProjetoWizard.tsx` returns 1
3. ✅ `grep -c "modulosAtivos" CriacaoProjetoWizard.tsx` returns 4 (≥3)
4. ✅ `grep -c "Switch" CriacaoProjetoWizard.tsx` returns 2 (≥2)
5. ✅ `test -f src/components/ui/switch.tsx` succeeds

## Success Criteria Met

- [x] Wizard displays 5 navigation tabs; step "5. Módulos" is reachable after step 4
- [x] Each of the 6 modules appears as a toggle with name and one-line description
- [x] formData.modulosAtivos is updated on toggle and included in POST /api/projetos request body
- [x] TypeScript compilation passes

## Commits

1. `52757aa` - feat(07-01): add shadcn/ui Switch component
2. `518f3ac` - feat(07-01): add Step 5 'Módulos' to CriacaoProjetoWizard

## Next Steps

- Phase 8: UI Etapas + Orçamento - Implement interactive Etapas and Orçamento sections in DetalheProjeto