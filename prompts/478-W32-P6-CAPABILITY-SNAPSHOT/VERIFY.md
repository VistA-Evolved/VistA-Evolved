# Phase 478 — W32-P6: VERIFY

## Gates

1. `capabilities.ts` exports `capabilityRoutes` function — MUST contain `/vista/capabilities` string
2. `/vista/capabilities` endpoint imports `getFullRpcInventory` from `rpcRegistry.ts`
3. Response schema has `snapshotVersion`, `rpcProbe`, `registry`, `domains`, `rpcs` keys
4. `scripts/vista-capability-snapshot.mjs` exists and is >50 lines
5. Snapshot script accepts `--api`, `--refresh`, `--no-timestamp` flags (grep for strings)
6. No PHI patterns in snapshot script (no SSN, DOB, patientName references)
7. Output path is `data/vista/capability-snapshot.json`

## Verification

```powershell
$cap = Get-Content apps/api/src/routes/capabilities.ts -Raw
$cap -match '/vista/capabilities'         # Gate 1
$cap -match 'getFullRpcInventory'         # Gate 2
$cap -match 'snapshotVersion'             # Gate 3a
$cap -match 'rpcProbe'                    # Gate 3b
$snap = Get-Content scripts/vista-capability-snapshot.mjs -Raw
($snap.Split("`n").Count) -gt 50          # Gate 4
$snap -match '--refresh'                  # Gate 5
$snap -notmatch 'SSN|DOB|patientName'     # Gate 6
$snap -match 'capability-snapshot.json'   # Gate 7
```
