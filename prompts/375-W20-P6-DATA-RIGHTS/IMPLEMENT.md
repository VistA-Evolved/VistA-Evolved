# 375-01-IMPLEMENT — Data Rights Operations (W20-P6)

## Scope

Phase 375 builds the data rights operations framework for GDPR/HIPAA-aligned
data lifecycle management:

- Retention policy engine (configurable per data class)
- Deletion workflow (request -> approve -> execute -> verify)
- Legal hold management (freeze deletion for litigation)
- Data rights audit trail

## Files to Create / Modify

- `apps/api/src/services/data-rights-service.ts` — retention policies, deletion workflows, legal holds, audit
- `apps/api/src/routes/data-rights-routes.ts` — admin endpoints
- `apps/api/src/server/register-routes.ts` — import + registration
- `apps/api/src/middleware/security.ts` — AUTH_RULES
- `apps/api/src/platform/store-policy.ts` — store entries

## Prompt ref

prompts/375-W20-P6-DATA-RIGHTS/
