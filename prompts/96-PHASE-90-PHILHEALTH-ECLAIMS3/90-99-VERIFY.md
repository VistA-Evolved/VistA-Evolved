# Phase 90 VERIFY — PhilHealth eClaims 3.0 posture

## Prompt

Verify Phase 90 (PhilHealth eClaims 3.0 posture) implementation:
compliance integrity, security audit, feature integrity, regression check.

## Verification Steps

### 1. Build Check

- [x] API `tsc --noEmit` — clean (0 errors)
- [x] Web `tsc --noEmit` — clean (0 errors)

### 2. verify-latest.ps1

- [x] 72/72 gates pass

### 3. Compliance Integrity

- [x] Validator REJECTS scanned PDF for admissions >= 2026-04-01 (code: SCANNED_PDF_REJECTED)
- [x] Validator WARNS for scanned PDF before cutoff (code: SCANNED_PDF_DEPRECATED)
- [x] `requiresRealIntegration()` blocks submitted_pending/returned_to_hospital/paid/denied
- [x] `transitionPhilHealthClaimStatus` checks PHILHEALTH_API_TOKEN + PHILHEALTH_TEST_MODE
- [x] Test upload results labeled `simulated: true`
- [x] Test TCN uses "SIMULATED-TCN-" prefix
- [x] NOT CERTIFIED banner in runbook
- [x] NOT CERTIFIED banner in both UI pages
- [x] "SIMULATED" label on test upload results in claims UI

### 4. Feature Integrity

- [x] Claim draft CRUD: create/list/get/patch work
- [x] Status FSM: 8 states, all transitions defined
- [x] PATCH restricted to draft/ready_for_submission states only
- [x] Export pipeline generates SOA + manifest + claim bundle
- [x] Test upload simulator returns structured results with next steps
- [x] Facility setup with readiness checklist (8 items)
- [x] Provider accreditation CRUD
- [x] Validation engine: CF1-CF4 fields, PIN format, eSOA compliance, procedure codes

### 5. Security Check

- [x] No console.log in any new file
- [x] No hardcoded credentials (PROV123, passwords, API keys)
- [x] appendRcmAudit wired to all 10 mutation endpoints
- [x] Patient DFN sanitized to '[DFN]' in audit
- [x] All fetch() calls use credentials: 'include'
- [x] All routes use (request.body as any) || {} (BUG-046)

### 6. Wiring Check

- [x] index.ts imports + registers philhealthRoutes
- [x] layout.tsx has PH Setup + PH Claims nav entries (moduleId: 'rcm')
- [x] Route paths match UI fetch URLs

### 7. Audit Issues Found + Fixed

- [MEDIUM] Missing procedure validation in CF2 — Added procedure.code checks + case-rate warning
- [LOW] Unused import PhilHealthChargeItem in store — Removed
- [LOW] Unused import PhilHealthReadinessItem in store — Removed

## Files Touched

- apps/api/src/rcm/payerOps/philhealth-types.ts (new)
- apps/api/src/rcm/payerOps/philhealth-store.ts (new)
- apps/api/src/rcm/payerOps/philhealth-validator.ts (new)
- apps/api/src/rcm/payerOps/philhealth-routes.ts (new)
- apps/api/src/index.ts (modified — import + register)
- apps/web/src/app/cprs/admin/philhealth-setup/page.tsx (new)
- apps/web/src/app/cprs/admin/philhealth-claims/page.tsx (new)
- apps/web/src/app/cprs/admin/layout.tsx (modified — nav entries)
- docs/runbooks/philhealth-eclaims3-posture.md (new)
- prompts/96-PHASE-90-PHILHEALTH-ECLAIMS3/90-01-IMPLEMENT.md (new)
- prompts/96-PHASE-90-PHILHEALTH-ECLAIMS3/90-99-VERIFY.md (this file)
