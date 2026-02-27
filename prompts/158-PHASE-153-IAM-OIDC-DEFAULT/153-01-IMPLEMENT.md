# Phase 153 — IMPLEMENT: Enterprise IAM Default (OIDC Mandatory in rc/prod)

## Goal

Close the audit gap "OIDC is opt-in". In rc/prod modes, OIDC must be the
default and required authentication mechanism. Dev/test local auth remains
for sandbox convenience.

## Non-Negotiables

- Postgres-only runtime continues
- No secrets in git
- No PHI in auth logs
- Module packaging / tenant entitlements behavior unchanged

## Implementation Steps

### 1. Runtime Posture Enforcement

- `runtime-mode.ts`: `requiresOidc()` already returns true for rc/prod (Phase 150). Confirmed.
- `validateRuntimeMode()`: Already throws without `OIDC_ENABLED=true` + `OIDC_ISSUER`.
- `auth-mode-policy.ts`: `enforceAuthMode()` already throws in rc/prod without `AUTH_MODE=oidc`.

### 2. OIDC Provider Tightening

- `oidc-provider.ts`:
  - In rc/prod, require `OIDC_CLIENT_ID` (no silent default).
  - Add `OIDC_AUDIENCE` validation when OIDC is enabled.
  - Add `validateOidcConfig()` export for posture checks.
  - Cookie `secure` flag alignment: ensure it works with `PLATFORM_RUNTIME_MODE` not just `NODE_ENV`.

### 3. Posture Gate: OIDC Configuration Depth

- `data-plane-posture.ts`: Extend Gate 7 to check `OIDC_CLIENT_ID` presence.
- Add Gate 8 for AUTH_MODE alignment (oidc in rc/prod).
- Add Gate 9 for cookie `secure` flag alignment.

### 4. Tenant OIDC Mapping Table

- PG migration v20: `tenant_oidc_mapping` table.
- Add to RLS tenant tables array.
- Add to posture check.

### 5. QA Gate: `oidc-required-gate.mjs`

- Static analysis gate: checks auth-mode-policy, oidc-provider, runtime-mode.
- Wire into gauntlet RC as a G12 sub-check.

### 6. .env.example: OIDC vars

- Add OIDC section to `.env.example`.

## Files Changed

| File | Change |
|------|--------|
| `apps/api/src/auth/oidc-provider.ts` | `validateOidcConfig()`, rc/prod tightening |
| `apps/api/src/posture/data-plane-posture.ts` | Gates 8-9: AUTH_MODE + cookie secure |
| `apps/api/src/platform/pg/pg-migrate.ts` | v20: tenant_oidc_mapping table |
| `apps/api/.env.example` | OIDC section |
| `qa/gauntlet/gates/g12-data-plane.mjs` | OIDC config depth checks |

## Verification

- `pnpm exec tsc --noEmit` — 0 errors
- Gauntlet fast + rc — no regressions
