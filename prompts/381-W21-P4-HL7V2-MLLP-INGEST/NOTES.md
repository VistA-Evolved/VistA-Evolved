# Phase 381 — W21-P4 NOTES

## Design Decisions
- MLLP is handled as buffer extraction, not a TCP server; the edge gateway
  sidecar owns the TCP socket and POSTs parsed/raw HL7 via HTTP.
- Parser treats all HL7 v2 as pipe-delimited by default but reads MSH-1 and
  MSH-2 for per-message overrides (configurable separators).
- OBX segment parsing indexes are zero-based from field array after the
  segment name: OBX.0=setId, OBX.2=valueType, OBX.3=observationId, etc.
- Five fixtures cover the usual CPOE use cases: CBC, vitals, ABG, single
  critical value with abnormal flag, and an ORM order message.
- Ingest log uses 1000-entry FIFO — no persistence needed.
