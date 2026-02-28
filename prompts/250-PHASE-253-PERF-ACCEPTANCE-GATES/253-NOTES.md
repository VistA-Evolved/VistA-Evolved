# Phase 253 -- NOTES -- Performance Acceptance Gates

## Design Decisions

### Two-Tier Architecture
- **Smoke** (CI): 3 tests, < 30s, gates every PR
- **Load** (Nightly): 2 tests, 2-5 min, catches performance regressions overnight

### Threshold Strategy
- p95, not p50 -- we care about tail latency
- Error rate thresholds are generous (5-10%) for sandbox -- tighten for production
- Each scenario has independent thresholds to isolate regressions

### Graceful Degradation
- Runner skips if k6 is not installed (WARN, not FAIL)
- Runner skips if API is not reachable
- CI uses continue-on-error to collect all results even if one scenario fails

### Existing Scripts Preserved
All 10 existing k6 scripts are unchanged. The acceptance gate layer is additive.
run-smoke.ps1 remains for backward compatibility.
