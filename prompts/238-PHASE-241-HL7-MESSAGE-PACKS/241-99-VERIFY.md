# Phase 241 — VERIFY — HL7v2 Core Message Packs

## Gates (8)

| # | Gate | Check |
|---|------|-------|
| 1 | Files exist | All 7 new files + 1 modified |
| 2 | TypeScript compiles | `pnpm --filter api build` exits 0 |
| 3 | Pack registry | packRegistry contains adt, orm, oru, siu entries |
| 4 | ADT pack | Has buildAdtA01, validateAdtMessage |
| 5 | ORM pack | Has buildOrmO01, validateOrmMessage |
| 6 | ORU pack | Has buildOruR01, validateOruMessage |
| 7 | SIU pack | Has buildSiuS12, validateSiuMessage |
| 8 | No console.log | Zero hits across all pack files |

## Run
```powershell
.\scripts\verify-phase241-hl7-packs.ps1
```
