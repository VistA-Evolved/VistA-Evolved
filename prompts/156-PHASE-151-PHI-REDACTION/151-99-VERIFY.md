# Phase 151 — PHI Redaction Hardening (VERIFY)

## Verification Protocol

### Tier 1 — Sanity (fast)
1. `npx tsc --noEmit` — zero errors
2. `pnpm exec vitest run tests/phi-redaction.test.ts` — all unit tests pass
3. `node qa/gauntlet/cli.mjs fast` — baseline 4P

### Tier 2 — Feature Integrity
4. G22 PHI Leak Audit gate passes with 6/6 checks
5. `sanitizeAuditDetail({ dfn: "3", patientName: "DOE,JOHN", action: "read" })` → dfn/patientName redacted, action preserved
6. PHI_FIELDS includes: dfn, patientdfn, patient_dfn, mrn
7. server-config.ts: `auditIncludesDfn: false`, neverLogFields has dfn/patientDfn/mrn
8. No `log.info|warn|error` calls with `{ dfn` pattern in routes/ or services/

### Tier 3 — System Regression
9. `node qa/gauntlet/cli.mjs --suite rc` — 18P (17 baseline + G22)
10. `node qa/gauntlet/cli.mjs --suite full` — 19P (18 baseline + G22)

## Pass Criteria
- All Tier 1-2 checks pass
- RC suite: 0 new failures vs baseline (17P → 18P)
- FULL suite: 0 new failures vs baseline (18P → 19P)
- G22 is green in both RC and full suites
