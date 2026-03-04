# Phase 271 — VERIFY — Resilience GameDays

## Gates

| #   | Gate                         | Pass Criteria                                       |
| --- | ---------------------------- | --------------------------------------------------- |
| 1   | DB-down runbook exists       | `docs/runbooks/gameday-db-down.md`                  |
| 2   | VistA-down runbook exists    | `docs/runbooks/gameday-vista-down.md`               |
| 3   | Queue backlog runbook exists | `docs/runbooks/gameday-queue-backlog.md`            |
| 4   | Node drain runbook exists    | `docs/runbooks/gameday-node-drain.md`               |
| 5   | Drill script executable      | `scripts/dr/gameday-drill.mjs` runs                 |
| 6   | Restore validation works     | Backup restore tested                               |
| 7   | RPO/RTO documented           | Actual measured values                              |
| 8   | Evidence captured            | `evidence/wave-8/P6-resilience-gamedays/` populated |
