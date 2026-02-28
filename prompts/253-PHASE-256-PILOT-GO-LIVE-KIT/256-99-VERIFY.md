# Phase 256 — Pilot Hospital Go-Live Kit (VERIFY)

## Verification Command
```powershell
.\scripts\verify-phase256-go-live-kit.ps1
```

## Gates (22)

### Core Artifacts (G01-G03)
- G01: `docs/pilot-go-live-kit.md` exists
- G02: `ops/drills/run-go-live-gate.ps1` exists
- G03: `apps/api/tests/go-live-certification.test.ts` exists

### Runbook Content (G04-G09)
- G04: Day-1 Checklist section present
- G05: Rollback Plan section present
- G06: Sign-Off section present
- G07: Verification Gates Summary table
- G08: References Wave 7 entry gate
- G09: References PLATFORM_RUNTIME_MODE

### Pilot Infrastructure (G10-G12)
- G10: `apps/api/src/pilot/site-config.ts` exists
- G11: `apps/api/src/pilot/preflight.ts` exists
- G12: Pilot admin page exists

### Wave 7 Verifiers (G13-G20)
- G13: `wave7-entry-gate.ps1` exists
- G14: Phase 249 verifier exists
- G15: Phase 250 verifier exists
- G16: Phase 251 verifier exists
- G17: Phase 252 verifier exists
- G18: Phase 253 verifier exists
- G19: Phase 254 verifier exists
- G20: Phase 255 verifier exists

### Drills and CI (G21-G22)
- G21: DR certification drill exists
- G22: Resilience CI workflow exists

## Expected Result
```
PASSED: 22 / 22
FAILED: 0 / 22
RESULT: PASS
```
