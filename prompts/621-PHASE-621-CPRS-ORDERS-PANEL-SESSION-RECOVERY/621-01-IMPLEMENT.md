# Phase 621 - IMPLEMENT: CPRS Orders Panel Session Recovery

## Implementation Steps

1. Reproduce the authenticated Orders panel mismatch where the browser shows `Source: pending` while the live `/vista/cprs/orders` route returns real VistA data.
2. Confirm the backend route is healthy with a live VEHU login before changing frontend code.
3. Trace the Orders panel fetch lifecycle and identify whether the panel is reading stale unauthenticated state before the session provider becomes ready.
4. Gate the Orders panel read fetch on authenticated session readiness so the panel does not lock into a false pending posture.
5. Preserve retry behavior for genuine pending VistA responses after session readiness is established.
6. Re-run authenticated browser verification to confirm the Orders tab renders the live active order for DFN 46.

## Files Touched

- apps/web/src/components/cprs/panels/OrdersPanel.tsx
