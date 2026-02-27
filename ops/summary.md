# Phase 151 -- Ops Summary

## What changed

1. **Centralized PHI redaction**: Extended `phi-redaction.ts` with `dfn`, `patientdfn`, `patient_dfn`, `mrn` in `PHI_FIELDS`. Added `sanitizeAuditDetail()` export.
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
