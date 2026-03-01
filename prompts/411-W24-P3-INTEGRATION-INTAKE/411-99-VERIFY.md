# Phase 411 — W24-P3: Customer Integration Intake Model — VERIFY

## Gates
1. `apps/api/src/pilots/intake/types.ts` exists with IntegrationIntake type
2. `apps/api/src/pilots/intake/intake-store.ts` exists with CRUD functions
3. `apps/api/src/pilots/intake/config-generator.ts` exists with generateConfigFromIntake
4. `apps/api/src/pilots/intake/intake-routes.ts` exists with 8 endpoints
5. Routes wired in `register-routes.ts` (pilotIntakeRoutes)
6. AUTH_RULES in `security.ts` covers `/pilots/` prefix
7. `pnpm -C apps/api exec tsc --noEmit` passes clean
8. No PHI in any source file

## Verification Command
```powershell
.\scripts\verify-wave24-pilots.ps1
```
Section 6 (Integration Intake) must pass all gates.
