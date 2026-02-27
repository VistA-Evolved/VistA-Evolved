# Phase 162 -- Performance + UX Speed Pass

## Overview

Phase 162 adds server-side route profiling, configurable performance budgets,
and a slow query monitor. All data is in-memory (ring buffers) and resets
on API restart -- no persistence needed.

## Architecture

```
apps/api/src/performance/
  types.ts          -- RouteProfile, PerformanceBudget, SlowQueryEntry, PerformanceSummary
  profiler.ts       -- Ring buffer profiler (1000 entries/route), percentile calc
  budget-engine.ts  -- Budget CRUD + evaluation (prefix matching)
  perf-routes.ts    -- /admin/performance/* REST endpoints
  index.ts          -- Barrel export

apps/web/src/app/cprs/admin/performance/
  page.tsx          -- 4-tab dashboard (Summary, Profiles, Budgets, Slow Queries)
```

## API Endpoints

All under `/admin/performance/` (admin auth required):

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/performance/summary | Health score, system P95/avg, budget status |
| GET | /admin/performance/profiles | All route profiles with percentiles |
| GET | /admin/performance/slow-routes?threshold=1000 | Routes exceeding threshold |
| GET | /admin/performance/slow-queries?limit=100 | Recent slow query log |
| GET | /admin/performance/budgets | List all budgets |
| GET | /admin/performance/budgets/:id | Get single budget |
| POST | /admin/performance/budgets | Create/update budget |
| DELETE | /admin/performance/budgets/:id | Delete budget |
| POST | /admin/performance/budgets/seed | Seed 9 default budgets |
| POST | /admin/performance/record | Manual record (testing) |
| POST | /admin/performance/reset | Reset all profiles and logs |

## Performance Budgets

Default budgets (seeded via `/budgets/seed`):

| Pattern | Method | Max Ms | Description |
|---------|--------|--------|-------------|
| /vista/ | * | 2000 | Clinical read routes |
| /admin/ | * | 5000 | Admin routes |
| /auth/ | * | 1000 | Auth endpoints |
| /health | GET | 100 | Health check |
| /ready | GET | 200 | Readiness check |
| /imaging/ | * | 10000 | DICOMweb proxy |
| /portal/ | * | 3000 | Portal routes |
| /scheduling/ | * | 3000 | Scheduling |
| /queue/display | GET | 500 | Public queue display |

Budget evaluation uses prefix matching (most specific wins).

## Health Score

Calculated from:
- Start at 100
- Each budget violation: -5 points
- System P95 > 5s: -20, > 2s: -10, > 1s: -5
- Clamped to [0, 100]

## Ring Buffer Design

- **Per-route buffer**: 1000 entries max per unique (route, method) pair
- **Slow query log**: 2000 entries max (FIFO eviction)
- **Percentile calculation**: Sort-based on retained buffer entries
- All in-memory, no persistence -- resets on API restart

## Integration

The profiler `recordRouteProfile()` function is available for Fastify
`onResponse` hooks to automatically record every request. Currently,
profiles are recorded manually via the `/record` endpoint or can be
wired into the existing metrics pipeline.

## Manual Testing

```bash
# Seed default budgets
curl -X POST http://localhost:3001/admin/performance/budgets/seed \
  -b cookies.txt

# Record a test timing
curl -X POST http://localhost:3001/admin/performance/record \
  -b cookies.txt -H "Content-Type: application/json" \
  -d '{"route":"/vista/allergies","method":"GET","durationMs":450,"statusCode":200,"responseBytes":2048}'

# View summary
curl http://localhost:3001/admin/performance/summary -b cookies.txt

# List profiles
curl http://localhost:3001/admin/performance/profiles -b cookies.txt
```

## Store Policy

Three entries registered:
- `route-profile-store` (cache, in_memory_only, maxSize: 1000/route)
- `slow-query-log` (audit, in_memory_only, maxSize: 2000)
- `performance-budget-store` (registry, in_memory_only)
