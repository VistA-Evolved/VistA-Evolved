# Phase 263 — Support Tooling v2 — VERIFY

## Phase ID

263 (Wave 8, P7)

## Verifier Script

```powershell
.\scripts\verify-phase263-support-tooling-v2.ps1
```

## Gates (20)

| #   | Gate                 | What it checks                    |
| --- | -------------------- | --------------------------------- |
| G01 | toolkit-store        | Store file exists                 |
| G02 | diag-bundle-type     | DiagnosticBundle type             |
| G03 | generate-bundle      | generateDiagnosticBundle function |
| G04 | add-correlation      | addCorrelation function           |
| G05 | hl7-viewer           | buildHl7ViewerEntry function      |
| G06 | posture-summary      | buildPostureSummary function      |
| G07 | six-sections         | 6 diagnostic sections             |
| G08 | correlation-types    | 4 correlation types               |
| G09 | routes-exist         | Routes file present               |
| G10 | bundle-endpoint      | POST /admin/support/bundles       |
| G11 | download-endpoint    | GET bundle download               |
| G12 | correlation-endpoint | Ticket correlations               |
| G13 | posture-endpoint     | Posture summary                   |
| G14 | hl7-viewer-endpoint  | HL7 viewer                        |
| G15 | test-file            | Test file                         |
| G16 | base-diag-intact     | diagnostics.ts untouched          |
| G17 | base-tickets-intact  | ticket-store.ts untouched         |
| G18 | prompt-implement     | IMPLEMENT prompt                  |
| G19 | prompt-verify        | VERIFY prompt                     |
| G20 | no-phi               | No PHI in toolkit                 |

## Expected Result

20 PASS, 0 FAIL
