# 318 — VERIFY: Integration Control Plane v2

## Gates

| #   | Gate                                             | Method                        |
| --- | ------------------------------------------------ | ----------------------------- |
| 1   | Service file exists with all exports             | file + grep                   |
| 2   | Routes file exists with 15 endpoints             | file + grep                   |
| 3   | Migration v31 with 5 CREATE TABLE                | grep pg-migrate.ts            |
| 4   | All 5 tables in CANONICAL_RLS_TABLES             | grep                          |
| 5   | AUTH_RULES entry for /api/platform/integrations/ | grep security.ts              |
| 6   | Route registered in register-routes.ts           | grep                          |
| 7   | 5 store entries in store-policy.ts               | grep                          |
| 8   | No TypeScript compile errors                     | tsc --noEmit                  |
| 9   | No PHI in new files                              | grep for SSN/DOB/DFN patterns |
| 10  | Prompt files exist                               | file check                    |
