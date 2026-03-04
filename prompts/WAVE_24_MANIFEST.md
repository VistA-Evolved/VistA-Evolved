# Wave 24 -- Pilot Go-Lives + Real Customer Integration + Stabilization Loop

> Convert "we built it" into "we can reliably deploy it": real pilot
> environments, integration certification, operational runbooks, cutover
> drills, and a post-go-live stabilization loop.

## Phase Map

| Wave Phase | Resolved ID | Title                                                                      | Prompt Folder                       |
| ---------- | ----------- | -------------------------------------------------------------------------- | ----------------------------------- |
| W24-P1     | 409         | Reservation + Manifest + Pilot Archetypes + Readiness Gate Freeze          | `409-W24-P1-MANIFEST-ARCHETYPES`    |
| W24-P2     | 410         | Reference Environments (Staging + Pilot + DR) as Code + Parity Proof       | `410-W24-P2-REFERENCE-ENVIRONMENTS` |
| W24-P3     | 411         | Customer Integration Intake Model                                          | `411-W24-P3-INTEGRATION-INTAKE`     |
| W24-P4     | 412         | Pilot Integration Certification Runs + Evidence Pack per Customer          | `412-W24-P4-CERT-RUNS`              |
| W24-P5     | 413         | Data Migration Rehearsal Program                                           | `413-W24-P5-MIGRATION-REHEARSAL`    |
| W24-P6     | 414         | Clinical Safety + UAT Harness                                              | `414-W24-P6-UAT-HARNESS`            |
| W24-P7     | 415         | Cutover + Rollback + DR Rehearsal                                          | `415-W24-P7-CUTOVER-ROLLBACK-DR`    |
| W24-P8     | 416         | Post-Go-Live Monitoring + Error Budgets + Incident Automation              | `416-W24-P8-SRE-MONITORING`         |
| W24-P9     | 417         | Pilot Launch Checklist + Day-1/Week-1/Month-1 Ops Runbooks + Go/No-Go Gate | `417-W24-P9-GO-NOGO-GATE`           |

## Range Reservation

- Wave: 24
- Start: 409
- End: 417
- Count: 9
- Registered in: `docs/qa/prompt-phase-range-reservations.json`

## Dependencies and Run Order

```
P1 (manifest + archetypes + readiness gates)
 |-- P2 (reference environments as code)
 |    |-- P3 (customer integration intake model)
 |         |-- P4 (pilot certification runs)
 |              |-- P5 (data migration rehearsal)
 |                   |-- P6 (UAT harness)
 |                        |-- P7 (cutover + rollback + DR)
 |                             |-- P8 (SRE monitoring + error budgets)
 |                                  |-- P9 (go/no-go gate + ops runbooks)
```

## Evidence Location

All evidence is stored under `/evidence/wave-24/<phase-id>-<slug>/`.
