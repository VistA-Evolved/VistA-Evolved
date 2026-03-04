# Phase 371 — W20-P2 IMPLEMENT: Release Train Governance

## User Request

Build release train governance: change windows, approvals, rollback, comms templates,
maintenance notifications.

## Implementation Steps

1. Create release-train-service.ts with release calendar model, approval workflow,
   canary/promote/rollback lifecycle, and comms template management
2. Create release-train-routes.ts with admin endpoints
3. Wire routes in register-routes.ts and AUTH_RULES in security.ts
4. Register stores in store-policy.ts
5. Add PG migration for release event tables

## Files Touched

- apps/api/src/services/release-train-service.ts
- apps/api/src/routes/release-train-routes.ts
- apps/api/src/server/register-routes.ts
- apps/api/src/middleware/security.ts
- apps/api/src/platform/store-policy.ts
- apps/api/src/platform/pg/pg-migrate.ts
- prompts/371-W20-P2-RELEASE-TRAIN/371-01-IMPLEMENT.md
- prompts/371-W20-P2-RELEASE-TRAIN/371-99-VERIFY.md
