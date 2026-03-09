# Phase 619 - CPRS Wave 1 RPC Context Hardening

## User Request

- Continue autonomous VistA-first recovery work.
- Explain and fix how Cover Sheet helper routes should behave under many concurrent users and tenants.
- Keep the full CPRS UI truthful from the real end-user perspective.

## Problem Statement

The repository already contains the intended tenant-aware, DUZ-aware RPC connection pool from Phase 573, but some CPRS Wave 1 helper routes still mix pooled `safeCallRpc(...)` calls with legacy singleton broker helpers. That split-brain path can look acceptable in light use while still undermining concurrency safety, cross-user attribution, and tenant isolation. The Cover Sheet UI also still has one false-empty presentation path for appointments when the backend is actually integration-pending.

## Implementation Steps

1. Preserve the existing pooled RPC architecture and remove legacy broker usage from Cover Sheet-supporting Wave 1 routes.
2. Require an authenticated session inside each affected route so reads stay aligned with the request-scoped RPC context.
3. Use the session DUZ for order-summary reads instead of any legacy broker-global DUZ state.
4. Keep response semantics truthful: real data, live empty, or explicit integration-pending only.
5. Fix the Cover Sheet appointments panel so pending-plus-empty renders as pending, not as a false empty state.
6. Reset bounded retry bookkeeping when a fresh Cover Sheet load cycle begins so transient failures can self-heal predictably.

## Verification Steps

1. Run targeted API/web diagnostics on the touched files.
2. Start or use the live API against VEHU and verify the affected routes with an authenticated session.
3. Re-open the CPRS Cover Sheet for DFN 46 and confirm appointments, reminders, and orders summary render truthfully.
4. Confirm no legacy broker connect/disconnect lifecycle remains in the touched Wave 1 helper routes.

## Files Touched

- prompts/619-PHASE-619-CPRS-WAVE1-RPC-CONTEXT-HARDENING/619-01-IMPLEMENT.md
- prompts/619-PHASE-619-CPRS-WAVE1-RPC-CONTEXT-HARDENING/619-99-VERIFY.md
- apps/api/src/routes/cprs/wave1-routes.ts
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx