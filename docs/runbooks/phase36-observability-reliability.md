# Phase 36 -- Production Observability & Reliability

> Runbook for the observability stack (OpenTelemetry, Jaeger, Prometheus)
> and reliability improvements (drain timeout, circuit-breaker exposure,
> k6 smoke tests).

---

## 1. Prerequisites

| Component      | Version | Purpose                       |
| -------------- | ------- | ----------------------------- |
| Docker Desktop | 4.x+    | Runs observability containers |
| k6             | 0.50+   | Load / smoke testing          |
| Node.js        | 20+     | API runtime                   |
| pnpm           | 9+      | Package manager               |

---

## 2. Observability Stack

### 2a. Start the stack

```powershell
cd services\observability
docker compose up -d
```

This starts three containers:

| Service            | Port(s)                                      | Purpose                                |
| ------------------ | -------------------------------------------- | -------------------------------------- |
| **otel-collector** | 4317 (gRPC), 4318 (HTTP), 8889 (Prom scrape) | Receives traces + metrics from the API |
| **jaeger**         | 16686 (UI)                                   | Distributed trace viewer               |
| **prometheus**     | 9090 (UI)                                    | Metrics storage + queries              |

### 2b. Enable tracing in the API

Set these environment variables in `apps/api/.env.local`:

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=vista-evolved-api
```

Then start the API:

```powershell
cd apps\api
npx tsx --env-file=.env.local src/index.ts
```

### 2c. Verify traces

1. Make a few API requests (e.g., `curl http://localhost:3001/health`)
2. Open Jaeger UI: http://localhost:16686
3. Select service `vista-evolved-api` and click **Find Traces**
4. You should see HTTP spans with nested RPC spans

### 2d. Verify metrics

1. Open http://localhost:3001/metrics/prometheus in a browser
2. You should see Prometheus exposition format with counters and histograms
3. Open Prometheus UI: http://localhost:9090
4. Query `vista_evolved_http_request_duration_seconds_bucket` -- should return series data

---

## 3. Key Metrics

### HTTP Metrics

| Metric                          | Type      | Labels                     | Description        |
| ------------------------------- | --------- | -------------------------- | ------------------ |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency    |
| `http_requests_total`           | Counter   | method, route, status_code | Total requests     |
| `http_active_requests`          | Gauge     | --                         | In-flight requests |

### RPC Metrics

| Metric                        | Type      | Labels            | Description                   |
| ----------------------------- | --------- | ----------------- | ----------------------------- |
| `rpc_call_duration_seconds`   | Histogram | rpc_name, outcome | VistA RPC latency             |
| `rpc_calls_total`             | Counter   | rpc_name, outcome | Total RPC calls               |
| `circuit_breaker_state`       | Gauge     | --                | 0=closed, 1=open, 2=half-open |
| `circuit_breaker_trips_total` | Counter   | --                | Times CB opened               |

### System Metrics

Collected automatically by `prom-client`:

- `process_cpu_seconds_total`
- `nodejs_heap_size_total_bytes`
- `nodejs_active_handles_total`
- `nodejs_eventloop_lag_seconds`

---

## 4. PHI Safety

PHI is stripped at multiple layers:

1. **OTel Collector** -- `attributes/strip-phi` processor removes:
   - `rpc.request.body`, `rpc.response.body`
   - `http.request.body`, `http.response.body`
   - `db.statement`
   - `patient.*`
   - `user.password`, `user.accessCode`, `user.verifyCode`

2. **API instrumentation** -- HTTP auto-instrumentation has empty
   `requestHook` / `responseHook` (never captures bodies).

3. **Metric labels** -- `sanitizeRoute()` replaces UUIDs and numeric
   path segments with `:id` to prevent cardinality explosion.

4. **RPC spans** -- Only record `rpc.method` (name) and `enduser.id`
   (DUZ), never request or response payloads.

---

## 5. Reliability Improvements

### Graceful shutdown drain timeout

The API now waits up to 30 seconds for in-flight requests to complete
before forcing exit. Configurable via `SHUTDOWN_DRAIN_TIMEOUT_MS`.

### Circuit breaker in health endpoints

- `GET /health` includes `circuitBreaker` state and `tracingEnabled` flag
- `GET /ready` includes `circuitBreaker` state; returns `ok: false` when
  the circuit breaker is open (prevents routing traffic to a failing instance)

### Trace correlation

Every log entry now includes `traceId` and `spanId` fields when OTel
is enabled. The `X-Trace-Id` response header is set on all responses.

---

## 6. k6 Smoke Tests

### Install k6

```powershell
# Windows (winget)
winget install grafana.k6

# macOS (brew)
brew install k6
```

### Run all smoke tests

```powershell
.\tests\k6\run-smoke.ps1
```

### Run individual suites

```powershell
.\tests\k6\run-smoke.ps1 -Suite login   # auth flow
.\tests\k6\run-smoke.ps1 -Suite reads   # read-only clinical endpoints
.\tests\k6\run-smoke.ps1 -Suite write   # write attempt (add allergy)
```

### Test descriptions

| File             | VUs | Duration | What it tests                                   |
| ---------------- | --- | -------- | ----------------------------------------------- |
| `smoke-login.js` | 2   | 30s      | Health, login, session, logout                  |
| `smoke-reads.js` | 2   | 30s      | Patient search, demographics, allergies, vitals |
| `smoke-write.js` | 1   | 3 iters  | Add allergy (may fail on sandbox)               |

---

## 7. SLO-Ready Health Checks

The `/health` and `/ready` endpoints now emit sufficient data for
Kubernetes-style liveness/readiness probes:

```yaml
# Example K8s probe config
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3
```

When the circuit breaker is open, `/ready` returns `{ ok: false }`,
which causes the load balancer to stop routing traffic to that pod.

---

## 8. Environment Variables (Phase 36)

| Variable                      | Default                 | Description                           |
| ----------------------------- | ----------------------- | ------------------------------------- |
| `OTEL_ENABLED`                | `false`                 | Enable OpenTelemetry traces + metrics |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel Collector endpoint               |
| `OTEL_SERVICE_NAME`           | `vista-evolved-api`     | Service name in traces                |
| `SHUTDOWN_DRAIN_TIMEOUT_MS`   | `30000`                 | Drain timeout before forced exit      |

---

## 9. Troubleshooting

### No traces in Jaeger

1. Check `OTEL_ENABLED=true` is set
2. Check OTel Collector is running: `docker ps | grep otel`
3. Check collector health: `curl http://localhost:13133`
4. Check API logs for OTel initialization messages

### No metrics in Prometheus

1. Verify `/metrics/prometheus` returns data: `curl http://localhost:3001/metrics/prometheus`
2. Check Prometheus targets: http://localhost:9090/targets
3. If target shows DOWN, verify host networking (use `host.docker.internal` on Docker Desktop)

### k6 tests fail

1. Ensure the API is running: `curl http://localhost:3001/health`
2. Ensure VistA Docker is running: `docker ps | grep worldvista`
3. Check k6 is installed: `k6 version`
4. For write test failures, check VistA sandbox limitations (expected)
