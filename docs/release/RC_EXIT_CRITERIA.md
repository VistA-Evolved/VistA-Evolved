# RC-1 Exit Criteria

## Severity Policy

| Severity | Definition | RC Impact |
|----------|-----------|-----------|
| **P0 — Critical** | Data loss, PHI exposure, system crash, auth bypass | **Release blocker.** Must fix before RC tag. |
| **P1 — Major** | Core workflow broken (orders, meds, notes, allergies), silent data corruption | **Release blocker.** Must fix or have documented workaround + fix ETA. |
| **P2 — Moderate** | Non-core workflow broken, UI cosmetic with functional impact, perf regression > 2x budget | **Not a blocker.** Must be ticketed with target milestone. |
| **P3 — Minor** | Cosmetic, docs typo, non-user-facing log noise | **Not a blocker.** Fix opportunistically. |

## Error Budget Thresholds

| Metric | Budget | Measurement |
|--------|--------|-------------|
| P0 defects | **0** | defect registry scan |
| P1 defects | **0** (or workaround documented) | defect registry scan |
| P2 defects | **<= 20** | defect registry scan |
| Integration-pending endpoints | **<= budgeted count** | integration-pending-budget gate |
| TypeScript compile errors | **0** | tsc --noEmit |
| Console.log violations | **<= 6** (legacy cap) | grep scan |
| Hardcoded credentials | **0** (outside login page) | secret scan |

## Uptime / Downtime Behavior

### Normal Operation
- API responds to `/health` with 200 within 500ms
- API responds to `/ready` with `{ok: true}` when VistA is reachable
- All CRUD operations functional

### VistA Outage (Downtime Mode)
- API responds to `/health` with 200 (liveness — always up)
- API responds to `/ready` with `{ok: false}` (readiness — not ready for writes)
- **Write endpoints:** Return 503 with `{ok: false, downtime: true, retryAfter: 30}`
- **Read endpoints:** Return cached/safe data where available, 503 otherwise
- **UI:** Displays downtime banner; blocks write forms; shows cached read data
- **Audit:** Downtime entry/exit events logged (no PHI)
- **Break-glass:** Explicitly blocked during downtime (no VistA to verify against)

### Recovery
- When VistA reconnects, `/ready` returns `{ok: true}` within 30s
- Queued operations (if any) are retried automatically
- Downtime banner clears

## Go/No-Go Decision

The RC is tagged when:
1. All G01-G12 gates in RC_SCOPE.md pass
2. Zero P0 defects
3. Zero unmitigated P1 defects
4. Downtime mode is implemented and tested
5. Security precert pack has no critical findings
6. Evidence bundle is generated and checksummed

Sign-off required from: Engineering Lead, QA Lead, Security Lead (or their agent equivalents in automated pipeline).
