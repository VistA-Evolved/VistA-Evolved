# Load Testing Runbook

> Phase 289 -- Production-Scale Load Test Campaign

## Overview

VistA-Evolved includes 3 production-scale k6 load test scenarios, plus the
existing smoke tests from Phase 36.

| Scenario | VUs | Duration | Purpose |
|----------|-----|----------|---------|
| `prod-sustained.js` | 50 | 5 min | Steady-state throughput |
| `prod-spike.js` | 10-100 | 4 min | Traffic spike resilience |
| `prod-soak.js` | 20 | 30 min | Memory leaks, degradation |
| `smoke-login.js` | 5 | 30s | Auth flow validation |
| `smoke-reads.js` | 10 | 1 min | Read-only clinical endpoints |
| `smoke-write.js` | 5 | 30s | Write workflow validation |

## Prerequisites

```powershell
# Install k6
choco install k6

# Start API + VistA
cd services/vista; docker compose --profile dev up -d
cd apps/api; npx tsx --env-file=.env.local src/index.ts
```

## Running Tests

### Quick smoke (existing)
```powershell
.\tests\k6\run-smoke.ps1
```

### Full campaign
```powershell
.\tests\k6\run-campaign.ps1
```

### Individual scenarios
```powershell
k6 run tests/k6/prod-sustained.js
k6 run tests/k6/prod-spike.js
k6 run tests/k6/prod-soak.js
```

### Skip soak (for CI)
```powershell
.\tests\k6\run-campaign.ps1 -SkipSoak
```

### Against staging
```powershell
.\tests\k6\run-campaign.ps1 -ApiUrl https://staging.ehr.local:3001
```

## Performance Budgets

See `tests/k6/prod-load-plan.md` for the full budget table.

Key thresholds:
- **p95 < 2s** for sustained load
- **p95 < 5s** during spike peak
- **Error rate < 1%** for sustained, < 5% for spike
- **No heap growth** over 30-minute soak

## Output

Results are saved to `tests/k6/results/<timestamp>/`:
- `sustained.json` -- raw k6 data points
- `sustained-summary.json` -- aggregated metrics
- `spike.json` + `spike-summary.json`
- `soak.json` + `soak-summary.json`
- `campaign-summary.json` -- overall pass/fail

## Tuning After Load Tests

### Common findings and fixes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| p95 > 2s on reads | VistA broker serialization | Connection pooling |
| Rising p99 during soak | Memory leak | Profile with `--inspect` |
| Spike errors > 5% | Rate limiter too aggressive | Tune `DICOMWEB_RATE_LIMIT` |
| 503 during spike | Circuit breaker tripped | Adjust CB failure threshold |

### Profiling
```powershell
# Start API with heap profiling
node --inspect --max-old-space-size=1024 apps/api/src/index.ts

# During soak test, capture heap snapshot
# Connect Chrome DevTools to ws://localhost:9229
```

## CI Integration

The `run-campaign.ps1 -SkipSoak` variant can run in CI (< 10 min).
For nightly builds, include the full soak: `run-campaign.ps1`.
