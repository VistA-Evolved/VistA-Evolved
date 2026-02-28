# Production Load Test Plan

> Phase 289 -- VistA-Evolved Load Test Campaign

## 1. Objectives

Validate that VistA-Evolved meets production-scale performance requirements:
- Sustained throughput under realistic clinical workloads
- Resilience to traffic spikes (shift changes, emergency events)
- Stability over extended periods (soak testing)
- Identification of resource leaks and degradation patterns

## 2. Performance Budgets

### API Latency Targets

| Endpoint Category | p50 Target | p95 Target | p99 Target |
|-------------------|-----------|-----------|-----------|
| Health/Ready | < 10ms | < 50ms | < 100ms |
| Auth (login) | < 500ms | < 2000ms | < 5000ms |
| VistA reads (patient list, allergies) | < 200ms | < 1000ms | < 3000ms |
| VistA writes (add allergy, order) | < 500ms | < 2000ms | < 5000ms |
| FHIR endpoints | < 300ms | < 1500ms | < 4000ms |
| Analytics reads | < 100ms | < 500ms | < 1000ms |
| Admin endpoints | < 200ms | < 1000ms | < 2000ms |

### Throughput Targets

| Metric | Target |
|--------|--------|
| Sustained RPS (mixed) | >= 50 req/s |
| Peak RPS (spike) | >= 150 req/s |
| Error rate (sustained) | < 1% |
| Error rate (spike peak) | < 5% |

### Resource Targets

| Metric | Target |
|--------|--------|
| API heap (sustained) | < 512 MB |
| API heap (soak 30min) | < 768 MB (no unbounded growth) |
| VistA broker connections | < 10 concurrent |

## 3. Test Scenarios

### Scenario A: Sustained Load (`prod-sustained.js`)
- **Duration**: 5 minutes
- **VUs**: Ramp 1 -> 50 over 1 min, hold 50 for 3 min, ramp down 1 min
- **Workload mix**: 60% reads, 25% FHIR, 15% writes
- **Pass criteria**: p95 < 2s, error rate < 1%

### Scenario B: Spike Test (`prod-spike.js`)
- **Duration**: 4 minutes
- **VUs**: 10 -> 100 (30s ramp) -> hold 1 min -> 10 (30s ramp) -> hold 1 min
- **Workload**: Read-heavy (80% reads, 20% auth)
- **Pass criteria**: p95 < 5s during spike, recovery to baseline within 30s

### Scenario C: Soak Test (`prod-soak.js`)
- **Duration**: 30 minutes (configurable)
- **VUs**: Constant 20
- **Workload**: Balanced (50% reads, 30% FHIR, 20% writes)
- **Pass criteria**: No memory leak (heap p99 < 768 MB), error rate stable

## 4. Prerequisites

- k6 installed (`choco install k6` or `brew install k6`)
- API server running on localhost:3001
- VistA Docker container running and accessible
- Valid credentials configured in .env.local

## 5. Running Tests

```powershell
# Individual scenario
k6 run tests/k6/prod-sustained.js

# Full campaign (all 3 scenarios in sequence)
.\tests\k6\run-campaign.ps1

# With custom API URL
.\tests\k6\run-campaign.ps1 -ApiUrl http://staging:3001
```

## 6. Interpreting Results

### k6 output fields
- `http_req_duration`: End-to-end request time
- `http_req_failed`: Non-2xx or timeout
- `iterations`: Total scenarios completed
- `vus`: Active virtual users

### Tuning backlog (discovered via load tests)

| Priority | Finding | Fix |
|----------|---------|-----|
| P1 | VistA broker serialization | Implement connection pooling |
| P1 | Session store lock contention | Move to PG-backed sessions |
| P2 | FHIR transform CPU spike | Cache FHIR bundles (TTL 60s) |
| P2 | Large patient list pagination | Add cursor-based pagination |
| P3 | Analytics aggregation blocks reads | Run aggregation off-thread |
