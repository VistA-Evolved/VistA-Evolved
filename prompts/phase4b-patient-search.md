# Phase 4B Prompt — Patient Search

## Exact Prompt Used

```
You are a conservative engineer. Phase 4A already works (default patient list
returns real data). Do NOT change the RPC protocol implementation unless
absolutely required.

Goal:
Implement Phase 4B: GET /vista/patient-search?q=<string> returning patient
matches (dfn + name).

Hard rules:
1) Do not refactor rpcBrokerClient.ts protocol code.
2) Do not break /vista/default-patient-list.
3) Do not commit secrets. .env.local stays untracked.
4) Only minimal changes to add patient search.
```

## RPC Selection Process

1. Tested `ORWPT LIST ALL` against live WorldVistA Docker sandbox
2. Params: `(FROM, DIR)` where FROM = search string, DIR = "1" (forward)
3. Response format: `DFN^NAME^^^^NAME` per line
4. Works under `OR CPRS GUI CHART` context (already set in Phase 4A)
5. No protocol changes needed — reuses existing `callRpc()` from `rpcBrokerClient.ts`

## Expected Output

```powershell
curl "http://127.0.0.1:3001/vista/patient-search?q=ZZ" -UseBasicParsing
```

```json
{
  "ok": true,
  "count": 3,
  "results": [
    { "dfn": "1", "name": "ZZ PATIENT,TEST ONE" },
    { "dfn": "3", "name": "ZZ PATIENT,TEST THREE" },
    { "dfn": "2", "name": "ZZ PATIENT,TEST TWO" }
  ],
  "rpcUsed": "ORWPT LIST ALL"
}
```

## Files Changed

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Rewired `/vista/patient-search` from stub to real RPC call |
| `docs/runbooks/vista-rpc-patient-search.md` | Replaced stub runbook with working Phase 4B runbook |
| `prompts/phase4b-patient-search.md` | This file |
| `apps/api/README.md` | Phase label already says 4B (done in prior commit) |

## Troubleshooting

### "Query too short"
- Minimum 2 characters required. Use `?q=ZZ` not `?q=Z`.

### 0 results
- Fresh WorldVistA sandbox has only 3 patients: ZZ PATIENT,TEST ONE/TWO/THREE
- Search string must match the beginning of the patient name

### Sign-on failed
- Check `apps/api/.env.local` has correct credentials (PROV123 / PROV123!!)
- See `apps/api/.env.example` for template

### Connection timeout
- Ensure Docker sandbox is running: `docker ps`
- Wait 15s after container start for port 9430

## Verification

```powershell
# Phase 4A must still pass
.\scripts\verify-phase1-to-phase4a.ps1

# Phase 4B manual check
curl "http://127.0.0.1:3001/vista/patient-search?q=ZZ" -UseBasicParsing
# Must return ok:true with results array
```
