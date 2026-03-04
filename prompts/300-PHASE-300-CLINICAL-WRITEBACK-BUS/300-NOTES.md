# Phase 300 — Notes

## Design Decisions

### Command Bus vs Direct RPC

- Chose a command bus pattern over direct RPC calls for:
  - Unified idempotency (one mechanism, not per-route)
  - Unified safety gates (global + per-domain + dry-run)
  - Unified audit trail (every write attempt recorded)
  - Retry with error classification (transient vs permanent)
  - Domain executor adapters (plug-in per domain, registered later)

### In-Memory + PG Dual Store

- Follows the established pattern from `middleware/idempotency.ts`
- In-memory Map for fast access, PG tables for durability
- PG migration v30 creates the tables; wiring to be completed in later phases

### Safety Defaults

- WRITEBACK_ENABLED=false: nothing writes to VistA until explicitly enabled
- WRITEBACK_DRYRUN=true: even when enabled, defaults to recording transcript
- Per-domain gates: each domain (TIU, ORDERS, etc.) has its own env var
- No raw DFN stored: only SHA-256 hash prefix (16 chars)

### Adapter Pattern (`RpcExecutor`)

- Each domain registers its own executor via `registerExecutor(domain, executor)`
- Executors implement `execute()` (real RPC) and `dryRun()` (transcript only)
- This will be wired in Phases 301-306 (one per domain)

## Evidence

- PG migration v30 creates 3 tables with proper indexes and RLS
- 6 audit actions cover the full writeback lifecycle
- 5 store entries registered in store-policy
- Routes registered in register-routes.ts

## Bugs Found: None

## Follow-ups

- Phase 301+: Wire domain-specific executors for TIU, Orders, Pharmacy, Labs, ADT, Imaging
- Future: PG-backed command store (wire repo, read-through cache)
- Future: Background worker loop for processing pending commands
