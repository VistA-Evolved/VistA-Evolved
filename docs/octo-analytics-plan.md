# Octo Analytics Plan — Platform Telemetry Architecture

> **Phase 20 — VistA-First Grounding**
> "Octo" is the platform's analytics / telemetry subsystem. It tracks
> **operational metrics** (API latency, RPC success rates, circuit breaker
> trips, user sessions) — NOT clinical data. Clinical data stays in VistA.

---

## 1. What Octo Is

Octo is the analytics engine for **platform operations**:

- **API performance**: request latency, error rates, throughput
- **VistA RPC health**: call success/failure, circuit breaker state, cache hits
- **User activity**: session counts, page views, feature usage (no PHI)
- **Integration health**: connector status, queue depth, error rates
- **Export/audit volume**: export job counts, audit event throughput

### What Octo is NOT

- NOT a clinical analytics system (no patient outcomes, quality measures)
- NOT a population health platform (those are VistA-side or external)
- NOT a replacement for VistA's built-in statistics (GMTS, ACRP, DSS)
- NOT a data warehouse (it summarizes, not stores, raw clinical data)

---

## 2. Current State

Phase 19 built the reporting endpoints that serve as Octo's first data layer:

| Endpoint | What It Provides |
|----------|-----------------|
| `GET /reports/operations` | RPC health stats, circuit breaker state, memory/uptime |
| `GET /reports/integrations` | Integration registry health summary, queue metrics |
| `GET /reports/audit` | Audit event counts by type, filtered event list |
| `GET /reports/clinical-activity` | Counts of clinical actions (no PHI) |

These are **in-memory, request-time** computations. No persistent time-series
storage exists yet.

---

## 3. Architecture Plan

```
┌────────────────────────────────────────────────────────────┐
│  Octo Analytics Engine                                     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Metrics      │  │ Time-Series  │  │ Dashboard    │    │
│  │ Collector    │  │ Store        │  │ API          │    │
│  │              │  │              │  │              │    │
│  │ - API hooks  │  │ - SQLite/    │  │ - /reports/* │    │
│  │ - RPC hooks  │  │   DuckDB     │  │ - WebSocket  │    │
│  │ - Audit taps │  │ - Rollups    │  │   live feed  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         └─────────────────┴─────────────────┘             │
│                           │                               │
│  ┌────────────────────────▼─────────────────────────────┐ │
│  │ Data Sources                                          │ │
│  │                                                       │ │
│  │  Platform:    API latency, errors, sessions           │ │
│  │  VistA RPC:   call counts, latency, failures          │ │
│  │  Integrations: connector health, queue depth          │ │
│  │  Audit:       event counts, user actions              │ │
│  │  Security:    auth failures, rate limit hits          │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Metrics Catalog

### 4.1 API Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `api.request.count` | Counter | Total HTTP requests |
| `api.request.latency` | Histogram | Request duration (ms) |
| `api.request.error` | Counter | 4xx/5xx responses |
| `api.request.by_route` | Counter | Requests per route |
| `api.session.active` | Gauge | Currently active sessions |

### 4.2 VistA RPC Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `rpc.call.count` | Counter | Total RPC calls |
| `rpc.call.latency` | Histogram | RPC round-trip time (ms) |
| `rpc.call.error` | Counter | Failed RPC calls |
| `rpc.call.by_name` | Counter | Calls per RPC name |
| `rpc.circuit.state` | Gauge | Circuit breaker state (0=closed, 1=open, 2=half) |
| `rpc.cache.hit` | Counter | RPC cache hits |
| `rpc.cache.miss` | Counter | RPC cache misses |

### 4.3 Integration Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `integration.probe.success` | Counter | Successful connectivity probes |
| `integration.probe.failure` | Counter | Failed probes |
| `integration.queue.pending` | Gauge | Pending items in integration queues |
| `integration.queue.errors` | Counter | Queue processing errors |
| `integration.queue.latency` | Histogram | Queue processing time |

### 4.4 Security Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `auth.login.success` | Counter | Successful logins |
| `auth.login.failure` | Counter | Failed login attempts |
| `auth.ratelimit.hit` | Counter | Rate limit violations |
| `auth.session.create` | Counter | New sessions created |
| `auth.session.expire` | Counter | Sessions expired |

---

## 5. Time-Series Storage Strategy

### Phase A: In-Memory (Current)

- All /reports/ endpoints compute metrics on request
- No persistence — metrics reset on server restart
- Suitable for development and single-instance

### Phase B: Embedded Storage

- **SQLite** or **DuckDB** for lightweight time-series
- Rollup tables: 1-minute, 5-minute, 1-hour, 1-day granularity
- Automatic pruning (keep 7 days of minute data, 90 days of hourly)
- File-based — no external database required

### Phase C: External (Production)

- **TimescaleDB** (PostgreSQL extension) for production scale
- **Prometheus** + **Grafana** for standard observability
- OpenTelemetry export for traces and metrics
- Cloud-native options: CloudWatch, Datadog, etc.

---

## 6. VistA Boundary

Octo explicitly does NOT:
- Read VistA clinical data for analytics
- Build clinical dashboards from VistA FileMan data
- Replace VistA reporting (GMTS, ACRP, DSS Extract, VSSC)
- Store any PHI (all metrics are aggregate counts / timings)

Clinical analytics (quality measures, population health, outcomes tracking)
are a **separate concern** that would use VistA's existing reporting
infrastructure or external clinical data warehouses.

---

## 7. Implementation Roadmap

| Step | Description | Priority | Phase |
|------|-------------|----------|-------|
| 1 | Document Octo architecture (this doc) | **Done** | Phase 20 |
| 2 | Add metrics collection hooks to Fastify | MEDIUM | Phase 21+ |
| 3 | Add RPC call instrumentation | MEDIUM | Phase 21+ |
| 4 | Embed SQLite/DuckDB for time-series | LOW | Phase 22+ |
| 5 | Build admin dashboard widgets for Octo | LOW | Phase 22+ |
| 6 | Add OpenTelemetry export | LOW | Phase 23+ |
| 7 | WebSocket live metrics feed | LOW | Phase 23+ |
