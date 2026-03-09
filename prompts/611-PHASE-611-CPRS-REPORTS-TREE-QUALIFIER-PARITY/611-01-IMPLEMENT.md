# Phase 611 — CPRS Reports Tree + Qualifier Parity (IMPLEMENT)

## User Request

Continue closing AI-left parity gaps so the CPRS web UI works truthfully and fully for the user with VistA-first behavior. The Reports tab must move beyond a flat list and support the real CPRS report-selection flow using the original implementation intent and native VistA RPC behavior.

## Implementation Steps

1. Inventory the original CPRS reports workflow from the extracted Delphi sources under `reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/`, especially `rReports.pas` and `fReports.pas`.
2. Confirm the current live VEHU payload from `GET /vista/reports?dfn=46` and identify the missing user-facing depth: category tree, Health Summary children, and date-range qualifiers.
3. Update the reports API contract in `apps/api/src/server/inline-routes.ts` so `GET /vista/reports` returns enough metadata for a CPRS-style tree and `GET /vista/reports/text` accepts CPRS qualifier tokens (`d*`, `h*`, `i*`, and explicit date ranges) and maps them into the real `ORWRP REPORT TEXT` arguments.
4. Expand the report type model in `apps/web/src/stores/data-cache.tsx` so the Reports panel can render grouped reports without losing the existing cache metadata truthfulness contract.
5. Rewrite `apps/web/src/components/cprs/panels/ReportsPanel.tsx` to render a real grouped report browser with Health Summary children, qualifier controls for date-range and Health Summary reports, and a grounded report viewer.
6. Preserve the imaging/report viewer additions from Phase 18C while improving the main report workflow instead of replacing it.
7. Update runbook coverage in `docs/runbooks/vista-rpc-phase12-parity.md` and any other directly relevant reporting docs so the report qualifier contract matches the code.
8. Keep the implementation minimal and VistA-first. Do not invent platform-side clinical report generation.

## Implemented Notes

- `GET /vista/reports` now returns grouped report metadata (`sectionId`, `sectionLabel`, `qualifierType`, `localOnly`) plus parsed `dateRangeOptions` and `hsTypeOptions` from the live `ORWRP REPORT LISTS` payload.
- `GET /vista/reports/text` now parses CPRS-style qualifier tokens and resolves them into the native `ORWRP REPORT TEXT` parameter slots for Health Summary, date-range, imaging, and explicit alpha/omega requests.
- `ReportsPanel.tsx` now renders grouped report sections, nested Health Summary type children, date-range controls for qualifying reports, and still preserves the Phase 18C imaging widget.
- Live VEHU proof for DFN 46 confirmed:
	- `qualifier=d30^One Month` resolves `daysBack:"30"`
	- `qualifier=h10^BRIEF CLINICAL^^^^^1` resolves `hsType:"10"` and returns real VistA Health Summary text
	- `qualifier=dS^Date Range...&alpha=2026-03-01&omega=2026-03-08` resolves FileMan `alpha/omega`

## Verification Steps

1. Verify Docker and API health before coding.
2. Run TypeScript validation for the touched web/api surfaces.
3. Live-test `GET /vista/reports?dfn=46` and confirm the returned metadata supports grouped report rendering.
4. Live-test `GET /vista/reports/text` with at least one date-range report using a real CPRS-style `d*` qualifier and confirm `ok:true` with `rpcUsed:"ORWRP REPORT TEXT"`.
5. Live-test `GET /vista/reports/text` with a Health Summary qualifier token and confirm the route parses the token truthfully.
6. Run the repo verifier and update ops artifacts only after live verification passes.

## Files Touched

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `docs/parity-coverage-report.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-01-IMPLEMENT.md`
- `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-99-VERIFY.md`
