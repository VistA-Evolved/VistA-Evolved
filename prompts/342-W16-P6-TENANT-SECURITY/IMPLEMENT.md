# Phase 342 — W16-P6: Tenant Security Posture Controls

## Goal

Per-tenant security policy model with configurable posture controls

## Files to Create

- `apps/api/src/auth/tenant-security-policy.ts` — Policy model + store
- `apps/api/src/routes/tenant-security-routes.ts` — Admin endpoints

## Files to Edit

- `apps/api/src/platform/pg/pg-migrate.ts` — v36 tenant security tables
- `apps/api/src/middleware/security.ts` — AUTH_RULES

## Constraints

- Tenant policies stored in PG + in-memory cache
- Policies: allowedCidrs, requireMfa, allowExports, maxSessionAge, ipAllowList
- Changes audited immutably
