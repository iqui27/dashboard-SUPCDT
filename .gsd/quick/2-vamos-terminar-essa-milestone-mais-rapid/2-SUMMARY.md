# Quick Task: vamos terminar essa milestone mais rapido em verificacao

**Date:** 2026-04-08
**Branch:** claude/recursing-gagarin

## What Changed
- Rebaseei os tokens globais em `src/index.css` para light/dark reais, removendo o bloco que repetia os mesmos valores no dark.
- Alinhei a fundação visual compartilhada em `App`, `Header`, `Login`, `FullScreenStatus`, `ModuleLoadingState`, `Popover`, `Switch` e `Toaster` ao tema ativo sem hardcodes light-only.
- Ampliei `tests/e2e/theme-foundation.spec.ts` para provar, em `/login`, que as superfícies públicas realmente mudam entre light e dark mantendo o contrato do root criado na T01.
- Normalizei classes com opacidades inválidas do Tailwind que estavam impedindo algumas superfícies de receber cor computada.

## Files Modified
- `src/index.css`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/components/Login.tsx`
- `src/components/FullScreenStatus.tsx`
- `src/components/ModuleLoadingState.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/switch.tsx`
- `tests/e2e/theme-foundation.spec.ts`

## Verification
- `npm run typecheck && npm run lint` ✅
- `E2E_BASE_URL=http://127.0.0.1:4173 npx playwright test --config=playwright.config.ts tests/e2e/theme-foundation.spec.ts` ✅
- Verificação visual local em `/login` confirmando aparência dark real após recarga com `localStorage['dashboard-supcdt:theme:v1']='dark'`.
