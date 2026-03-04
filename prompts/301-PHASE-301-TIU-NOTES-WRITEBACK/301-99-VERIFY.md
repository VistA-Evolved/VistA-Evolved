# Phase 301 — Verify: TIU Notes Writeback Executor

## Gates

### Structure (5 gates)

1. `writeback/executors/tiu-executor.ts` exists and exports `tiuExecutor`
2. `tiuExecutor` implements both `execute()` and `dryRun()` methods
3. `writeback/executors/index.ts` barrel re-exports `tiuExecutor`
4. Contract test file exists at `writeback/__tests__/tiu-contract.test.ts`
5. INTENT_RPC_MAP covers all 4 TIU intents

### Safety (4 gates)

6. SIGN_NOTE RPC sequence includes TIU LOCK RECORD and TIU UNLOCK RECORD
7. esCode is hashed (SHA-256) before storage — never stored raw
8. Error classification: uses `errorClass: "permanent"` and `"transient"`
9. disconnect() called in finally block

### RPC coverage (3 gates)

10. References TIU CREATE RECORD
11. References TIU SIGN RECORD
12. References TIU CREATE ADDENDUM RECORD

## Run

```powershell
.\scripts\verify-phase301-tiu-writeback.ps1
```

## Expected: 12/12 PASS
