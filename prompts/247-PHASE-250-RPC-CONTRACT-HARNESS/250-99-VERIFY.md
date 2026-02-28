# Phase 250 — VERIFY — VistA RPC Contract Harness

## Verification Script
```powershell
.\scripts\verify-phase250-rpc-contracts.ps1
```

## Gates (20)

| Gate | Check | Criteria |
|------|-------|----------|
| G01 | contracts/ dir | Directory exists |
| G02 | core contract files | rpc-contracts.ts, sanitize.ts, modes.ts, index.ts |
| G03 | >= 10 contracted RPCs | Count rpcName declarations |
| G04 | PHI deny patterns | SSN + DOB patterns in sanitize.ts |
| G05 | RECORD/REPLAY modes | Both keywords in modes.ts |
| G06 | >= 20 fixture files | JSON files under fixtures/vista/ |
| G07 | all RPCs have success+empty | Each of 10 dirs has both files |
| G08 | no SSN in fixtures | Regex scan for XXX-XX-XXXX |
| G09 | no credentials in fixtures | No PROV123/NURSE123/PHARM123 |
| G10 | replay test suite | rpc-contract-replay.test.ts exists |
| G11 | test imports contracts | Imports from vista/contracts |
| G12 | record tool exists | vista-contracts-record.ts exists |
| G13 | record tool safety | VISTA_CONTRACT_MODE guard |
| G14 | barrel exports | index.ts re-exports all modules |
| G15 | prompt folder | 247-PHASE-250-RPC-CONTRACT-HARNESS/ exists |
| G16 | IMPLEMENT prompt | 250-01-IMPLEMENT.md exists |
| G17 | VERIFY prompt | 250-99-VERIFY.md exists |
| G18 | evidence dir | evidence/wave-7/P3/ exists |
| G19 | TypeScript compiles | tsc --noEmit passes |
| G20 | fixtures valid JSON | All .json parse without error |

## Expected Output
```
PASS: 20  FAIL: 0  WARN: 0
VERDICT: PASS
```
