# Phase 150 -- Enterprise IAM Default + Portal Auth Modernization (IMPLEMENT)

## Scope

Make OIDC the default (and mandatory) identity provider in rc/prod modes.
Replace the in-memory portal session Map with a PG-backed store that uses
token hashing, add patient identity mapping, remove PHI from logs, and
update the stale i18n audit classifier.

## Key work

### A) Enforce OIDC in rc/prod

- In `runtime-mode.ts`, add `requiresOidc()` export -- true for rc/prod.
- In `validateRuntimeMode()`, add: if requiresOidc(), OIDC_ENABLED must
  be "true" and OIDC_ISSUER must be set, else throw at startup.
- Add `oidc_enforcement` gate to `data-plane-posture.ts`.

### B) Portal session PG store

- ALTER TABLE `portal_session` in `pg-migrate.ts`: add columns
  `token_hash TEXT`, `subject TEXT`, `patient_dfn TEXT`,
  `last_activity_at TEXT`, `revoked_at TEXT`. Add index on token_hash.
- Create `pg-portal-session-repo.ts` with hash-based lookup:
  `upsertSession(tokenHash, data)`, `findByTokenHash(hash)`,
  `revokeSession(id)`, `cleanExpired()`.
- Rewrite `portal-auth.ts`: Map becomes hot cache, writes go to DB via
  `initPortalSessionRepo()`. Token stored as SHA-256 hash in DB.
- Wire repo in `index.ts` Phase 150 block.

### C) Patient identity mapping

- CREATE TABLE `portal_patient_identity` in `pg-migrate.ts`
  (tenant_id, oidc_sub, patient_dfn, display_name, verified_at, created_at).
  Add to RLS tenant tables.
- Create a lightweight repo + wire in index.ts.

### D) PHI/logging cleanup

- Remove `log.info("Portal login", { dfn: patient.dfn })` in portal-auth.ts.
- Audit all `portalAudit` calls -- DFN is OK in audit (security trail),
  but must not appear in general log output.

### E) Audit classifier i18n

- Update `scripts/audit/system-audit.mjs` INTERNATIONALIZATION domain:
  change status from "planned" to "partial", update gaps to reflect
  next-intl integration (Phase 132), I18nProvider, message files in
  both web and portal.

### F) Tests + gauntlet gates

- G12 data-plane gate: add OIDC enforcement check.
- Ensure token hashing is testable (round-trip hash check).

## Files touched

- `apps/api/src/platform/runtime-mode.ts` (MODIFIED)
- `apps/api/src/posture/data-plane-posture.ts` (MODIFIED)
- `apps/api/src/platform/pg/pg-migrate.ts` (MODIFIED)
- `apps/api/src/platform/pg/repo/pg-portal-session-repo.ts` (NEW)
- `apps/api/src/platform/pg/repo/durability-repos.ts` (MODIFIED)
- `apps/api/src/routes/portal-auth.ts` (MODIFIED)
- `apps/api/src/index.ts` (MODIFIED)
- `scripts/audit/system-audit.mjs` (MODIFIED)
- `docs/runbooks/phase150-iam-portal-auth.md` (NEW)

## Verification

- `pnpm -C apps/api exec tsc --noEmit` clean
- `/posture/data-plane` shows oidc_enforcement gate
- Portal login still works in dev mode
- Audit classifier i18n domain no longer shows "planned"
