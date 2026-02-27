# Phase 150 -- Enterprise IAM Default + Portal Auth Modernization (VERIFY)

## Gates

1. `pnpm -C apps/api exec tsc --noEmit` -- zero errors
2. `runtime-mode.ts` exports `requiresOidc()` -- returns true for rc/prod
3. `validateRuntimeMode()` throws when rc/prod + OIDC_ENABLED !== "true"
4. `data-plane-posture.ts` has `oidc_enforcement` gate
5. `pg-migrate.ts` adds `token_hash`, `subject`, `patient_dfn`,
   `last_activity_at`, `revoked_at` columns to `portal_session`
6. `pg-migrate.ts` creates `portal_patient_identity` table
7. `portal_patient_identity` is in RLS tenant tables array
8. `pg-portal-session-repo.ts` exists with hash-based lookup
9. `portal-auth.ts` no longer logs DFN in `log.info`
10. `portal-auth.ts` uses write-through to PG repo
11. `index.ts` wires portal session repo in Phase 150 block
12. Audit classifier INTERNATIONALIZATION domain status is "partial"
13. No `console.log` additions (Phase 16 cap)
14. Build completes without errors
