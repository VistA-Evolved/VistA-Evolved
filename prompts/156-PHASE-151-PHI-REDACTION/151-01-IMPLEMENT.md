# Phase 151 — PHI Redaction Hardening (IMPLEMENT)

## Objective

Harden all audit emitters, log statements, and telemetry attributes to
prevent PHI (patient identifiers, DFN, MRN, names) from leaking into
logs, audit trails, or metric labels.

## Scope

- **A) Centralized redaction helper** — Extend `lib/phi-redaction.ts`:
  add `dfn`, `patientdfn`, `patient_dfn`, `mrn` to PHI_FIELDS; export
  `sanitizeAuditDetail()` convenience function.
- **B) Update all audit emitters** — Wire centralized `sanitizeAuditDetail`
  into immutable-audit.ts, imaging-audit.ts, rcm-audit.ts, portal-audit.ts.
  Block DFN keys in local sanitize functions. Set `auditIncludesDfn: false`
  and expand `neverLogFields` in server-config.ts.
- **C) PHI leak CI gate** — New gauntlet gate `G22_phi_leak_audit` that
  statically scans for PHI leaks in log calls and validates redaction config.
- **D) Unit tests** — `tests/phi-redaction.test.ts` covering all exports
  from the centralized redaction module.

## Files Changed

1. `apps/api/src/lib/phi-redaction.ts` — added dfn/mrn to PHI_FIELDS + sanitizeAuditDetail export
2. `apps/api/src/config/server-config.ts` — auditIncludesDfn=false, neverLogFields expanded
3. `apps/api/src/lib/audit.ts` — removed patientDfn from log.info
4. `apps/api/src/lib/immutable-audit.ts` — imported centralized sanitize, two-pass approach
5. `apps/api/src/services/imaging-audit.ts` — imported centralSanitize, added PHI fields to BLOCKED_KEYS
6. `apps/api/src/rcm/audit/rcm-audit.ts` — added dfn/patientdfn/patient_dfn/mrn checks
7. `apps/api/src/services/portal-audit.ts` — imported/applied sanitizeAuditDetail
8. `apps/api/src/services/imaging-service.ts` — removed dfn from 4 log.warn calls
9. `apps/api/src/routes/imaging-viewer.ts` — removed dfn from log.warn
10. `apps/api/src/routes/emar/index.ts` — removed dfn from log.info
11. `apps/api/src/routes/write-backs.ts` — removed dfn from log.info
12. `qa/gauntlet/gates/g22-phi-leak-audit.mjs` — new gate (6 checks)
13. `qa/gauntlet/cli.mjs` — wired G22 into RC + full suites
14. `apps/api/tests/phi-redaction.test.ts` — unit tests for redaction module

## Verification

- `npx tsc --noEmit` — no type errors
- `pnpm exec vitest run tests/phi-redaction.test.ts` — all 25+ tests pass
- `node qa/gauntlet/cli.mjs fast` — baseline maintained
- `node qa/gauntlet/cli.mjs --suite rc` — G22 passes
- No dfn/patientDfn in any log.info/warn/error payload across routes/services
