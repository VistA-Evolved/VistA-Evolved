# Phase 395 — W22-P7: CDS Hooks + SMART Launch — IMPLEMENT

## User Request

Implement CDS Hooks 1.0 specification endpoints, SMART on FHIR app launch context,
native CDS rule engine, and CQF Ruler adapter for Wave 22 clinical decision support.

## Implementation Steps

1. Created `apps/api/src/cds/types.ts` -- Full HL7 CDS Hooks 1.0 type system:
   - CdsService, CdsHookRequest, CdsCard, CdsHookResponse (discovery + invocation)
   - CdsSuggestion, CdsSuggestionAction, CdsLink (card actions)
   - SmartApp, SmartLaunchContext (SMART on FHIR)
   - CdsRuleDefinition with 11 condition operators (native engine)
   - CdsFeedback, CdsDashboardStats
2. Created `apps/api/src/cds/cds-store.ts` -- 6 stores:
   - CDS service registry (discovery)
   - CDS rule definitions (native + CQF engine)
   - CDS invocation log (audit)
   - SMART app registry
   - SMART launch contexts (5-min TTL, auto-expire)
   - CDS feedback log
   - Native rule evaluation engine (11 operators, AND-logic conditions)
   - CQF Ruler adapter stub (env: CQF_RULER_URL, CQF_RULER_ENABLED)
3. Created `apps/api/src/cds/cds-routes.ts` -- 25 endpoints:
   - CDS Services: GET/POST/DELETE /cds/services, POST /cds/services/:id (invoke)
   - CDS Feedback: POST /cds/feedback, GET /cds/invocations
   - CDS Rules: CRUD at /cds/rules
   - CQF Config: GET/PUT /cds/cqf/config
   - SMART Apps: CRUD at /cds/smart/apps
   - SMART Launch: POST /cds/smart/launch, GET/POST consume
   - Dashboard: GET /cds/dashboard, GET /cds/feedback-log
4. created `apps/api/src/cds/index.ts` -- barrel export
5. Wired into register-routes.ts, security.ts (cqf admin, rest session), store-policy.ts (5 entries)

## Verification Steps

- TypeScript compilation clean (pnpm exec tsc --noEmit)
- All imports resolve correctly
- AUTH_RULES: /cds/cqf/config admin, /cds/\* session
- Store policy: 5 entries (services, rules, smart-apps, launch-contexts, invocation-log)

## Files Touched

- apps/api/src/cds/types.ts (new)
- apps/api/src/cds/cds-store.ts (new)
- apps/api/src/cds/cds-routes.ts (new)
- apps/api/src/cds/index.ts (new)
- apps/api/src/server/register-routes.ts (modified)
- apps/api/src/middleware/security.ts (modified)
- apps/api/src/platform/store-policy.ts (modified)
