---
phase: 10-painel-de-configuracao
plan: 01
subsystem: frontend
tags: [modulos, configuracao, ui, popover]
dependency_graph:
  requires:
    - Phase 9 (UI Parceiros, Riscos, Governança, Indicadores)
    - Phase 6 (API endpoints for modulos)
  provides:
    - ModulosConfigPanel component
    - Gear icon in DetalheProjeto header
  affects:
    - DetalheProjeto.tsx (header area)
tech_stack:
  added:
    - @radix-ui/react-popover (Radix UI Popover)
  patterns:
    - Popover with gear icon trigger
    - API function for PATCH modulos
    - MODULOS_CONFIG constant (consistent with wizard)
key_files:
  created:
    - src/components/ui/popover.tsx
    - src/lib/api/modulos.ts
    - src/components/supcdt/ModulosConfigPanel.tsx
  modified:
    - src/components/supcdt/DetalheProjeto.tsx
decisions:
  - "Usar Popover (shadcn/ui + Radix) para o painel de configuração ao invés de Modal ou Drawer - mais discreto e apropriado para toggles rápidos"
  - "Manter MODULOS_CONFIG idêntico ao wizard (Phase 7) para consistência visual"
  - "Gear icon posicionado como primeiro botão (mais à esquerda) no header do DetalheProjeto"
metrics:
  duration: 2m
  completed: 2026-03-24
  files_created: 3
  files_modified: 1
---

# Phase 10 Plan 01: Painel de Configuração Summary

## One-Liner

Gear icon no header do DetalheProjeto abre popover com 6 toggles para ativar/desativar módulos de monitoramento em projetos existentes.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add shadcn/ui Popover component | d655ea5 | src/components/ui/popover.tsx |
| 2 | Create updateModulosAtivos API function | d655ea5 | src/lib/api/modulos.ts |
| 3 | Create ModulosConfigPanel component | d655ea5 | src/components/supcdt/ModulosConfigPanel.tsx |
| 4 | Wire gear icon into DetalheProjeto | d655ea5 | src/components/supcdt/DetalheProjeto.tsx |

## Deviation Documentation

None - plan executed exactly as written.

## Auth Gates

None.

## Verification Results

- `test -f src/components/ui/popover.tsx` - PASS
- `test -f src/lib/api/modulos.ts` - PASS
- `test -f src/components/supcdt/ModulosConfigPanel.tsx` - PASS
- `grep -c "Settings" src/components/supcdt/DetalheProjeto.tsx` - PASS (2 matches)
- `grep -c "ModulosConfigPanel" src/components/supcdt/DetalheProjeto.tsx` - PASS (2 matches)
- `grep -c "Popover" src/components/supcdt/DetalheProjeto.tsx` - PASS (7 matches)
- `npm run build:web` - PASS (frontend builds successfully)

## Notes

- Server TypeScript errors in `modulosEtapasOrcamento.ts` and `modulosParceirosRiscosGovInd.ts` are pre-existing from Phase 6 and not related to this plan
- Frontend-only changes compile and build successfully
- Desativar módulo apenas oculta a seção (via `modulosAtivos?.X === true` check nos components) - dados permanecem no documento MongoDB
- Reativar restaura a seção com dados intactos automaticamente

## Self-Check

All verification criteria passed.

## Deferred Issues

None.
