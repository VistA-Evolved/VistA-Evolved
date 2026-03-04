# Phase 444 — VERIFY: Regulatory Reporting Endpoints (W28 P6)

## Gates

1. `regulatory-routes.ts` exists in `apps/api/src/routes/`
2. ~25 endpoints covering all regulatory sub-modules
3. Route registered in `register-routes.ts`
4. AUTH_RULE added for `/regulatory/` (admin level)
5. Barrel imports from `../regulatory/index.js` (no direct file imports)
6. Input validation on POST endpoints (400 on missing required fields)
7. QA lint: 0 FAIL
