# Phase 46 -- National Gateway Packs (PH eClaims3, AU ECLIPSE, SG NPHC, NZ ACC)

## User Request

Implement national gateway packs for 4 countries with:

- Connector upgrades / new modules
- Enrollment packets + go-live checklists
- Conformance harness per gateway
- Health probes checking real prerequisites (certs, endpoints, config) without PHI
- Gateway readiness model + unified API endpoint
- UI dashboard for PhilHealth readiness
- 5 runbook files

## Implementation Steps

1. Create gateway readiness model: `apps/api/src/rcm/gateways/readiness.ts`
2. Upgrade PhilHealth connector for eClaims 3.0 + SOA generator
3. Upgrade AU ECLIPSE connector with cert/PRODA probes
4. Upgrade SG NPHC connector with CorpPass probes
5. Upgrade NZ ACC connector with OAuth2/throttle model
6. Create conformance harness: `apps/api/src/rcm/conformance/`
7. Wire gateway routes in rcm-routes.ts
8. Add audit actions for gateway probes
9. Add UI tab: Gateway Readiness dashboard
10. Create 5 runbook files
11. Create tests
12. Verify: tsc + vitest

## Verification Steps

- `npx tsc --noEmit` exits 0
- `npx vitest run` all tests pass
- GET /rcm/gateways/readiness returns structured readiness per gateway

## Files Touched

- apps/api/src/rcm/gateways/readiness.ts (new)
- apps/api/src/rcm/gateways/soa-generator.ts (new)
- apps/api/src/rcm/conformance/gateway-conformance.ts (new)
- apps/api/src/rcm/connectors/philhealth-connector.ts (modified)
- apps/api/src/rcm/connectors/eclipse-au-connector.ts (modified)
- apps/api/src/rcm/connectors/nphc-sg-connector.ts (modified)
- apps/api/src/rcm/connectors/acc-nz-connector.ts (modified)
- apps/api/src/rcm/audit/rcm-audit.ts (modified)
- apps/api/src/rcm/rcm-routes.ts (modified)
- apps/web/src/app/cprs/admin/rcm/page.tsx (modified)
- apps/api/tests/gateway-packs.test.ts (new)
- docs/runbooks/philhealth-eclaims3-enrollment.md (new)
- docs/runbooks/philhealth-electronic-soa.md (new)
- docs/runbooks/au-eclipse-enrollment.md (new)
- docs/runbooks/sg-nphc-access.md (new)
- docs/runbooks/nz-acc-claim-api.md (new)
