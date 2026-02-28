# Phase 308 Evidence — Departmental Certification Runner (W12-P10)

## Files Created
| File | Purpose | Lines |
|------|---------|-------|
| apps/api/src/writeback/certification-runner.ts | 17-check certification suite | ~315 |
| apps/api/src/writeback/__tests__/certification-contract.test.ts | 14 contract tests | ~130 |

## Files Modified
| File | Change |
|------|--------|
| apps/api/src/writeback/writeback-routes.ts | +2 endpoints: /writeback/certification, /writeback/certification/summary |
| apps/api/src/writeback/index.ts | +certification exports (runCertification, getCertificationSummary, types) |

## Certification Checks (17 total)

### Infrastructure (4)
1. `infra.command-bus` — Command store operational
2. `infra.gates` — Feature gates configured
3. `infra.audit` — Audit actions registered (10 writeback+telehealth actions)
4. `infra.store-policy` — Store entries declared (8 writeback+telehealth entries)

### Domain Executors (6)
5-10. `domain.{tiu,orders,pharm,lab,adt,img}` — Each checks executor registration + dry-run

### Telehealth (3)
11. `telehealth.encounter-link` — Encounter link store operational
12. `telehealth.consent` — Consent posture config valid (recording OFF)
13. `telehealth.session-hardening` — Hardening config valid (timeouts > 0)

### Safety (4)
14. `safety.dry-run` — Dry-run default is ON
15. `safety.kill-switch` — Global kill-switch state
16. `safety.intent-mapping` — 19 intents across 6 domains
17. `safety.phi-guard` — patientRefHash used, not raw DFN

## API Endpoints
- `GET /writeback/certification` — Full 17-check report (admin only)
- `GET /writeback/certification/summary` — Quick health check

## No PHI
- Synthetic commands use `_certification: true` marker
- Patient ref is `cert-hash-0000` (not a real DFN)
- No SSN, DOB, or names in any check output
