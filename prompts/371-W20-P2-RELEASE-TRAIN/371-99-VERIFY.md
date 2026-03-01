# Phase 371 — W20-P2 VERIFY: Release Train Governance

## Verification Steps

1. Confirm service file compiles (tsc --noEmit)
2. Confirm routes registered and AUTH_RULES cover /release-train/
3. Confirm store-policy entries for release train stores
4. Simulate release lifecycle: schedule -> approve -> deploy canary -> promote/rollback

## Acceptance Criteria

- Release calendar CRUD works (create, list, get, update)
- Change approval workflow: request -> approve -> deploy
- Rollback triggers notification
- Comms templates manageable via CRUD
- PG migration target defined
