# Phase 252 -- VERIFY -- E2E Clinical Journeys

## Verification Script

```powershell
.\scripts\verify-phase252-e2e-journeys.ps1
```

## Gates (19)

| Gate | Check                    | Criteria                      |
| ---- | ------------------------ | ----------------------------- |
| G01  | journey-config.ts        | Config file exists            |
| G02  | evidence spec            | Spec file exists              |
| G03  | >= 3 journeys            | Journey count in config       |
| G04  | chart-review             | Chart review journey defined  |
| G05  | admin-posture            | Admin posture journey defined |
| G06  | fhir-smoke               | FHIR smoke journey defined    |
| G07  | imports journey config   | Evidence spec imports config  |
| G08  | imports NetworkEvidence  | Network capture integrated    |
| G09  | screenshots              | Screenshot capture present    |
| G10  | console error gate       | Console gate integrated       |
| G11  | FHIR CapabilityStatement | FHIR metadata check           |
| G12  | 401 check                | Unauth endpoint validation    |
| G13  | auth helper intact       | Existing helper preserved     |
| G14  | network-evidence helper  | Existing helper preserved     |
| G15  | playwright config        | Config file intact            |
| G16  | prompt folder            | Exists                        |
| G17  | IMPLEMENT prompt         | 252-01-IMPLEMENT.md           |
| G18  | VERIFY prompt            | 252-99-VERIFY.md              |
| G19  | evidence dir             | evidence/wave-7/P5            |

## Expected Output

```
PASS: 19  FAIL: 0  WARN: 0
VERDICT: PASS
```
