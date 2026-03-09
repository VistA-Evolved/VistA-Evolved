# Phase 623 - CPRS Tasks Tenant Context Recovery

## User request

Continue the CPRS chart audit until the clinician UI is working truthfully end to end. Recover the Tasks tab if it is silently failing or masking backend errors.

## Inventory first

- Inspect `apps/api/src/middleware/security.ts` auth rule ordering for `/portal/staff/*`.
- Inspect `apps/api/src/middleware/module-guard.ts` tenant-resolution requirements.
- Inspect `apps/api/src/routes/portal-core.ts` staff queue endpoints used by the CPRS Tasks tab.
- Inspect `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx` error handling and empty-state behavior.

## Implementation steps

1. Reproduce the failure from the authenticated chart page and direct API fetches.
2. Fix auth rule ordering so clinician staff queue routes load session context before the module guard runs.
3. Preserve the existing portal patient-session behavior for the rest of `/portal/*`.
4. Update the CPRS Tasks panel to surface backend failures truthfully instead of rendering silent empty states.
5. Keep changes minimal and consistent with the existing route and panel contracts.

## Verification steps

1. Confirm `/portal/staff/messages`, `/portal/staff/refills`, and `/portal/staff/tasks` no longer return `TENANT_REQUIRED` for an authenticated clinician session.
2. Confirm each endpoint returns `ok: true` with tenant-scoped data or an explicit truthful empty result.
3. Reload the CPRS Tasks tab in the browser and verify it no longer shows false empty-state text after backend failures.
4. If queues are empty, verify the panel still reports a truthful source/error state rather than masking transport/auth failures.

## Files touched

- `apps/api/src/middleware/security.ts`
- `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`