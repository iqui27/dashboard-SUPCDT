---
phase: 11-polish-ux-formularios-pdf
plan: "02"
subsystem: lancamentos-crud + metas-edit
tags: [frontend, modal, lancamentos, metas, edição, data-picker, delete]

# Dependency graph
requires:
  - phase: 11-01
    provides: PUT/DELETE /api/lancamentos/:id, updateLancamento/deleteLancamento in src/lib/api/lancamentos.ts
provides:
  - LancamentoModal com modo criação e edição
  - Campo dataAtividade no modal de lançamento
  - Botão excluir com confirmação no LancamentoModal
  - Botões de editar em cada lançamento na lista do DetalheProjeto
  - MetaModal envia apenas { metas } (não sobrescreve módulos)
  - Barra de progresso emerald quando meta é superada
affects: [DetalheProjeto, LancamentoModal, MetaModal, metas-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-mode modal (isEditing), partial update pattern (send only changed fields)]

key-files:
  created: []
  modified:
    - src/components/supcdt/LancamentoModal.tsx
    - src/components/supcdt/MetaModal.tsx
    - src/components/supcdt/DetalheProjeto.tsx

key-decisions:
  - "LancamentoModal aceita prop `lancamento?` para modo edição — mesma interface, header e submit adaptados por isEditing flag"
  - "MetaModal envia apenas { metas: novasMetas } no updateProjeto — isolado de dados de módulos que podem estar stale no estado local"
  - "previsto array no MetaModal padded para totalTrimestres com zeros — garante tamanho correto mesmo quando backend retorna array mais curto"

patterns-established:
  - "Partial update pattern: enviar apenas { metas } no updateProjeto para evitar sobrescrever módulos com dados stale"
  - "Dual-mode modal: mesmo componente para criação e edição, discriminado por prop opcional + isEditing flag"

requirements-completed: [EDIT-02, EDIT-04, META-01]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 11 Plan 02: Edição Lançamentos + Correção MetaModal Summary

**LancamentoModal com modo edição, date picker e delete; MetaModal corrigido para preservar previsto por trimestre e não sobrescrever módulos.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T13:17:20Z
- **Completed:** 2026-03-26T13:21:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- LancamentoModal suporta modo criação e edição com a mesma interface, inicializando campos a partir do lançamento existente
- Campo `dataAtividade` (type=date) presente em ambos os modos, com default = hoje em criação e valor existente em edição
- Botão "Excluir" vermelho com `window.confirm` no modo edição; chama `deleteLancamento` e dispara `onSuccess()`
- Cada lançamento na lista do DetalheProjeto tem botão Pencil que abre LancamentoModal em modo edição
- `dataAtividade` exibida em azul ao lado da data de registro quando presente
- MetaModal: array `previsto` padded para `totalTrimestres` com zeros — resolve valores undefined em edição
- MetaModal: envia apenas `{ metas: novasMetas }` no `updateProjeto` — não sobrescreve módulos com dados stale
- MetaModal: validação `totalPrevisto > 0` com toast de aviso
- DetalheProjeto: barra de progresso muda para `bg-emerald-500` + texto "Meta atingida (X%)" quando `realizadoTotal > totalPrevisto`

## Task Commits

1. **Task 1: LancamentoModal modo edição + date picker + delete** - `a321a1b` (feat)
2. **Task 2: Corrigir edição de previsto MetaModal + indicador meta superada** - `97f46f0` (feat)

## Files Created/Modified
- `src/components/supcdt/LancamentoModal.tsx` - Refatorado para suportar criação E edição; campo dataAtividade; botão excluir com confirmação
- `src/components/supcdt/MetaModal.tsx` - Previsto padded para totalTrimestres; submit envia apenas { metas }; validação totalPrevisto > 0
- `src/components/supcdt/DetalheProjeto.tsx` - editingLancamento state; botão Pencil em cada lançamento; dataAtividade na lista; indicador meta superada

## Decisions Made
- LancamentoModal aceita prop `lancamento?` para modo edição — mesma interface, header e submit adaptados por `isEditing` flag
- MetaModal envia apenas `{ metas: novasMetas }` no `updateProjeto` — isolado de dados de módulos que podem estar stale no estado local. Isso corrige o bug de sobrescrita.
- previsto array no MetaModal padded para `totalTrimestres` com zeros — garante tamanho correto mesmo quando backend retorna array mais curto

## Deviations from Plan

None — plano executado exatamente como especificado.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- EDIT-02, EDIT-04, META-01 completos
- Ready for Plan 11-03: Semáforos de saúde, badge "Meta Superada" e outras melhorias de polish UX

## Self-Check: PASSED

- ✅ `src/components/supcdt/LancamentoModal.tsx` — FOUND
- ✅ `src/components/supcdt/MetaModal.tsx` — FOUND
- ✅ `src/components/supcdt/DetalheProjeto.tsx` — FOUND
- ✅ `.planning/phases/11-polish-ux-formularios-pdf/11-02-SUMMARY.md` — FOUND
- ✅ commit `a321a1b` — FOUND
- ✅ commit `97f46f0` — FOUND

---
*Phase: 11-polish-ux-formularios-pdf*
*Completed: 2026-03-26*
