## User Request

Continue the live CPRS chart audit and fix the next user-facing defect surfaced during verification.

## Problem

The CPRS layout shows a global degraded banner saying `VistA EHR is unreachable. Read-only mode — writes are blocked.` while the live backend reports:

- `/vista/ping` => `{"ok":true,"vista":"reachable"}`
- `/ready` => `{"ok":false,"vista":"reachable","circuitBreaker":"open"}`

The banner is reading `/ready` but misclassifying `ok:false` as a VistA outage instead of a circuit-breaker degradation.

## Inventory

- Inspected: `apps/web/src/components/cprs/DegradedBanner.tsx`
- Inspected: `apps/api/src/server/inline-routes.ts`

## Implementation Steps

1. Preserve `/ready` as the source of truth for write-guard posture.
2. Distinguish these states in the frontend:
   - API unreachable
   - VistA unreachable
   - VistA reachable but circuit breaker open / degraded
3. Keep write guards conservative (`canWrite` false unless truly healthy), but make the banner text truthful.

## Verification Steps

1. Confirm `/ready` returns `vista:"reachable"` while `ok:false`.
2. Reload CPRS and confirm the banner no longer says VistA is unreachable in that state.
3. Confirm the banner disappears when the system returns to healthy state.

## Files Touched

- `apps/web/src/components/cprs/DegradedBanner.tsx`