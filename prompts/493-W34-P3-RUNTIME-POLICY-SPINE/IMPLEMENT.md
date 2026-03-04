# Phase 493 — W34-P3: Runtime Policy Spine

## Objective

Create a Fastify onRequest hook that resolves the effective country policy
for each authenticated request. Decorates `request.countryPolicy` with the
resolved CountryPackValues (or null for unauthenticated). Subsystems in
P4-P9 read from this decorator instead of making their own pack lookups.

## Files Changed

| File                                                          | Action | Purpose                           |
| ------------------------------------------------------------- | ------ | --------------------------------- |
| `apps/api/src/middleware/country-policy-hook.ts`              | CREATE | onRequest hook + types            |
| `apps/api/src/server/register-routes.ts`                      | EDIT   | Register the hook                 |
| `apps/api/src/routes/country-pack-routes.ts`                  | EDIT   | Add GET /country-policy/effective |
| `prompts/493-W34-P3-RUNTIME-POLICY-SPINE/493-01-IMPLEMENT.md` | CREATE | This file                         |
| `prompts/493-W34-P3-RUNTIME-POLICY-SPINE/493-99-VERIFY.md`    | CREATE | Verify prompt                     |

## Verification

Run `prompts/493-W34-P3-RUNTIME-POLICY-SPINE/493-99-VERIFY.md` checks.
