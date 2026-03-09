## User Request

Continue the live CPRS chart audit until the full UI is working. Recover the next real user-facing defect rather than stopping at analysis.

## Problem

The CPRS Reports tab for DFN 46 shows a truthful failure card instead of a report catalog:

- `request-failed`
- RPC attempted: `ORWRP REPORT LISTS`
- Error: `Connection closed before response`

Live API reproduction:

- `GET /vista/reports?dfn=46` returns `{"ok":false,"error":"Connection closed before response","rpcUsed":"ORWRP REPORT LISTS"}`

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- Inspected: `apps/api/src/server/inline-routes.ts`
- Inspected: `apps/api/src/services/clinical-reports.ts`
- Inspected: `apps/api/src/routes/portal-auth.ts`
- Inspected: `apps/api/src/routes/record-portability.ts`

## Implementation Steps

1. Preserve the existing Reports panel API contract at `GET /vista/reports` and `GET /vista/reports/text`.
2. Replace raw `connect()/callRpc()/disconnect()` usage for `ORWRP REPORT LISTS` and `ORWRP REPORT TEXT` on user-facing paths with `safeCallRpc(...)`.
3. Keep current response shapes stable so the CPRS Reports tab and portal flows do not need unrelated UI rewrites.
4. Fix the root cause in shared/user-facing report code paths, not only in the CPRS panel.

## Verification Steps

1. Start the API against live VEHU Docker and confirm clean startup.
2. Login with `PRO1234 / PRO1234!!`.
3. Verify `GET /vista/reports?dfn=46` returns `ok:true` with real report catalog data and `rpcUsed: "ORWRP REPORT LISTS"`.
4. Verify `GET /vista/reports/text?dfn=46&id=<real-report-id>` returns `ok:true` with report text.
5. Reload the CPRS Reports tab in the browser and confirm the failure banner is replaced by a live report catalog.
6. Continue the chart audit after Reports is recovered.

## Files Touched

- `apps/api/src/server/inline-routes.ts`
- `apps/api/src/services/clinical-reports.ts`
- `apps/api/src/routes/portal-auth.ts`
- `apps/api/src/routes/record-portability.ts`