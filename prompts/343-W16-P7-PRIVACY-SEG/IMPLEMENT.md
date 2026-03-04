# Phase 343 — W16-P7: Privacy Segmentation

## Goal

Sensitivity tags on clinical records, break-glass enforcement, access reason tracking

## Files to Create

- `apps/api/src/auth/privacy-segmentation.ts` — Sensitivity tags, consent model, access reasons
- `apps/api/src/routes/privacy-routes.ts` — Privacy management endpoints

## Files to Edit

- `apps/api/src/platform/pg/pg-migrate.ts` — v37 privacy tables
- `apps/api/src/middleware/security.ts` — AUTH_RULES
