# Phase 261 — Payer Adapters at Scale — NOTES

## Key Design Decisions

### Two-Layer Architecture Preserved

The existing architecture has two layers:

- **Layer 1 (Connectors):** Transport abstraction (RcmConnector interface) with 14 files
- **Layer 2 (Adapters):** Business logic (PayerAdapter interface) with 4 files

Phase 261 adds a third concern layer (SDK) that provides cross-cutting
infrastructure (rate limiting, idempotency, metrics) without modifying either
existing layer.

### BasePayerAdapter is Opt-In

The abstract class is available for new adapters but does NOT require existing
adapters (sandbox, x12, philhealth) to be refactored. They can adopt it
incrementally or not at all.

### Rate Limiting Strategy

Per-tenant per-hour windows match real payer API rate limits (most payers
enforce hourly or daily caps). The limiter tracks windows in memory with
automatic expiry.

### Idempotency Strategy

SHA-256 hash of (adapterId + operation + serialized payload) ensures the same
submission is not sent twice. 24-hour TTL with FIFO eviction at 10K entries.
Matches the existing idempotency patterns in middleware/idempotency.ts but
scoped to payer operations specifically.

### Sandbox Test Harness

7 pre-built test cases cover the core adapter operations: eligibility (active

- inactive), claim submission (professional + institutional), status check,
  denial appeal, and rate limit burst. The harness runs against the sandbox
  adapter in-process -- no external dependencies.

## Gotchas

- Existing `payer-adapter.ts` defines the PayerAdapter interface -- DO NOT
  modify it. BasePayerAdapter implements a superset.
- Connector resilience (circuit breaker, retry, timeout) remains in
  `connector-resilience.ts` -- the SDK does not duplicate it.
- Rate limit state is in-memory and resets on API restart.
