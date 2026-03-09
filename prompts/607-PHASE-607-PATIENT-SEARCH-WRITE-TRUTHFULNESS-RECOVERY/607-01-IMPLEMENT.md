# Phase 607 - IMPLEMENT: Patient Search Write Truthfulness Recovery

## User Request

- Continue autonomously and keep the system VistA-first.
- Ensure the full user-facing workflow works end to end across frontend, backend, and live VEHU.
- Before changing stale or pending areas, inspect the prompt lineage and repair the real broken path.

## Scope

- Repair patient-search write actions that are currently blocked by missing CSRF headers.
- Keep medication ordering truthful when live AUTOACK does not complete in VEHU.
- Preserve existing patient-search UX and minimize unrelated churn.

## Implementation Steps

1. Update patient-search write calls for allergies, vitals, notes, and medications so they send the same CSRF headers already used by problem add.
2. Preserve the existing success and refresh behavior for live-successful writes.
3. Harden the legacy POST /vista/medications route so a non-creating AUTOACK result does not masquerade as a successful VistA write.
4. When AUTOACK cannot produce a real order, return a truthful server-side draft/sync-pending result with an explicit message instead of a generic hard failure.
5. Keep the route contract minimal so patient-search can surface the truthful message without needing a broad UI rewrite.

## Files Touched

- apps/web/src/app/patient-search/page.tsx
- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-add-medication.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes

- Verify Docker and API health before and after edits.
- Test allergy, vitals, notes, and medication writes through the live API with clinician auth and a real CSRF token.
- Confirm allergy, vitals, and notes return ok:true with live VistA RPC results.
- Confirm medication returns either a real VistA success or a truthful sync-pending draft response.