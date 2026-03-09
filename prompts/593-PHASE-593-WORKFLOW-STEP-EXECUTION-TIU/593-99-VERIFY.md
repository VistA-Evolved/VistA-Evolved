# Phase 593 — VERIFY

## Verification Steps

1. Docker and API health are green.
2. `/admin/workflows/definitions`, `/admin/workflows/packs`, `/admin/workflows/stats`, and `/workflows/instances` still return 200.
3. A clinician session can start a workflow instance through the same backend contract used by the UI.
4. Completing a TIU-backed workflow note/report step returns a truthful integration result with TIU RPC usage.
5. The workflow instance remains durable after API restart.
6. `scripts/verify-latest.ps1` passes.
