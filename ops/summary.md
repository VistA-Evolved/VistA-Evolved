# Wave 13 Integrity Audit Fix

## What Changed

### Critical Wiring Fixes
1. **Route Registration** (`register-routes.ts`):
   - Added imports + `server.register()` for all 5 W13 route files
   - Added `initTerminologyResolvers()` call at startup

2. **AUTH_RULES** (`security.ts`):
   - `/residency/` → admin, `/consent/` → session, `/terminology/` → session, `/country-packs/` → session, `/compliance/` → admin

### Contract Fixes
3. **Compliance Routes** — replaced dead imports with actual usage of `getRequirementsByCategory`/`getRequirementsByStatus`

### Store Policy
4. **5 W13 stores** registered in `store-policy.ts`: consent-records, terminology-resolvers, transfer-agreements, tenant-regions, country-pack-cache

### Dev Dependency Fix
5. **locale-utils** — added `@types/node` + `vitest` to devDependencies

## Verifier Output
- `apps/api`: `tsc --noEmit` — 0 errors
- `packages/locale-utils`: `tsc --noEmit` — 0 errors
to S3/MinIO-compatible object storage with SHA-256 integrity manifests.

### New Files (7)
- `apps/api/src/audit-shipping/types.ts` -- Shared type definitions
- `apps/api/src/audit-shipping/s3-client.ts` -- Zero-dep S3/MinIO client (AWS Sig V4)
- `apps/api/src/audit-shipping/manifest.ts` -- SHA-256 manifest builder + verifier
- `apps/api/src/audit-shipping/shipper.ts` -- Scheduled JSONL shipper job
- `apps/api/src/audit-shipping/index.ts` -- Barrel export
- `apps/api/src/routes/audit-shipping-routes.ts` -- 4 admin endpoints
- `apps/api/src/posture/audit-shipping-posture.ts` -- 6 posture gates

### Modified Files (9)
- `apps/api/src/platform/pg/pg-migrate.ts` -- v22: audit_ship_offset + audit_ship_manifest + RLS
- `apps/api/src/platform/db/migrate.ts` -- SQLite equivalents
- `apps/api/src/platform/db/schema.ts` -- Drizzle ORM table definitions
- `apps/api/src/platform/store-policy.ts` -- 2 store entries (audit classification)
- `apps/api/src/posture/index.ts` -- Wired audit-shipping into unified posture
- `apps/api/src/middleware/security.ts` -- stopShipperJob in graceful shutdown
- `apps/api/src/index.ts` -- startShipperJob + route registration
- `apps/api/.env.example` -- 9 AUDIT_SHIP_* env vars documented
- `AGENTS.md` -- Section 7v, items 172-176

## Verifier: 18 PASS / 0 FAIL / 0 WARN
## Gauntlet RC: 4 PASS / 0 FAIL / 1 WARN (pre-existing secret scan)
2. **Audit sanitization hardened**: All 4 sanitizeDetail implementations (immutable-audit, imaging-audit, rcm-audit, portal-audit) now block DFN/MRN/patientName keys. Immutable-audit and imaging-audit delegate to centralized `sanitizeAuditDetail` first.
3. **Config lockdown**: `auditIncludesDfn: false` in server-config.ts. `neverLogFields` expanded with dfn/patientDfn/patientName/mrn.
4. **Log PHI leaks fixed**: Removed `dfn` from `log.info/warn/error` payloads in 7 call sites (imaging-service x4, imaging-viewer x1, emar x1, write-backs x1). Removed `patientDfn` from audit.ts log.info.
5. **G22 PHI Leak Audit gate**: New gauntlet gate with 6 static-analysis checks. Wired into RC + full suites.
6. **Unit tests**: 37 tests covering PHI_FIELDS, redactPhi, sanitizeAuditDetail, sanitizeForAudit, isBlockedField, classifyField, assertNoPhiInAttributes, assertNoPhiInMetricLabels.

## How to test manually

```bash
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/api exec vitest run tests/phi-redaction.test.ts
node qa/gauntlet/cli.mjs fast
node qa/gauntlet/cli.mjs --suite rc
```

## Verifier output

- FAST: 4P / 0F / 0S / 1W
- RC: 18P / 0F / 1S / 2W
- FULL: 19P / 1F(VistA Probe, Docker off) / 1S / 2W

## Follow-ups

- Extend G22 to scan for `patientName` in log payloads (currently only checks `dfn`)
- Consider adding runtime PHI leak detection for telemetry span attributes
- Audit remaining 50+ `immutableAudit` call sites that pass detail with `{ dfn }` (centralized sanitizer catches them, but call sites should be cleaned for clarity)

---

# Phase 157 VERIFY — Audit Shipping Verification

## What Was Verified
1. **Live MinIO test**: Shipper ran against local MinIO (port 9000), shipped 76 entries on initial cycle
2. **Manifest integrity**: SHA-256 hashes, seq ranges (1-75, 76-78, 79-79, 80-80), byte sizes verified
3. **Idempotency**: 3 manual triggers each shipped exactly 1 new entry (self-audit), no duplicates
4. **Posture**: Score 100, all 6 posture gates PASS
5. **Schema alignment**: PG/SQLite/Drizzle/TS types consistent across all 4 sources

## Fixes Applied During VERIFY
1. **AGENTS.md item 175**: Corrected to state offsets are in-memory (DB tables ready for wiring)
2. **shipper.ts docstring**: Updated to match reality about in-memory offset tracking
3. **no-fake-success middleware**: Added ~100 missing EFFECT_PROOF_FIELDS entries, eliminating 59 spurious warnings across 20 route files

## Verifier Output
- Phase 157: **18/18 PASS**
- Gauntlet RC: **4 PASS, 0 FAIL, 1 WARN** (pre-existing secret scan)

## Follow-ups
- Wire `setShipperDbRepo()` for durable offset persistence across API restarts
- Tune `AUDIT_SHIP_INTERVAL_MS` for production workloads
