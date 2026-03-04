# Phase 262 — Onboarding UX v2 — IMPLEMENT

## Phase ID

262 (Wave 8, P6)

## Title

Onboarding UX v2 — Integration Setup Wizard Extension

## Goal

Extend the Phase 243 onboarding wizard with integration setup steps so new
tenants can configure HL7v2 endpoints, FHIR connections, payer adapters,
imaging devices, and OIDC providers during initial facility onboarding, then
verify connectivity and run preflight checks before go-live.

## Inventory (before editing)

- `apps/api/src/config/onboarding-store.ts` — Base wizard store (5 steps)
- `apps/api/src/routes/onboarding-routes.ts` — Base wizard routes (7 endpoints)
- `apps/web/src/app/cprs/admin/onboarding/page.tsx` — Wizard UI (415 lines)
- `apps/api/src/hl7/tenant-endpoints.ts` — HL7v2 endpoint CRUD (Phase 258)
- `apps/api/src/rcm/payerOps/store.ts` — Payer credential vault
- `apps/api/src/pilot/preflight.ts` — 12 preflight checks (Phase 246)

## Implementation Steps

1. Create `apps/api/src/config/onboarding-integration-steps.ts`:
   - IntegrationKind: hl7v2, fhir, payer, imaging, oidc
   - IntegrationEndpointConfig: per-endpoint configuration
   - IntegrationStepId: integrations, connectivity, preflight
   - OnboardingIntegrationSession: linked to base session
   - Store functions for CRUD, probing, and preflight
2. Create `apps/api/src/routes/onboarding-integration-routes.ts`:
   - Integration kinds listing, session CRUD, endpoint management
   - Connectivity probing, preflight execution
3. Create test file and verifier

## Files Touched

- `apps/api/src/config/onboarding-integration-steps.ts` (NEW)
- `apps/api/src/routes/onboarding-integration-routes.ts` (NEW)
- `apps/api/tests/onboarding-ux-v2.test.ts` (NEW)
- `scripts/verify-phase262-onboarding-ux-v2.ps1` (NEW)

## Key Decisions

- Base onboarding-store.ts is NOT modified (extension, not modification)
- Integration session links to base session via onboardingSessionId
- 5 integration kinds cover all current integration types
- Preflight checks are lightweight and in-process (real probes a future step)
