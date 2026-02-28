# VistA-Evolved Performance Tuning Guide
#
# This document maps all tunable performance knobs with their env vars,
# defaults, and recommended values for dev/staging/production profiles.

## PostgreSQL Connection Pool

| Env Var | Default | Staging | Production | Notes |
|---------|---------|---------|------------|-------|
| `PLATFORM_PG_POOL_MIN` | 2 | 5 | 10 | Minimum idle connections |
| `PLATFORM_PG_POOL_MAX` | 10 | 20 | 30 | Max pool size per API pod |
| `PLATFORM_PG_STATEMENT_TIMEOUT_MS` | 30000 | 15000 | 10000 | Kill slow queries |
| `PLATFORM_PG_IDLE_TX_TIMEOUT_MS` | 10000 | 5000 | 5000 | Kill idle-in-transaction |

### Sizing Formula
- **Max connections per pod**: 30 (prod recommended)
- **Total PG connections** = pods x max_pool = 3 pods x 30 = 90
- PostgreSQL `max_connections` should be >= total + 10 (superuser reserve)
- Set `max_connections = 110` minimum for 3-pod production deployment

## VistA RPC Broker

| Env Var | Default | Staging | Production | Notes |
|---------|---------|---------|------------|-------|
| `RPC_CALL_TIMEOUT_MS` | 15000 | 10000 | 10000 | Per-RPC timeout |
| `RPC_CONNECT_TIMEOUT_MS` | 10000 | 5000 | 5000 | TCP connect timeout |
| `RPC_CB_THRESHOLD` | 5 | 5 | 3 | Failures before circuit opens |
| `RPC_CB_RESET_MS` | 30000 | 30000 | 60000 | Half-open retry window |
| `RPC_MAX_RETRIES` | 2 | 2 | 1 | Retries on idempotent reads |
| `RPC_RETRY_DELAY_MS` | 1000 | 1000 | 2000 | Backoff base delay |

### Architecture Note
RPC calls are serialized through a single-socket async mutex (`withBrokerLock`).
Effective concurrency = 1 per API pod. For higher throughput:
- Scale API pods horizontally (each pod gets its own VistA socket)
- Use HPA targeting CPU or custom RPC queue depth metric

## OTel Tracing

| Env Var | Default | Staging | Production | Notes |
|---------|---------|---------|------------|-------|
| `OTEL_ENABLED` | false | true | true | Master switch |
| `OTEL_TRACES_SAMPLER` | AlwaysOn | parentbased_traceidratio | parentbased_traceidratio | SDK env var |
| `OTEL_TRACES_SAMPLER_ARG` | 1.0 | 0.1 | 0.01 | 10% staging, 1% prod |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | localhost:4318 | collector:4318 | collector:4318 | OTel Collector |
| `OTEL_DEV_CONSOLE` | false | false | false | Console span exporter |

### Sampling Strategy
- **Dev**: AlwaysOn (100%) for debugging
- **Staging**: 10% (`parentbased_traceidratio` with arg `0.1`)
- **Production**: 1% (`parentbased_traceidratio` with arg `0.01`)
- Error spans are always sampled (OTel default behavior with parent-based)

Note: The OTel Node SDK respects `OTEL_TRACES_SAMPLER` and
`OTEL_TRACES_SAMPLER_ARG` as standard environment variables -- no code change
needed. Just set them in the Helm values or .env.local.

## Rate Limiting

| Env Var | Default | Notes |
|---------|---------|-------|
| `DICOMWEB_RATE_LIMIT` | 120 | DICOMweb requests per window |
| `DICOMWEB_RATE_WINDOW_MS` | 60000 | Window duration |

## Background Jobs

| Env Var | Default | Notes |
|---------|---------|-------|
| `ANALYTICS_AGGREGATION_INTERVAL_MS` | 3600000 | Aggregation job interval |
| `AUDIT_SHIP_INTERVAL_MS` | 300000 | Audit shipping interval |
| `TELEHEALTH_ROOM_TTL_MS` | 14400000 | Room auto-expiry (4h) |
| `JOB_BACKPRESSURE_MAX_PENDING` | 1000 | Max pending jobs before backpressure blocks new work |
| `JOB_BACKPRESSURE_MAX_PER_TASK` | 200 | Max pending per task type |
| `JOB_WORKER_SCHEMA` | graphile_worker | Graphile Worker PG schema name |

## FHIR Cache

| Env Var | Default | Notes |
|---------|---------|-------|
| `FHIR_CACHE_ENABLED` | true | Master switch for FHIR response cache |
| `FHIR_CACHE_TTL_MS` | 30000 | Cache entry time-to-live |
| `FHIR_CACHE_MAX_ENTRIES` | 500 | Max cached responses before eviction |

## VistA Capability Cache

| Env Var | Default | Notes |
|---------|---------|-------|
| `VISTA_CAPABILITY_TTL_MS` | 300000 | RPC capability probe cache (5 min) |
| `CLINICAL_REPORT_CACHE_TTL_MS` | 30000 | ORWRP REPORT TEXT result cache |

## Graceful Shutdown

| Env Var | Default | Notes |
|---------|---------|-------|
| `SHUTDOWN_DRAIN_TIMEOUT_MS` | 30000 | Drain timeout before forced close |
