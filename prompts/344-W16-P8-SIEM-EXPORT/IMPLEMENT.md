# Phase 344 — W16-P8: Security Monitoring + SIEM Export

## Goal

SiemSink interface with multi-transport (webhook/syslog/S3/OTLP), alert rules, PHI redaction

## Files to Create

- `apps/api/src/auth/siem-sink.ts` — SiemSink interface + transports
- `apps/api/src/auth/security-alerts.ts` — Alert rule engine
- `apps/api/src/routes/siem-routes.ts` — SIEM management endpoints

## Files to Edit

- `apps/api/src/middleware/security.ts` — AUTH_RULES
