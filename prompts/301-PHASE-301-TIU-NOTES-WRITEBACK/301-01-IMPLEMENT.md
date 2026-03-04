# Phase 301 — TIU Notes Writeback Executor (W12-P3)

## Objective

Wire the TIU domain into the writeback command bus with a full RPC executor
for all 4 TIU write intents: create draft, update text, sign, addendum.

## Implementation Steps

### 1. TIU Executor (`writeback/executors/tiu-executor.ts`)

- Implements `RpcExecutor` interface from command bus
- Maps 4 intents to specific RPC sequences:
  - `CREATE_NOTE_DRAFT` → TIU CREATE RECORD + TIU SET DOCUMENT TEXT
  - `UPDATE_NOTE_TEXT` → TIU SET DOCUMENT TEXT
  - `SIGN_NOTE` → TIU LOCK RECORD + TIU SIGN RECORD + TIU UNLOCK RECORD
  - `CREATE_ADDENDUM` → TIU CREATE ADDENDUM RECORD + TIU SET DOCUMENT TEXT
- `execute()` method with LOCK/UNLOCK safety for SIGN
- `dryRun()` method returns transcript without RPC execution
- esCode hashed with SHA-256 (never stored raw)

### 2. Executor barrel (`writeback/executors/index.ts`)

- Re-exports `tiuExecutor` for clean imports

### 3. Contract tests (`writeback/__tests__/tiu-contract.test.ts`)

- Tests command bus submission validation
- Tests dry-run transcript generation
- Tests safety invariants (UNLOCK always present, esCode hashing)

## Safety

- LOCK before SIGN, always UNLOCK in finally block
- esCode never stored raw — only SHA-256 hash
- RPC availability checked before execution
- Error classification: permanent vs transient for retry

## Files Touched

- `apps/api/src/writeback/executors/tiu-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (NEW)
- `apps/api/src/writeback/__tests__/tiu-contract.test.ts` (NEW)
