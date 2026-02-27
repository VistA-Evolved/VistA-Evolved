# Phase 150 -- Enterprise IAM Default + Portal Auth Modernization

## What Changed

### A) OIDC Mandatory in rc/prod
- `runtime-mode.ts` now exports `requiresOidc()` -- returns true for rc/prod.
- `validateRuntimeMode()` throws at startup if rc/prod mode and OIDC_ENABLED
  is not "true" or OIDC_ISSUER is not set.
- `data-plane-posture.ts` has a new `oidc_enforcement` gate (Gate 7).

### B) Portal Session PG Write-Through
- `portal_session` table gains columns: `token_hash`, `subject`,
  `patient_dfn`, `last_activity_at`, `revoked_at`.
- `pg-portal-session-repo.ts`: SHA-256 token hashing, upsert, revoke,
  touch, cleanup operations.
- `portal-auth.ts`: Map remains as hot cache; all creates, touches, and
  revokes write-through to PG. Tokens stored as SHA-256 hashes only.
- Wired in `index.ts` Phase 150 block via `initPortalSessionPgRepo()`.

### C) Patient Identity Mapping
- New table `portal_patient_identity`: maps OIDC subject to patient DFN.
- Included in RLS tenant tables array.
- Factory in `durability-repos.ts`: `createPortalPatientIdentityRepo()`.

### D) PHI Cleanup
- Removed `log.info("Portal login", { dfn: patient.dfn })` -- DFN only
  appears in `portalAudit()` trail, never in general log output.

### E) Audit Classifier
- INTERNATIONALIZATION domain updated from "planned" to "partial".
- Reflects next-intl 4.8 integration (Phase 132), I18nProvider, and
  message files in web+portal.

### F) Gauntlet G12
- Gate 7: OIDC enforcement check (requiresOidc export + validation).
- Gate 8: Portal session token hashing repo (sha256 present).

## How to Test

```bash
# 1. Build check
pnpm -C apps/api exec tsc --noEmit

# 2. Posture endpoint (with running API)
curl http://127.0.0.1:3001/posture/data-plane
# Should show oidc_enforcement gate

# 3. Portal login still works in dev mode
curl -X POST http://127.0.0.1:3001/portal/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"patient1","password":"patient1"}'

# 4. Gauntlet
node qa/gauntlet/cli.mjs fast
node qa/gauntlet/cli.mjs rc
```

## Env Vars

| Variable | Required When | Default |
|----------|---------------|---------|
| OIDC_ENABLED | rc/prod | "false" |
| OIDC_ISSUER | rc/prod (when OIDC_ENABLED=true) | none |
| PLATFORM_RUNTIME_MODE | always | "dev" |

## Follow-ups
- Wire OIDC bearer token validation in portal auth for rc/prod login path.
- Populate `portal_patient_identity` from OIDC claims on login.
- Add portal session cleanup cron that calls `cleanExpiredPortalSessions()`.
