# Observability Runbook — Phase 48

## Overview

VistA-Evolved uses a three-pillar observability stack:

1. **Structured Logging** — JSON logs with PHI redaction, request correlation IDs, and OTel trace/span IDs
2. **Prometheus Metrics** — 20+ metrics covering HTTP, VistA RPC, circuit breakers, RCM connectors, EDI pipeline, and audit stores
3. **Distributed Tracing** — OpenTelemetry spans for HTTP requests, VistA RPC calls, and RCM connector operations

## Architecture

```
Browser/Portal --> Fastify API --> VistA RPC Broker (port 9430)
                       |               ^
                       |               | trace context propagated
                       v               |
                  RCM Connectors --> Payer/Clearinghouse endpoints
                       |
                       v
              [Audit Stores x3]
                       |
     +-----------------+-----------------+
     |                 |                 |
  Immutable        Imaging            RCM
  (general)      (DICOM ops)      (claims/EDI)
```

## Logging

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level: trace, debug, info, warn, error, fatal |
| `LOG_JSON` | `true` | JSON structured output (disable for dev readability) |
| `VISTA_DEBUG` | `false` | Enable RPC broker debug-level hex dumps |

### PHI Redaction

All log output passes through the centralized PHI redaction engine (`phi-redaction.ts`).

**Blocked field categories:**
- **Credential fields** (17): accessCode, verifyCode, password, secret, token, sessionToken, avPlain, access_code, verify_code, authorization, cookie, set-cookie, x-service-key, api_key, apikey
- **PHI fields** (24): ssn, socialSecurityNumber, dob, dateOfBirth, noteText, noteContent, problemText, patientName, memberName, subscriberName, memberId, subscriberId, insuranceId, policyId, medicareNum, medicaidNum, address, streetAddress, phoneNumber, phone, email, emailAddress, etc.

**Inline patterns scrubbed:**
- Access;Verify code pairs
- Bearer tokens (20+ chars)
- 64-char hex session tokens
- SSN (XXX-XX-XXXX)
- DOB (YYYY-MM-DD, MM/DD/YYYY)
- VistA-format names (LASTNAME,FIRSTNAME)

### Request Correlation

Every HTTP request gets a UUID correlation ID via `AsyncLocalStorage`. This ID appears in:
- Every log entry as `requestId`
- OTel spans as attributes
- Audit entries

### CI Lint Gate

Run `npx tsx scripts/check-phi-fields.ts` to scan source for log calls that pass blocked field names as object keys.

## Metrics

### Endpoint

```
GET /metrics/prometheus
```

Returns Prometheus text exposition format. No authentication required (in `AUTH_RULES` bypass list).

### Available Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | HTTP request latency |
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_active_requests` | Gauge | — | In-flight requests |
| `vista_rpc_call_duration_seconds` | Histogram | rpc_name, outcome | VistA RPC latency |
| `vista_rpc_calls_total` | Counter | rpc_name, outcome | Total RPC calls |
| `vista_circuit_breaker_state` | Gauge | — | CB state (0/1/2) |
| `vista_circuit_breaker_trips_total` | Counter | — | CB trip count |
| `vista_errors_total` | Counter | category | Error count |
| `vista_active_sessions` | Gauge | — | Active sessions |
| `vista_rpc_cache_size` | Gauge | — | RPC cache entries |
| `vista_immutable_audit_chain_length` | Gauge | — | Audit chain size |
| `rcm_claims_total` | Gauge | status | Claims by lifecycle status |
| `rcm_pipeline_depth` | Gauge | stage | EDI pipeline depth |
| `rcm_connector_call_duration_seconds` | Histogram | connector_id, operation | Connector latency |
| `rcm_connector_calls_total` | Counter | connector_id, operation, outcome | Connector call count |
| `rcm_connector_health` | Gauge | connector_id | Connector health (1/0) |
| `unified_audit_entries_total` | Gauge | source | Audit entries per store |

### Route Sanitization

All route labels pass through `sanitizeRoute()`:
- Query strings stripped
- UUIDs replaced with `:id`
- Numeric path segments replaced with `:id`

This prevents Prometheus label cardinality explosion.

## Distributed Tracing

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OTel SDK |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector endpoint |
| `OTEL_SERVICE_NAME` | `vista-evolved-api` | Service name in traces |

### Trace Propagation

1. HTTP requests: auto-instrumented via `@opentelemetry/instrumentation-http`
2. VistA RPC calls: manual spans via `startRpcSpan()`/`endRpcSpan()`
3. RCM connector calls: instrumented via `connector-resilience.ts`
4. Response header: `X-Trace-Id` added to all HTTP responses

### PHI Safety

- OTel collector config strips request/response bodies
- API-side instrumentation avoids capturing bodies
- Patient.* attributes stripped by collector processor

## Unified Audit

### Endpoints

```
GET /audit/unified?sources=general,imaging,rcm&limit=100&since=2025-01-01T00:00:00Z
GET /audit/unified/stats
```

### Three Audit Stores

| Store | Location | Max Entries | Eviction |
|-------|----------|-------------|----------|
| Immutable (general) | `immutable-audit.ts` | 10,000 | Ring buffer |
| Imaging | `imaging-audit.ts` | 10,000 | Ring buffer |
| RCM | `rcm-audit.ts` | 20,000 | FIFO splice |

All stores are hash-chained (SHA-256) with tamper detection.

## Connector Circuit Breakers

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `RCM_CB_THRESHOLD` | `5` | Failures before open |
| `RCM_CB_RESET_MS` | `60000` | Open duration before half-open |
| `RCM_CONNECTOR_RETRIES` | `2` | Max retries per call |
| `RCM_CONNECTOR_RETRY_DELAY_MS` | `2000` | Base retry delay (exponential backoff) |

### Admin Endpoints

```
GET  /admin/connector-cbs           -- View all connector CB states
POST /admin/connector-cb/reset      -- Reset specific or all CBs
     Body: { "connectorId": "clearinghouse" }  (omit for reset-all)
```

## Alerting Recommendations

| Alert | Condition | Severity |
|-------|-----------|----------|
| VistA CB Open | `vista_circuit_breaker_state == 1` for 2m | Critical |
| Connector Down | `rcm_connector_health == 0` for 5m | High |
| High Error Rate | `rate(vista_errors_total[5m]) > 10` | High |
| Audit Chain Broken | `/audit/unified/stats` chainValid=false | Critical |
| Pipeline Backlog | `rcm_pipeline_depth{stage="enqueue"} > 100` | Medium |
