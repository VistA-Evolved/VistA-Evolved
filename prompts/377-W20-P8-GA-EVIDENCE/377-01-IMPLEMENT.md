# 377-01-IMPLEMENT --- GA Evidence Bundle + Trust Center (W20-P8)

## Scope
Phase 377 builds the GA Evidence Bundle generator and Trust Center export:
- Trust Center index with all evidence links
- Evidence bundle generator (collects all certification artifacts)
- Trust Center export endpoint for external sharing
- Final manifest update with all 8 phases complete

## Files to Create / Modify
- `apps/api/src/services/ga-evidence-service.ts` -- evidence collection + trust center export
- `apps/api/src/routes/ga-evidence-routes.ts` -- admin endpoints
- `apps/api/src/server/register-routes.ts` -- import + registration
- `apps/api/src/middleware/security.ts` -- AUTH_RULES
- `apps/api/src/platform/store-policy.ts` -- store entries
- `docs/trust-center/TRUST_CENTER_INDEX.md` -- updated index

## Prompt ref
prompts/377-W20-P8-GA-EVIDENCE/
