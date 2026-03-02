# Phase 503 — Downtime Mode + VistA Outage Simulation

## Objective
Create a VistA outage simulation script and verify all downtime behaviors
match the RC_EXIT_CRITERIA.md spec:
- /health always 200
- /ready false when CB open
- writes return 503
- UI banner visible
- break-glass blocked during outage

## Files Changed
- `scripts/qa/simulate-outage.mjs` — Outage sim: forces CB open via admin, checks behaviors
- `apps/api/src/routes/admin-circuit.ts` — Admin endpoint to force-open/close CB

## Verification
- simulate-outage.mjs runs offline (validates architecture patterns exist)
- Circuit breaker admin endpoint is documented
