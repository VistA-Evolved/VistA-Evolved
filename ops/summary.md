# Phase 150 -- Ops Summary

## What changed

1. **OIDC mandatory in rc/prod**: `runtime-mode.ts` exports `requiresOidc()`. `validateRuntimeMode()` throws at startup if rc/prod without OIDC_ENABLED=true + OIDC_ISSUER.
2. **Portal session PG write-through**: New `pg-portal-session-repo.ts` with SHA-256 token hashing. Map remains hot cache; create/touch/revoke write-through to PG.
3. **Patient identity mapping**: New `portal_patient_identity` table (OIDC sub to patient DFN). Added to RLS tenant tables.
4. **PHI cleanup**: Removed DFN from `log.info` in portal-auth.ts. DFN only in audit trail.
5. **Audit classifier**: INTERNATIONALIZATION status "planned" to "partial" (next-intl 4.8 integrated Phase 132).
6. **Gauntlet G12**: Added Gate 7 (OIDC enforcement) and Gate 8 (token hashing repo).
7. **Data plane posture**: Gate 7 `oidc_enforcement` added.

## How to test manually

```bash
pnpm -C apps/api exec tsc --noEmit
node qa/gauntlet/cli.mjs fast
node qa/gauntlet/cli.mjs --suite rc
```

## Verifier output

- FAST: 4P / 0F / 0S / 1W
- RC: 17P / 0F / 1S / 2W
- RC strict: 16P / 0F / 1S / 3W

## Follow-ups

- Wire OIDC bearer token validation for portal auth in rc/prod login path
- Populate portal_patient_identity on OIDC login
- Add portal session cleanup cron (cleanExpiredPortalSessions)
