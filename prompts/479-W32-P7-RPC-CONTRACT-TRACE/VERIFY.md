# Phase 479 — W32-P7: VERIFY

## Gates

1. `rpc-contract-trace.ts` exists and exports `startTraceSession`
2. `rpc-contract-trace.ts` exports `compareTraces` and `WORKFLOW_TEMPLATES`
3. `WORKFLOW_TEMPLATES` contains 3 workflows: patient-search, note-create-sign, order-place
4. `qa/index.ts` re-exports contract trace functions
5. `qa-routes.ts` has `/qa/contract-traces` endpoints (GET + POST)
6. `scripts/rpc-contract-compare.mjs` exists and has `--list`, `--all`, `--strict` flags
7. Compare script uses exit code 0/1/2
8. No PHI patterns in contract trace module

## Verification
```powershell
$ct = Get-Content apps/api/src/qa/rpc-contract-trace.ts -Raw
$ct -match 'startTraceSession'         # Gate 1
$ct -match 'compareTraces'             # Gate 2a
$ct -match 'WORKFLOW_TEMPLATES'        # Gate 2b
$ct -match 'patient-search'            # Gate 3a
$ct -match 'note-create-sign'          # Gate 3b
$ct -match 'order-place'              # Gate 3c

$idx = Get-Content apps/api/src/qa/index.ts -Raw
$idx -match 'rpc-contract-trace'       # Gate 4

$qr = Get-Content apps/api/src/routes/qa-routes.ts -Raw
$qr -match '/qa/contract-traces'       # Gate 5

$cmp = Get-Content scripts/rpc-contract-compare.mjs -Raw
$cmp -match '--list'                   # Gate 6a
$cmp -match '--all'                    # Gate 6b
$cmp -match 'process\.exit\(0\)'      # Gate 7a
$cmp -match 'process\.exit\(1\)'      # Gate 7b
$ct -notmatch 'SSN|DOB|patientName'   # Gate 8
```
