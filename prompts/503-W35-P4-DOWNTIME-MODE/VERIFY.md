# Phase 503 — VERIFY

## Gates

1. `scripts/qa/simulate-outage.mjs` exists and runs (offline pattern check)
2. /health handler returns ok:true unconditionally
3. /ready handler returns ok:false when CB is open
4. DegradedBanner polls /ready and shows degraded state
5. Circuit breaker admin route file exists

## Evidence

- `evidence/wave-35/503-W35-P4-DOWNTIME-MODE/outage-sim-report.json`
