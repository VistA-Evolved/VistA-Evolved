# Phase 28 IMPLEMENT - Enterprise Intake OS

## User Request

Ship an enterprise-grade Intake OS that is standards-aligned (FHIR Questionnaire/QuestionnaireResponse + SDC-like adaptive $next-question), appointment-linked, proxy/minor/sensitive-info capable, clinician review + file/export workflow (VistA-first), pluggable brain (rules/vendor/LLM), reusable libraries.

## Implementation Steps

1. Inventory existing code + reference repos
2. Create contracts (intake-contract-v1.yaml, pack-format-v1.yaml, provider-interface.md)
3. Build Intake OS runtime (session, events, storage, $next-question endpoint)
4. Build Pack system (registry, resolver, 23+ packs)
5. Build UI: portal intake, kiosk mode, clinician review panel
6. Enterprise features: appointment-linked, proxy/minor scaffolding, filing/mapping, share posture
7. License + third-party notices (LHC-Forms)
8. Prompts folder integrity audit

## Verification Steps

- API TypeScript compiles
- Portal builds clean
- Clinician web app builds clean
- Contract files exist with required schemas
- All 23+ packs load
- Routes registered (intake, kiosk)
- Security: no PHI leaks, session auth, audit trail
- License guard passes

## Files Touched

- docs/runbooks/phase28-intake-inventory.md
- docs/contracts/intake/_.yaml, _.md
- apps/api/src/intake/\*\* (session, events, providers, packs, routes)
- apps/portal/src/app/intake/\*\* (portal intake UI)
- apps/portal/src/app/kiosk/\*\* (kiosk mode)
- apps/web/src/components/cprs/panels/IntakePanel.tsx
- THIRD_PARTY_NOTICES.md
- docs/runbooks/phase28-\*.md
