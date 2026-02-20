# Transaction Correctness Engine -- Overview

> Phase 45 -- VistA-Evolved RCM

## Purpose

The Transaction Correctness Engine ensures that every EDI transaction
flowing through VistA-Evolved is structurally valid, properly enveloped,
tracked through its lifecycle, and reconciled against acknowledgements,
status responses, and remittance advice.

## Architecture

```
                  +---------------------+
                  |  Canonical Domain   |
                  |  (Claim, Eligibility|
                  |   Status Inquiry)   |
                  +------+---------+----+
                         |         |
              validate() |         | buildX12()
                         v         v
                  +---------------------+
                  |   Translator        |
                  |  (Local Scaffold    |
                  |   or External)      |
                  +------+---------+----+
                         |         |
                         v         v
                  +---------------------+
                  |  Envelope Builder   |
                  |  ISA/GS/ST/SE/GE   |
                  |  /IEA Control Nums  |
                  +------+---------+----+
                         |
          pre-transmit   |
          gates -------->|
                         v
                  +---------------------+
                  |  Connector Layer    |
                  |  (Clearinghouse,    |
                  |   PhilHealth, etc.) |
                  +---------------------+
                         |
                         v
                  +---------------------+
                  |  Ack/Status/ERA     |
                  |  Processing         |
                  +------+---------+----+
                         |
                         v
                  +---------------------+
                  |  Reconciliation     |
                  +---------------------+
```

## Key Components

### Transaction Envelopes (`types.ts`, `envelope.ts`)
- `TransactionEnvelope` wraps ISA/GS metadata, control numbers, correlation IDs
- Auto-generated monotonic control numbers per sender/receiver pair
- Idempotency keys prevent duplicate submissions
- In-memory store with correlation and source indexes

### Translator Strategy (`translator.ts`)
- Pluggable translator interface with registry
- **Local Scaffold**: Built-in, always available, delegates to existing
  `serialize837`/`serialize270` + custom scaffolds for 276/999
- **External Adapter**: Feature-flagged (`EXTERNAL_TRANSLATOR_ENABLED`),
  scaffold for clearinghouse-grade translator services

### Connectivity Rules (`connectivity.ts`)
- CAQH CORE operating rule references (numbers only, no copyrighted text)
- Pre-transmit gates: 6 checks before any transaction leaves the system
- Ack gates: 999/277CA timeout tracking
- Retry policy: exponential backoff, configurable max retries
- DLQ: dead-letter queue for unrecoverable failures

### Reconciliation (`reconciliation.ts`)
- End-to-end claim reconciliation: claim -> transactions -> acks -> statuses -> remits
- Batch stats across multiple claims
- Payment status determination (full/partial/denied/pending)

## Transaction States (14-state FSM)

```
created -> serialized -> validated -> queued -> transmitted
  -> ack_pending -> ack_accepted/ack_rejected
  -> response_pending -> response_received -> reconciled
  -> failed (retryable) -> dlq (terminal)
  -> cancelled (terminal)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/transactions` | List transactions with filters |
| GET | `/rcm/transactions/stats` | Transaction statistics |
| GET | `/rcm/transactions/:id` | Get single transaction |
| POST | `/rcm/transactions/build` | Build envelope + translate |
| POST | `/rcm/transactions/:id/transition` | Manual state transition |
| POST | `/rcm/transactions/:id/check-gates` | Run pre-transmit/ack gates |
| POST | `/rcm/transactions/:id/retry` | Retry failed transaction |
| GET | `/rcm/transactions/dlq` | List DLQ transactions |
| POST | `/rcm/transactions/dlq/:id/retry` | Retry from DLQ |
| GET | `/rcm/translators` | List registered translators |
| GET | `/rcm/connectivity/profile` | Active connectivity profile |
| GET | `/rcm/connectivity/health` | Connectivity health check |
| GET | `/rcm/claims/:id/reconciliation` | Claim reconciliation summary |
| POST | `/rcm/claims/batch-reconciliation` | Batch reconciliation stats |

## In-Memory Store Notice

All transaction state is in-memory (Map-based) and resets on API restart.
This matches the Phase 23 imaging worklist and Phase 38 claim store patterns.
Migration path: persist to VistA IB/AR globals or external database when
moving to production.
