# Phase 71 — VERIFY: Interop Monitor v2 (VistA HL7/HLO Grounded)

## Verification Command

```powershell
.\scripts\verify-phase71-interop.ps1
```

## Gates (36 total)

### ZVEMIOP.m (10 gates)
- All 6 entry points exist (LINKS, MSGS, HLOSTAT, QLENGTH, MSGLIST, MSGDETL)
- Reads real VistA globals: ^HLCS(870), ^HLMA, ^HLD(779.*), ^HL(772)

### VEMCTX3.m (3 gates)
- Includes VE INTEROP MSG LIST
- Includes VE INTEROP MSG DETAIL
- Loops all 6 RPCs

### install-interop-rpcs.ps1 (2 gates)
- Copies VEMCTX3.m into container
- Runs VEMCTX3 to add RPCs to context

### capabilities.json (8 gates)
- No VEMHL typo
- All 7 interop capabilities present with correct targetRpc

### actionRegistry.ts (7 gates)
- All 6 interop actions present and wired

### vista-interop.ts (6 gates)
- No fake queue counts
- Uses cachedRpc/resilientRpc
- References all 6 VE INTEROP RPCs

### TypeScript (1 gate)
- apps/web TSC clean
