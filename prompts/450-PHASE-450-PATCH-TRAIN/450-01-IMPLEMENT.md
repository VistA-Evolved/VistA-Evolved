# Phase 450 — W29-P4: Patch Train Pipeline

## Objective

Automate the 3-stage patch train (candidate → staging → production) defined in
ADR-W29-VISTA-PATCH-TRAIN.md. Provide scripts for each promotion gate.

## Deliverables

| #   | File                                      | Purpose                                   |
| --- | ----------------------------------------- | ----------------------------------------- |
| 1   | `scripts/patch-train/promote.ps1`         | 3-stage promotion script with gate checks |
| 2   | `scripts/patch-train/candidate-gates.ps1` | Candidate-level gate checks               |
| 3   | `scripts/patch-train/staging-gates.ps1`   | Staging-level gate checks                 |
| 4   | `docs/runbooks/patch-train.md`            | Runbook for patch train operations        |

## Acceptance Criteria

1. `promote.ps1 -From candidate -To staging` runs candidate gates before promotion
2. Each gate script returns structured JSON results
3. Runbook documents the full monthly cadence
