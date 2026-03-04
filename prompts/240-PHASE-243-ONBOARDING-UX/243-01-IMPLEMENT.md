# Phase 243 — Onboarding UX Wizard (Wave 6 P6)

## User Request

Build a guided onboarding wizard for new facility/tenant setup:

- Multi-step API with state tracking
- Steps: tenant creation, VistA probe, module selection, user invite
- Admin-only access
- Web UI wizard page

## Implementation Steps

1. Create onboarding state store + types in `apps/api/src/config/onboarding-store.ts`
2. Create onboarding API routes in `apps/api/src/routes/onboarding-routes.ts`
3. Wire routes into `register-routes.ts`
4. Create wizard UI page at `apps/web/src/app/cprs/admin/onboarding/page.tsx`
5. Add nav link to admin layout
6. Create prompt + verify files
7. Build, verify, commit

## Files Touched

- NEW: `apps/api/src/config/onboarding-store.ts`
- NEW: `apps/api/src/routes/onboarding-routes.ts`
- NEW: `apps/web/src/app/cprs/admin/onboarding/page.tsx`
- MOD: `apps/api/src/server/register-routes.ts`
- MOD: `apps/web/src/app/cprs/admin/layout.tsx`
- NEW: `scripts/verify-phase243-onboarding-ux.ps1`

## Verification

- See 243-99-VERIFY.md
