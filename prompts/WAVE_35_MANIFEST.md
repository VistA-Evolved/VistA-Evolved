# Wave 35 — RC-1 Stabilization + Production Ops Readiness

**Phases 500-509 (K=10)**
**Objective:** Ship a Release Candidate that is operable, safe under outage,
fast enough, secure enough, and verifiable with a single command.

## Phase Map

| Phase | Slug                          | Title                                             |
| ----- | ----------------------------- | ------------------------------------------------- |
| 500   | W35-P1-RC-SCOPE-FREEZE        | Reservation + Manifest + RC Scope Freeze          |
| 501   | W35-P2-RC-VERIFY-ORCHESTRATOR | Single "RC Verify" Orchestrator + Report          |
| 502   | W35-P3-BUG-BASH-HARNESS       | Bug Bash Harness + Defect Registry Generator      |
| 503   | W35-P4-DOWNTIME-MODE          | Downtime Mode + VistA Outage Simulation           |
| 504   | W35-P5-PERF-BUDGETS           | Performance Budgets + Soak Tests                  |
| 505   | W35-P6-RELIABILITY-CHAOS      | Reliability/Chaos Hooks                           |
| 506   | W35-P7-SECURITY-PRECERT       | Security Pre-Cert Pack + Evidence                 |
| 507   | W35-P8-ROLE-ACCEPTANCE        | Role-Based Acceptance Matrix + UI Smoke           |
| 508   | W35-P9-OPERATIONAL-RUNBOOKS   | Operational Runbooks + Training Mode + Demo Reset |
| 509   | W35-P10-RC-EVIDENCE-BUNDLE    | RC Evidence Bundle v2 + Go/No-Go Gate             |

## Definition of Done

- `verify-rc.ps1` produces PASS/FAIL deterministically
- Downtime mode exists and is tested
- Perf budgets exist and soak evidence exists
- Security precert evidence exists
- Role acceptance matrix has automated smoke coverage
- Go/no-go gate produces a procurement-ready evidence bundle

## Commit Log

| Phase | Commit    | Title                                        |
| ----- | --------- | -------------------------------------------- |
| 500   | `085db77` | Reservation + Manifest + RC Scope Freeze     |
| 501   | `84b6e2c` | Single RC Verify Orchestrator + Report       |
| 502   | `e9ad2a7` | Bug Bash Harness + Defect Registry Generator |
| 503   | `06f8c97` | Downtime Mode + VistA Outage Simulation      |
| 504   | `1b1f002` | Performance Budgets + Soak Tests             |
| 505   | `79b4002` | Reliability / Chaos Hooks                    |
| 506   | `e4e662d` | Security Pre-Cert Pack                       |
| 507   | `7c84cab` | Role-Based Acceptance Matrix                 |
| 508   | `4a45f5f` | Operational Runbooks + Demo Reset            |
| 509   | `f744fe1` | RC Evidence Bundle v2 + Go/No-Go Gate        |

## Final Gate Status

**13 PASS, 0 FAIL, 0 SKIP — RC_READY**
