# Phase 325 — W14-P9: Integration Onboarding UX

## User Request

Build a guided onboarding wizard for integration partners with step-by-step
setup, prerequisite validation, and go-live readiness checks.

## Implementation Steps

1. **Service layer** (`services/integration-onboarding.ts`):
   - OnboardingTemplate: reusable step-by-step templates with prerequisites, estimated times
   - OnboardingSession: active partner progress with step status tracking + completion %
   - StepValidator: prerequisite enforcement (required steps block downstream)
   - ReadinessCheck: 6-gate go-live validation (required steps, completion %, blocked steps,
     endpoints, certification, security review)
   - Auto-completion when all steps done
   - Seed templates: HL7v2 Interface (7 steps), X12/EDI Clearinghouse (7 steps), FHIR R4 API (6 steps)

2. **Routes** (`routes/onboarding.ts`):
   - Templates: POST create, GET list, GET :id
   - Sessions: POST start, GET :id, GET list, POST step advance, POST pause/resume/abandon
   - Readiness: POST run check, GET report
   - Stats: GET /onboarding/stats

3. **Wiring**:
   - register-routes.ts: import as `integrationOnboardingRoutes` (avoids clash with existing `onboardingRoutes`)
   - security.ts: `/onboarding/` → admin
   - store-policy.ts: 3 entries (templates/registry, sessions/critical, readiness/cache)

## Verification Steps

- `npx tsc --noEmit` — zero errors
- 16 endpoints registered
- Seed templates: 3 templates, 20 total steps
- Prerequisite enforcement blocks out-of-order advancement
- Readiness report has 6 gates

## Files Touched

- `apps/api/src/services/integration-onboarding.ts` (NEW)
- `apps/api/src/routes/onboarding.ts` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/middleware/security.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
