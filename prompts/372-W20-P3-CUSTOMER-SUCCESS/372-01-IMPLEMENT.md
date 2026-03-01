# Phase 372 — W20-P3 IMPLEMENT: Customer Success Tooling

## User Request
Build tenant onboarding automation, training mode with synthetic dataset seeding,
UI banner for training environments, and demo environment generator.

## Implementation Steps

1. Create customer-success-service.ts with onboarding workflow, training mode toggle,
   synthetic dataset seeder, and demo environment generator
2. Create customer-success-routes.ts with admin endpoints
3. Wire routes and AUTH_RULES
4. Register stores in store-policy.ts

## Files Touched
- apps/api/src/services/customer-success-service.ts
- apps/api/src/routes/customer-success-routes.ts
- apps/api/src/server/register-routes.ts
- apps/api/src/middleware/security.ts
- apps/api/src/platform/store-policy.ts
- prompts/372-W20-P3-CUSTOMER-SUCCESS/372-01-IMPLEMENT.md
- prompts/372-W20-P3-CUSTOMER-SUCCESS/372-99-VERIFY.md
