# Phase 344 Notes
- SiemSink is a strategy interface like KeyProvider
- Transports: webhook (HTTP POST), syslog (RFC 5424), s3-jsonl, otlp-logs
- Alert rules: brute-force (N failures in M sec), privilege escalation, break-glass, data exfil
- PHI redaction reuses lib/phi-redaction.ts pipeline
- Event buffer with configurable flush interval
