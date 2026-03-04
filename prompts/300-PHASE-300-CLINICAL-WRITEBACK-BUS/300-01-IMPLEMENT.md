# Phase 300 — Clinical Writeback Command Bus (W12-P2)

## Objective

Build a unified command bus for all clinical writebacks to VistA. Every write
operation (notes, orders, pharmacy, labs, ADT, imaging) flows through the bus
with idempotency, safety gates, dry-run mode, and immutable audit.

## Implementation Steps

### 1. Type foundations (`writeback/types.ts`)

- Define `WritebackDomain` (6 domains: TIU, ORDERS, PHARM, LAB, ADT, IMG)
- Define `WritebackIntent` (19 intents mapped to domains)
- Define `ClinicalCommand`, `CommandAttempt`, `CommandResult` records
- Define `RpcExecutor` adapter interface with `execute()` and `dryRun()` methods

### 2. Feature gates (`writeback/gates.ts`)

- Environment-variable based gate per domain (all default OFF)
- Global kill-switch `WRITEBACK_ENABLED` (default false)
- Global dry-run mode `WRITEBACK_DRYRUN` (default true)
- `checkWritebackGate()` returns `{ allowed, reason, dryRun }`

### 3. Command store (`writeback/command-store.ts`)

- In-memory Map stores for commands, attempts, results, idempotency index
- CRUD operations with idempotency check
- Pruning at 50K max commands
- Store registered in `store-policy.ts`

### 4. Command bus (`writeback/command-bus.ts`)

- `submitCommand()` — validate, check gate, check idempotency, persist
- `processCommand()` — pick up pending, execute via RpcExecutor, record
- `registerExecutor()` — adapter pattern per domain
- Dry-run support — records transcript without RPC execution

### 5. Routes (`writeback/writeback-routes.ts`)

- `POST /writeback/commands` — submit a command
- `GET  /writeback/commands` — list with filters
- `GET  /writeback/commands/:id` — detail view
- `POST /writeback/commands/:id/process` — admin trigger
- `GET  /writeback/gates` — feature gate summary
- `GET  /writeback/stats` — store statistics

### 6. PG migration v30 (`pg-migrate.ts`)

- `clinical_command` table with idempotency unique index
- `clinical_command_attempt` table with FK
- `clinical_command_result` table with FK
- All 3 tables added to `CANONICAL_RLS_TABLES`

### 7. Audit integration (`immutable-audit.ts`)

- 6 new audit actions: `writeback.submit`, `writeback.execute`,
  `writeback.dry_run`, `writeback.reject`, `writeback.retry`, `writeback.fail`

### 8. Route registration (`register-routes.ts`)

- Import and register `writebackCommandRoutes` plugin

## Files Touched

- `apps/api/src/writeback/types.ts` (NEW)
- `apps/api/src/writeback/gates.ts` (NEW)
- `apps/api/src/writeback/command-store.ts` (NEW)
- `apps/api/src/writeback/command-bus.ts` (NEW)
- `apps/api/src/writeback/writeback-routes.ts` (NEW)
- `apps/api/src/writeback/index.ts` (NEW)
- `apps/api/src/platform/pg/pg-migrate.ts` (MODIFIED — v30 + RLS)
- `apps/api/src/lib/immutable-audit.ts` (MODIFIED — 6 actions)
- `apps/api/src/platform/store-policy.ts` (MODIFIED — 5 stores)
- `apps/api/src/server/register-routes.ts` (MODIFIED — import + register)

## Safety

- All gates default OFF, dry-run default ON
- No raw DFN stored — only SHA-256 hash
- Idempotency prevents duplicate writes
- Adapter pattern allows domain-specific executors (registered later in P3-P8)
