# Phase 341 — W16-P5: Secrets & Key Management

## Goal

Enterprise secret lifecycle management with zero external deps

## Files to Create

- `apps/api/src/auth/key-provider.ts` — KeyProvider interface + env/file/vault backends
- `apps/api/src/auth/envelope-encryption.ts` — Envelope encryption (DEK encrypted by KEK)
- `apps/api/src/auth/rotation-manager.ts` — Key rotation workflows + audit
- `apps/api/src/routes/secrets-routes.ts` — Admin endpoints for secret status

## Files to Edit

- `apps/api/src/platform/pg/pg-migrate.ts` — v35 secrets tables
- `apps/api/src/middleware/security.ts` — AUTH_RULES for /secrets/\*

## Constraints

- Node.js crypto only — no npm deps
- Secrets never logged or returned in responses
- Rotation is non-destructive (old keys retained until expired)
