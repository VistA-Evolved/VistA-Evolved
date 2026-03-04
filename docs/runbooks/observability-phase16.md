# Observability — Phase 16

> Request tracing, structured logging, metrics, and audit events.

## Request Correlation IDs

Every API request gets a unique `X-Request-Id` header (UUID v4).

- **Generated in:** `apps/api/src/middleware/security.ts` (onRequest hook)
- **Returned to client:** via `X-Request-Id` response header
- **Available in logs:** via `AsyncLocalStorage` → `log.info("msg", { ... })` automatically includes `requestId`
- **Web→API→RPC chain:** The web client can pass `X-Request-Id` on API calls; if missing, the server generates one

## Structured Logging

**Logger:** `apps/api/src/lib/logger.ts`

- Outputs JSON by default (`LOG_FORMAT=json`), or `LOG_FORMAT=text` for dev
- Levels: trace → debug → info → warn → error → fatal
- Set via `LOG_LEVEL` env var
- **Automatic redaction:** credentials, tokens, SSN patterns, file paths, session tokens
- **Never logs:** raw request bodies containing PHI (note text, problem text, DOB, SSN)

### Log Schema (JSON mode)

```json
{
  "level": "info",
  "ts": "2026-02-17T12:00:00.000Z",
  "msg": "Request completed",
  "requestId": "abc-123",
  "method": "GET",
  "url": "/vista/allergies?dfn=100022",
  "status": 200,
  "durationMs": 45
}
```

## Metrics Endpoint

**`GET /metrics`** — no auth required (for monitoring systems)

Returns:

```json
{
  "ok": true,
  "timestamp": "...",
  "uptime": 3600,
  "process": {
    "heapUsedMB": 42.5,
    "heapTotalMB": 64.0,
    "rssMB": 80.1,
    "pid": 1234
  },
  "rpcHealth": {
    "circuitBreaker": { "state": "closed", "failures": 0 },
    "cache": { "entries": 15, "hits": 230, "misses": 45 },
    "perRpc": {
      "ORWPT LIST ALL": { "calls": 50, "successes": 49, "failures": 1, "avgDurationMs": 35 }
    }
  }
}
```

### Key Metrics

| Metric                | Location                                  | Description                    |
| --------------------- | ----------------------------------------- | ------------------------------ |
| Circuit breaker state | `rpcHealth.circuitBreaker.state`          | closed/open/half-open          |
| Cache hit rate        | `rpcHealth.cache.hits / (hits + misses)`  | RPC result cache effectiveness |
| RPC call count        | `rpcHealth.perRpc[name].calls`            | Total calls per RPC name       |
| RPC error rate        | `rpcHealth.perRpc[name].failures / calls` | Error rate per RPC             |
| RPC latency           | `rpcHealth.perRpc[name].avgDurationMs`    | Average latency per RPC        |
| Memory usage          | `process.heapUsedMB`                      | V8 heap usage                  |

## Audit Events

**Module:** `apps/api/src/lib/audit.ts`

### Event Actions (63+ types)

| Category     | Actions                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Auth**     | login.success, login.failure, logout                                                                                 |
| **Patient**  | patient.select, patient.search                                                                                       |
| **Clinical** | allergies.view, allergies.add, vitals.view, vitals.add, notes.view, notes.create, meds.view, meds.add, problems.view |
| **Admin**    | admin.circuit-breaker-reset, admin.cache-invalidate                                                                  |
| **Security** | security.rate-limited, security.origin-rejected, security.rbac-denied                                                |
| **System**   | system.startup, system.shutdown                                                                                      |

### Audit Sinks

| Sink     | Env `AUDIT_SINK` | Description                                       |
| -------- | ---------------- | ------------------------------------------------- |
| `memory` | Default          | In-process array with eviction (max 5000 entries) |
| `file`   | Production       | Append to JSONL file (`AUDIT_FILE_PATH`)          |
| `stdout` | Container        | JSON to stdout (for log aggregators)              |

### Query API

- `GET /audit/events?actionPrefix=login&limit=50` — filter audit events
- `GET /audit/stats` — aggregate stats (events per action, per hour)

### PHI Rules

- Patient DFN is included in audit events (for traceability)
- Patient name, SSN, DOB, note text are **never** included in audit
- Configured in `PHI_CONFIG` in `apps/api/src/config/server-config.ts`

## Degraded Mode Banner (Web)

The web frontend shows a banner when:

- API is unreachable (red banner)
- VistA is unreachable (yellow banner, "degraded mode")

Polls `GET /ready` every 30 seconds. When degraded:

- Write actions are blocked/warned

**Component:** `apps/web/src/components/cprs/DegradedBanner.tsx`

## Dashboard Setup (External)

For production monitoring, export metrics to your preferred system:

1. **Prometheus:** Scrape `/metrics` endpoint at regular intervals
2. **Grafana:** Create dashboards for RPC latency, circuit breaker state, error rates
3. **Log aggregator:** Set `AUDIT_SINK=stdout` and pipe Docker logs to ELK/Loki/Datadog
4. **Alerting:** Alert on circuit breaker state = open, error rate > threshold, or memory > limit
