# Phase 42 — VistA Billing/RCM Binding Pack (IB/PRCA/PCE) + Claim Draft Sources

## User Request
Bind RCM to VistA data sources for encounters/visits, diagnoses/procedures,
charges, and insurance/payer info. Implement real claim drafting inputs from
VistA where available, and keep everything honest where the sandbox lacks data.

## Deliverables
- A) `docs/vista/billing-grounding-v2.md` — explicit billing capability map
- B) Safe read-only VE* wrapper RPCs (if needed) + install docs
- C) `apps/api/src/rcm/vistaBindings/` — claim draft builder
- D) API endpoints: `/rcm/vista/encounters`, `/rcm/vista/claim-drafts`, `/rcm/vista/coverage`
- E) "Draft from VistA" flow in RCM UI
- F) Unit tests + safety (stub VistA, no PHI, circuit breaker)
- G) `docs/runbooks/rcm-draft-from-vista.md` + architecture update

## Implementation Steps
1. Inventory existing RCM code (`vista-rcm.ts`, `capability-map-billing.json`, `rcm/` dir)
2. Probe VistA sandbox for billing data availability (PCE encounters, IB, PRCA)
3. Create billing grounding v2 doc mapping objects -> RPCs
4. Create wrapper RPCs if needed (MUMPS .m files)
5. Build claim draft builder with VistA bindings
6. Add API endpoints with session auth + circuit breaker
7. Add UI flow in RCM dashboard page
8. Add tests
9. Write runbook + update architecture docs
10. Verify + commit

## Verification Steps
- API starts cleanly
- Endpoints return structured data
- Unit tests pass
- No PHI in logs
- Docs complete

## Files Touched
- `prompts/46-PHASE-42-VISTA-BILLING-RCM/prompt.md`
- `docs/vista/billing-grounding-v2.md`
- `apps/api/src/rcm/vistaBindings/` (new directory)
- `apps/api/src/rcm/rcm-routes.ts` (extend)
- `apps/api/src/routes/vista-rcm.ts` (review/extend)
- `apps/api/src/index.ts` (register routes)
- `apps/web/src/app/cprs/admin/rcm/page.tsx` (extend UI)
- `docs/runbooks/rcm-draft-from-vista.md`
- `docs/architecture/rcm-gateway-architecture.md` (update)
- `apps/api/src/vista/rpcRegistry.ts` (add new RPCs)
- `scripts/verify-phase42-billing-binding.ps1`
- `scripts/verify-latest.ps1`
