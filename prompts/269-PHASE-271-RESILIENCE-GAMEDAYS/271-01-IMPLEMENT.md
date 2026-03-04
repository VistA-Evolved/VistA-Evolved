# Phase 271 — Resilience GameDays (W8-P6)

## User Request

Operational truth, not assumptions. GameDay runbooks, drill scripts, RPO/RTO evidence.

## Implementation Steps

1. Create `docs/runbooks/gameday-db-down.md`
2. Create `docs/runbooks/gameday-vista-down.md`
3. Create `docs/runbooks/gameday-queue-backlog.md`
4. Create `docs/runbooks/gameday-node-drain.md`
5. Create `scripts/dr/gameday-drill.mjs` — automated drill runner
6. Populate evidence with RPO/RTO results

## Files Touched

- docs/runbooks/gameday-\*.md (4 new)
- scripts/dr/gameday-drill.mjs (new)
- evidence/wave-8/P6-resilience-gamedays/ (new)
