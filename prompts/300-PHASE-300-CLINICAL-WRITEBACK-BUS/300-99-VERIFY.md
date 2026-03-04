# Phase 300 — Verify: Clinical Writeback Command Bus

## Gates

### Structure (10 gates)

1. `writeback/types.ts` exists and exports `WritebackDomain`, `WritebackIntent`, `INTENT_DOMAIN_MAP`
2. `writeback/gates.ts` exists and exports `checkWritebackGate`, `getWritebackGateSummary`
3. `writeback/command-store.ts` exists and exports CRUD functions
4. `writeback/command-bus.ts` exists and exports `submitCommand`, `processCommand`, `registerExecutor`
5. `writeback/writeback-routes.ts` exists and is a Fastify plugin
6. `writeback/index.ts` barrel export exists
7. PG migration v30 (`phase300_clinical_writeback_commands`) exists in `pg-migrate.ts`
8. 3 new tables in `CANONICAL_RLS_TABLES`: `clinical_command`, `clinical_command_attempt`, `clinical_command_result`
9. 6 new audit actions in `immutable-audit.ts` matching `writeback.*`
10. `register-routes.ts` imports and registers `writebackCommandRoutes`

### Safety (4 gates)

11. No raw DFN in command store (patientRefHash is a hash)
12. All domain gates default to OFF
13. Global WRITEBACK_ENABLED defaults to false
14. Global WRITEBACK_DRYRUN defaults to true

### Store policy (2 gates)

15. `store-policy.ts` has entries for `writeback-commands`, `writeback-attempts`, `writeback-results`, `writeback-idempotency-index`, `writeback-executors`
16. Critical writeback stores have `migrationTarget` defined

### PHI (1 gate)

17. No SSN, DOB, patientName literals in `writeback/` directory

## Run

```powershell
.\scripts\verify-phase300-writeback-bus.ps1
```

## Expected: 17/17 PASS
