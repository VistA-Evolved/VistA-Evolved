# Phase 617 - IMPLEMENT - CPRS Orders Active Order Recovery

## User Request
- Continue autonomously until the full clinician UI is actually working.
- Keep the work VistA-first and truthful end to end.
- Inspect historical prompts before changing code.
- Do not accept prior AI work as complete unless the live frontend, backend, VistA/database, and user workflow are all honest and working.

## Implementation Steps
1. Inventory the existing CPRS Orders panel, Phase 59/154/302/605/579 prompt lineage, and the live `/vista/cprs/orders` contract before editing.
2. Fix the active-orders backend contract so `GET /vista/cprs/orders` returns clinically usable rows instead of raw `ORWORR AGET` fragments.
3. Use real VistA follow-up RPCs to enrich active orders when needed, preferring `ORWORR GETBYIFN` and `ORWORR GETTXT` over fake display text.
4. Preserve truthful fallback posture when enrichment is unavailable or incomplete, including `rpcUsed`, source, and raw line traceability.
5. Upgrade the CPRS Orders panel so live VistA orders can be selected and acted on from the chart instead of being displayed as a disconnected read-only table.
6. Surface only honest actions from the existing backend route surface: order checks, sign, discontinue, verify, and flag, with explicit pending/blocked messaging when VistA cannot complete the workflow.
7. Keep local draft orders and real VistA orders visually distinct while allowing the chart detail pane to work for both.
8. Update runbook and ops artifacts with the exact curl-based live verification steps and the scope of the recovery.

## Verification Steps
1. Confirm `vehu` and `ve-platform-db` are running.
2. Confirm the API starts cleanly or is already healthy with `/vista/ping` and `/health`.
3. Login with `PRO1234 / PRO1234!!` and verify `GET /vista/cprs/orders?dfn=46` returns `ok:true` plus human-usable order rows from live VistA data.
4. Probe enrichment RPC behavior against live VistA for the returned order IENs and confirm the route stays truthful when some fields are unavailable.
5. Exercise the Orders panel in the browser for DFN 46 and verify active orders are selectable and the detail pane reflects the selected real VistA order.
6. Run at least one truthful action path from the UI or API for an active order, and verify the response is either real success or explicit pending/blocked status.
7. Run the relevant verifier script and capture results in ops artifacts.

## Files Touched
- prompts/617-PHASE-617-CPRS-ORDERS-ACTIVE-ORDER-RECOVERY/617-01-IMPLEMENT.md
- prompts/617-PHASE-617-CPRS-ORDERS-ACTIVE-ORDER-RECOVERY/617-99-VERIFY.md
- apps/api/src/routes/cprs/orders-cpoe.ts
- apps/web/src/components/cprs/panels/OrdersPanel.tsx
- docs/runbooks/<orders-runbook>.md
- ops/summary.md
- ops/notion-update.json
