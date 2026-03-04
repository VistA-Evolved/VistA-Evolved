# 374-01-IMPLEMENT — External Validation Harness (W20-P5)

## Scope

Phase 374 builds the external validation harness for pre-GA security and
compliance verification:

- Pen-test environment scaffold (env config, scope doc)
- Vulnerability triage workflow (submit, assess, accept/reject, track)
- Endpoint inventory generator (auto-scans registered routes)
- External validation scope document generator

## Files to Create / Modify

- `apps/api/src/services/external-validation-service.ts` — vulnerability triage, endpoint inventory, scope doc
- `apps/api/src/routes/external-validation-routes.ts` — admin endpoints
- `apps/api/src/server/register-routes.ts` — import + registration
- `apps/api/src/middleware/security.ts` — AUTH_RULES
- `apps/api/src/platform/store-policy.ts` — store entries

## Prompt ref

prompts/374-W20-P5-EXTERNAL-VALIDATION/
