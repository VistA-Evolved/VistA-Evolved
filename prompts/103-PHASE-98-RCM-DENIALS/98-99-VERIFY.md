# Phase 98 — RCM Denials & Appeals Loop (VERIFY)

## Gates

1. `denial_case` table exists in platform DB
2. `denial_action` table exists in platform DB
3. `denial_attachment` table exists in platform DB
4. `resubmission_attempt` table exists in platform DB
5. API TypeScript compiles clean (`npx tsc --noEmit`)
6. Web Next.js builds clean (`npx next build`)
7. POST `/rcm/denials` creates a denial case
8. GET `/rcm/denials` returns paginated list
9. GET `/rcm/denials/:id` returns single denial with actions
10. PATCH `/rcm/denials/:id` updates status with audit trail
11. POST `/rcm/denials/:id/actions` adds action
12. POST `/rcm/denials/:id/appeal-packet` generates HTML packet
13. POST `/rcm/denials/:id/resubmit` creates resubmission attempt
14. POST `/rcm/denials/:id/resolve` marks denial resolved
15. POST `/rcm/denials/import/835` imports denial from structured JSON
16. Denial audit actions recorded in rcm-audit trail
17. No PHI in audit log entries
18. Input validation (Zod) rejects invalid denial data
19. Denials UI page loads without errors
20. Phase 95B regression passes (34/34)
21. Phase 96B regression passes (66/66)
22. Phase 86 regression passes (72/72)
