# Phase 243 — Verify: Onboarding UX Wizard

## Gates
1. `onboarding-store.ts` exists with `createOnboarding`, `getOnboarding`, `advanceStep` exports
2. `onboarding-routes.ts` exists with POST/GET/PATCH endpoints
3. Routes registered in `register-routes.ts`
4. Admin wizard page exists at `apps/web/src/app/cprs/admin/onboarding/page.tsx`
5. TypeScript compiles (`pnpm --filter api build`)
6. No `console.log` in new files
7. Steps cover: tenant, vista-probe, modules, users, complete
