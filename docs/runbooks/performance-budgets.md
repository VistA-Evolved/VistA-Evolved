# Performance Budgets Runbook

> Phase 52 — Performance Budget Definitions + Load Tests

## Overview

Performance budgets define upper bounds for page load times, API latency,
bundle sizes, and VistA RPC timeouts. They are enforced via:

1. **Config file**: `config/performance-budgets.json` (machine-readable)
2. **k6 load tests**: `tests/k6/perf-budgets.js` (automated enforcement)
3. **Playwright timing checks**: built into E2E scenario tests

## Budget Categories

### 1. Web Vitals

Target Core Web Vitals for all pages:

| Metric | Target   | Description               |
| ------ | -------- | ------------------------- |
| LCP    | < 2500ms | Largest Contentful Paint  |
| FID    | < 100ms  | First Input Delay         |
| CLS    | < 0.1    | Cumulative Layout Shift   |
| INP    | < 200ms  | Interaction to Next Paint |
| TTFB   | < 800ms  | Time to First Byte        |

### 2. Page Load Budgets

Maximum transfer sizes and load times per route group:

| Route Group      | JS Bundle | Total Transfer | DOMContentLoaded | Full Load |
| ---------------- | --------- | -------------- | ---------------- | --------- |
| Login            | 300 KB    | 500 KB         | 2000ms           | 4000ms    |
| Patient Search   | 400 KB    | 600 KB         | 2500ms           | 5000ms    |
| CPRS Chart       | 500 KB    | 800 KB         | 3000ms           | 6000ms    |
| Admin Pages      | 500 KB    | 800 KB         | 3000ms           | 6000ms    |
| Portal Dashboard | 350 KB    | 500 KB         | 2000ms           | 4000ms    |

### 3. API Latency Budgets (p95)

| Endpoint Group                | p95    | p99     | Notes                         |
| ----------------------------- | ------ | ------- | ----------------------------- |
| **Infrastructure**            |        |         |                               |
| /health                       | 50ms   | 100ms   | In-memory, no IO              |
| /ready                        | 100ms  | 200ms   | Circuit breaker check         |
| /metrics                      | 200ms  | 500ms   | prom-client scrape            |
| **Auth**                      |        |         |                               |
| /auth/login                   | 3000ms | 5000ms  | VistA RPC auth                |
| /auth/session                 | 100ms  | 200ms   | In-memory lookup              |
| **Clinical Reads**            |        |         |                               |
| Patient search                | 3000ms | 5000ms  | VistA RPC                     |
| Demographics                  | 2000ms | 3000ms  | VistA RPC                     |
| Allergies / Vitals / Problems | 2000ms | 3000ms  | VistA RPC                     |
| Medications / Notes / Labs    | 3000ms | 5000ms  | VistA RPC                     |
| Reports                       | 5000ms | 8000ms  | VistA RPC (multi-call)        |
| **Clinical Writes**           |        |         |                               |
| Add allergy / problem         | 5000ms | 8000ms  | VistA RPC write               |
| Sign order                    | 5000ms | 10000ms | VistA RPC write (LOCK/UNLOCK) |
| **Admin Reads**               |        |         |                               |
| Module status / capabilities  | 200ms  | 500ms   | In-memory                     |
| Adapter health                | 500ms  | 1000ms  | Probes adapters               |
| RCM claims / payers           | 500ms  | 1000ms  | In-memory store               |

### 4. VistA RPC Budgets

| Parameter                 | Value      | Notes                          |
| ------------------------- | ---------- | ------------------------------ |
| Connection timeout        | 10s        | TCP connect to port 9430       |
| RPC call timeout          | 15s        | Single RPC invocation          |
| RPC p95 latency           | 5s         | Expected normal operation      |
| RPC p99 latency           | 10s        | Acceptable slow path           |
| Login timeout             | 15s        | Full auth handshake            |
| Circuit breaker threshold | 5 failures | Before tripping open           |
| Circuit breaker reset     | 30s        | Half-open retry window         |
| Max concurrent RPCs       | 10         | Socket serialization via mutex |
| Health check interval     | 30s        | Keep-alive probe               |

## Running Load Tests

### Prerequisites

- [k6](https://k6.io/) installed (`winget install k6` or `brew install k6`)
- API running on `localhost:3001`
- VistA Docker running (for clinical endpoint tests)

### Test Tiers

```bash
# Smoke test (2 VUs, 30s) — quick validation
k6 run tests/k6/perf-budgets.js

# Load test (10 VUs, 2m) — normal traffic simulation
k6 run -e TIER=load tests/k6/perf-budgets.js

# Stress test (25 VUs, 5m) — find breaking points
k6 run -e TIER=stress tests/k6/perf-budgets.js

# Custom API URL
k6 run -e API_URL=http://staging:3001 tests/k6/perf-budgets.js
```

### k6 Thresholds

The load test enforces these thresholds (auto-fail if exceeded):

| Metric               | Threshold            | Description                 |
| -------------------- | -------------------- | --------------------------- |
| `http_req_duration`  | p95 < 10s, p99 < 15s | Global latency budget       |
| `http_req_failed`    | rate < 10%           | Max request failure rate    |
| `rpc_latency`        | p95 < 5s, p99 < 10s  | VistA RPC-backed calls      |
| `failed_requests`    | count < 50           | Hard failure cap            |
| Infrastructure group | p95 < 200ms          | /health, /ready, /version   |
| Auth group           | p95 < 5s             | Login, session              |
| Clinical reads group | p95 < 5s             | All clinical read endpoints |
| Admin reads group    | p95 < 1s             | Module status, capabilities |

### Existing k6 Tests (Phase 36)

| File              | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `smoke-login.js`  | Auth flow smoke test                            |
| `smoke-reads.js`  | Read-only clinical endpoints                    |
| `smoke-write.js`  | Write workflow (partially fails on sandbox)     |
| `perf-budgets.js` | Budget-enforced multi-tier load test (Phase 52) |

## Monitoring Budgets in Production

### Prometheus Metrics

The API exposes Prometheus metrics at `/metrics/prometheus`:

- `http_request_duration_seconds` — histogram by route
- `rpc_call_duration_seconds` — histogram by RPC name
- `circuit_breaker_state` — gauge (0=closed, 1=open, 2=half-open)

Set Prometheus alerting rules based on the p95 budgets above.

### Example Alert Rule

```yaml
groups:
  - name: performance-budgets
    rules:
      - alert: ApiLatencyBudgetExceeded
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'API p95 latency exceeds 10s budget'
```

## Updating Budgets

1. Edit `config/performance-budgets.json`
2. Update k6 thresholds in `tests/k6/perf-budgets.js` to match
3. Update this runbook
4. Run the load test suite to validate

Budgets should be tightened as the system matures. The initial values
are generous to account for VistA sandbox variability.
