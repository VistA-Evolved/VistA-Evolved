# Phase 260 -- VERIFY -- HL7v2 Use-Cases v1

## Verifier
```powershell
.\scripts\verify-phase260-hl7-use-cases.ps1
```

## Gates (18)
| Gate | Check |
|------|-------|
| G01 | All 6 fixture files exist |
| G02 | Fixtures start with MSH |
| G03 | domain-mapper.ts exists |
| G04 | Universal mapper function |
| G05 | ADT mapper |
| G06 | ORU mapper |
| G07 | SIU mapper |
| G08 | ADT^A01 -> patient.admitted |
| G09 | ADT^A03 -> patient.discharged |
| G10 | ORU^R01 -> result.received |
| G11 | SIU^S12 -> appointment.booked |
| G12 | Supported mappings list |
| G13 | No patient names in payload |
| G14 | Use-case routes exist |
| G15 | Ingest endpoint |
| G16 | Use-cases list endpoint |
| G17 | Test file |
| G18 | IMPLEMENT prompt |

## Expected: 18 PASS, 0 FAIL
