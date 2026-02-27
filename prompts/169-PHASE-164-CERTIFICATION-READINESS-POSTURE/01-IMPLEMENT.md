# Phase 164 — Certification / Readiness Posture

## User Request
Add certification and readiness posture gates covering security docs, dev onboarding, VistA provisioning, dependency audit, and module completeness.

## Implementation Steps
1. Create `apps/api/src/posture/certification-posture.ts` — 10 gates
2. Wire into posture/index.ts unified report + dedicated endpoint
3. Create prompts
4. Create UI page at `apps/web/src/app/cprs/admin/certification/page.tsx`
5. Create runbook

## Verification Steps
- `pnpm -C apps/api exec tsc --noEmit` — clean
- `pnpm -C apps/web exec tsc --noEmit` — clean

## Files Touched
- NEW: apps/api/src/posture/certification-posture.ts
- EDIT: apps/api/src/posture/index.ts (add endpoint + unified inclusion)
- NEW: apps/web/src/app/cprs/admin/certification/page.tsx
- NEW: docs/runbooks/phase164-certification-readiness.md
