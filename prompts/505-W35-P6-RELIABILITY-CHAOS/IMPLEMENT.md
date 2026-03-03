# Phase 505 — Reliability / Chaos Hooks

## Objective
Validate that existing reliability infrastructure (graceful shutdown, restart
durability, circuit breaker recovery, store reset) meets RC requirements.
Create a unified reliability check script.

## Files
- `scripts/qa/reliability-check.mjs` — Offline reliability posture check
- Prompt files

## Verification
- reliability-check.mjs exits 0 when all patterns present
