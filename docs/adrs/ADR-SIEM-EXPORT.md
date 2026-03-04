# ADR: SIEM Export

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** 337 (Wave 16 P1)  
**Deciders:** Architecture team

## Context

VistA-Evolved has extensive audit infrastructure:

- `lib/immutable-audit.ts` — SHA-256 hash-chained general audit (ring buffer + JSONL)
- `audit-shipping/` — S3/MinIO audit shipper (Phase 157)
- `services/imaging-audit.ts` — Imaging-specific audit chain
- `rcm/audit/rcm-audit.ts` — RCM-specific audit chain
- OTel tracing (Phase 36) — spans exported to Jaeger/OTLP collector
- Prometheus metrics — `/metrics/prometheus` endpoint

Missing: real-time security event streaming to enterprise SIEM systems
(Splunk, Sentinel, QRadar, Elastic SIEM) with:

- Structured security events (auth failures, break-glass, exports, anomalies)
- PHI-safe redaction before export
- Alert rules for anomaly detection
- Multi-sink support (different tenants → different SIEM endpoints)

## Decision

**Multi-sink streaming adapter** with pluggable transports (webhook, syslog,
S3 archive, OTLP logs) and built-in alert rules.

Rationale:

- Extends existing audit infrastructure (not a replacement)
- PHI redaction already proven in `phi-redaction.ts`
- Multi-sink allows tenant-specific SIEM routing
- Alert rules are in-process (no external alerting dependency)
- OTLP log export reuses existing OTel infrastructure
- Zero new npm dependencies (Node.js crypto + net suffice)

## Alternatives Considered

### Option A: Syslog (RFC 5424) Only

- **Pros:** Universal SIEM support, simple protocol, well-understood
- **Cons:** UDP unreliable, TCP syslog not standard everywhere, no structured
  data beyond STRUCTURED-DATA field, hard to batch
- **Partially adopted:** Syslog is one transport option

### Option B: Webhook (HTTPS POST) Only

- **Pros:** Simple, works with any SIEM that accepts webhooks (most do),
  structured JSON payloads, TLS built-in
- **Cons:** Requires SIEM webhook endpoint, no standard payload format,
  needs retry/backpressure logic
- **Partially adopted:** Webhook is one transport option

### Option C: S3 Archive Only

- **Pros:** Already implemented (audit-shipping Phase 157), reliable,
  batch-friendly, cost-effective
- **Cons:** Not real-time (5-minute batches), SIEM must pull from S3,
  higher latency for security alerts
- **Partially adopted:** S3 is one transport option (using existing shipper)

### Option D: OpenTelemetry Logs

- **Pros:** Integrates with existing OTel infrastructure, standard protocol,
  collector handles routing/batching/retry
- **Cons:** OTel log specification is newer, not all SIEMs support OTLP logs
  natively yet
- **Partially adopted:** OTLP logs is one transport option

### Option E: Multi-Sink Streaming (CHOSEN)

- **Pros:** All of the above as pluggable transports, tenant-specific routing,
  unified PHI redaction, in-process alert rules
- **Cons:** More code to maintain, multiple transport implementations
- **Selected:** Most flexible, adapts to each enterprise customer's SIEM

## Implementation Plan

1. Define `SiemSink` interface: `emit(event)`, `flush()`, `healthCheck()`
2. Transport implementations:
   - `WebhookSink` — HTTPS POST with retry + backpressure
   - `SyslogSink` — RFC 5424 over TCP/TLS
   - `S3Sink` — delegates to existing audit shipper
   - `OtlpLogSink` — OTLP log exporter
   - `ConsoleSink` — dev/test (structured JSON to stdout)
3. `SecurityEventStream` — processes audit events, applies alert rules, routes to sinks
4. Alert rules engine:
   - Repeated auth failures (>5 in 5min for same user)
   - Export spikes (>10 exports in 1min for same tenant)
   - Break-glass frequency (>3 in 1hour for same user)
   - Cross-tenant attempt (always alert, should be zero)
5. Tenant-specific sink configuration (PG table)
6. PHI redaction applied before any sink emission

## Operational Notes

- Sink health status available via `/posture/siem` endpoint
- Failed emissions queued in memory (ring buffer, max 10K) with retry
- Alert cooldown prevents duplicate alerts (configurable, default 15min)
- All sink configurations are admin-only
- Webhook endpoints validated on creation (OPTIONS/HEAD probe)

## Rollback Plan

1. Disable SIEM export: `SIEM_ENABLED=false` (sinks stop emitting)
2. Existing audit trail unaffected (SIEM is read-only consumer)
3. Alert rules can be disabled individually per tenant
4. Sink configurations can be deleted without data loss
5. If webhook sink causes backpressure: circuit breaker auto-opens after 5 failures
