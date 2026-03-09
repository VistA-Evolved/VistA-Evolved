# Runbook: Phase 12 — CPRS Parity Wiring

## Overview

Phase 12 wires 5 remaining CPRS tab panels to real VistA RPCs, fixes 3 local-only
dialogs, and adds Graphing, Remote Data Viewer, and Legacy Console features.

## Prerequisites

- WorldVistA Docker running on port 9430
- `apps/api/.env.local` configured with PROV123 / PROV123!!
- API server running on port 3001

## New API Endpoints

### ICD Lexicon Search

```
GET /vista/icd-search?q=hypertension
→ ORQQPL4 LEX
→ Returns: { ok, results: [{ id, description, icd }] }
```

### Consults

```
GET /vista/consults?dfn=1
→ ORQQCN LIST [DFN, "", "", "", ""]
→ Returns: { ok, results: [{ id, date, status, service, type }] }

GET /vista/consults/detail?id=123
→ ORQQCN DETAIL [id]
→ Returns: { ok, text }
```

### Clinical Procedures

```
GET /vista/clinical-procedures?dfn=69
→ TIU IDENTIFY CLINPROC CLASS []
→ TIU DOCUMENTS BY CONTEXT [DFN, classIen, ...] when the Clinical Procedures TIU class exists
→ Falls back to ORQQCN LIST [DFN, "", "", "", ""] when the TIU class is empty in VEHU
→ Returns: { ok, source, classIen, results: [{ id, entryType, procedureName, datePerformed, status }], rpcUsed }

GET /vista/clinical-procedures/395?kind=consult
→ ORQQCN DETAIL [id]
→ Returns: { ok, entryType, text, rpcUsed }

GET /vista/clinical-procedures/consult-link?dfn=69&consultId=395
→ ORQQCN LIST [DFN, "", "", "", ""]
→ ORQQCN DETAIL [consultId]
→ Returns: { ok, results, selectedConsultId, detailText, rpcUsed, vistaGrounding }

GET /vista/clinical-procedures/medicine?dfn=69
→ No fake data
→ Returns: integration-pending grounding for MD TMDPATIENT / MD TMDWIDGET / MD TMDCIDC while sandbox medicine data remains unavailable
```

### Surgery

```
GET /vista/surgery?dfn=69
→ ORWSR LIST [DFN, "", "", "-1", "999"]
→ Returns: { ok, results: [{ id, caseNum, procedure, date, surgeon }] }

GET /vista/surgery/detail?id=10021&dfn=69
→ ORWSR ONECASE [id]
→ When VEHU returns a case-header M error, forces a clean broker reconnect and re-probes linked document rows through ORWSR LIST [DFN, "", "", "-1", "999"]
→ TIU GET RECORD TEXT [linkedNoteId]
→ TIU DETAILED DISPLAY [linkedNoteId]
→ Returns: { ok, resolvedFromId, noteId, linkedDocuments, text, detail, rpcUsed }
```

### Discharge Summaries

```
GET /vista/dc-summaries?dfn=1
→ TIU DOCUMENTS BY CONTEXT [CLASS=244, signed + unsigned]
→ Returns: { ok, results: [{ id, title, date, author, location, status }] }

GET /vista/tiu-text?id=123
→ TIU GET RECORD TEXT [id]
→ Returns: { ok, text }
```

### Labs

```
GET /vista/labs?dfn=46
→ ORWLRR INTERIM [DFN, "", ""]
→ Returns: { ok, results: [{ id, name, date, status, value }], rawText }

GET /lab/orders?dfn=46
→ Returns: { ok, orders: [{ id, testName, specimenType, priority, status, vistaOrderIen }] }

POST /lab/orders
→ Body: { dfn, testName, specimenType, priority, collectionInstructions? }
→ Returns: { ok, order }

GET /lab/specimens?dfn=46
→ Returns: { ok, specimens: [{ id, labOrderId, accessionNumber, specimenType, status }] }

GET /lab/results?dfn=46
→ Returns: { ok, results: [{ id, labOrderId, analyteName, value, units, flag, status }] }

GET /lab/critical-alerts?dfn=46
→ Returns: { ok, alerts: [{ id, analyteName, value, threshold, status, readBackVerified }] }

GET /lab/writeback-posture
→ Returns: { ok, posture }
```

The CPRS Labs tab now combines both layers truthfully:
- live VistA result reads via the shared cache-backed `/vista/labs?dfn=` contract
- deep operational workflow views for orders, specimens, critical alerts, and writeback posture via `/lab/*`
- recording a workflow result now advances the backing workflow order into a post-result lifecycle state so `/lab/orders`, `/lab/results`, and `/lab/dashboard` stay internally consistent
- workflow actions stay visible even when the sandbox cannot prove every VistA write path; the panel surfaces posture instead of faking completion

### ADT

```
GET /vista/adt/census
→ ORQPT WARDS []
→ ORQPT WARD PATIENTS [wardIen] per ward
→ Returns: { ok, results: [{ ien, name, patientCount }], rpcUsed, pendingTargets }

GET /vista/adt/census?ward=38
→ ORQPT WARD PATIENTS [38]
→ ORWPT16 ADMITLST [dfn] for admitted-patient enrichment when available
→ Returns: { ok, results: [{ dfn, name, admitDate, ward, roomBed }], rpcUsed, pendingTargets }

GET /vista/adt/movements?dfn=46
→ ORWPT16 ADMITLST [DFN]
→ Returns: { ok, results, rpcUsed, pendingTargets, _note }
```

The CPRS ADT tab now exposes the Phase 137 depth already present in the backend:
- live ward census summary via `/vista/adt/census`
- ward drill-down census detail from the same live route
- movement timeline via `/vista/adt/movements?dfn=` with explicit partial-history posture when VEHU only exposes admission events
- truthful ADT write posture for admit/transfer/discharge instead of fake DG completion
- chart-tab module gating now recognizes ADT and other post-Phase-17 chart tabs consistently with the enabled clinical shell

### Immunizations

```
GET /vista/immunizations?dfn=46
→ ORQQPX IMMUN LIST [DFN]
→ Returns: { ok, count, results: [{ ien, name, dateTime, reaction, inverseDt }], rpcUsed, pendingTargets }

GET /vista/immunizations/catalog
→ PXVIMM IMM SHORT LIST []
→ Returns: { ok, count, results: [{ ien, name }], rpcUsed, pendingTargets }

POST /vista/immunizations?dfn=46
→ No fake write
→ Returns: integration-pending grounding for PX SAVE DATA while encounter-context immunization writeback is still unproven in VEHU
```

The CPRS Immunizations tab now exposes the Phase 65 read depth that already existed in the backend:
- live patient history via `/vista/immunizations?dfn=` with truthful empty-state handling when VEHU has no records for the selected patient
- live immunization catalog browsing via `/vista/immunizations/catalog`, including the raw VistA type-picker families surfaced as Imm IDs, Brands, and Groups
- add immunization now routes to an explicit writeback-posture view instead of a dead disabled control
- PX SAVE DATA remains clearly integration-pending until encounter/visit grounding is proven against live VistA

### Browser Read Truthfulness

- Shared browser clinical GETs now default to uncached `no-store` reads through the correlated fetch helper so the chart does not reuse stale cached payloads after live backend recoveries.
- The Cover Sheet custom reads and the standalone Immunizations panel use the same uncached fetch contract as cache-backed chart domains.
- `/vista/medications?dfn=` now retries the order-derived fallback once when `ORWPS ACTIVE` returns no rows during a concurrent Cover Sheet burst, which keeps the shared Cover Sheet medication card aligned with the standalone Meds tab.
- The Cover Sheet core-domain prefetch now runs sequentially again, which prevents the first medication request from racing alongside the rest of the chart burst and surfacing raw first-load ORWPS rows.
- `/vista/cprs/reminders?dfn=` now rejects broker/runtime error payloads and retries once before settling, so leaked RPC error text is never rendered as a fake clinical reminder row on the Cover Sheet.
- `/vista/allergies?dfn=` now runs on the session-bound pooled RPC path and retries once when `ORQQAL LIST` returns broker/runtime contamination, so foreign RPC error text is never parsed into a fake allergy row on the Cover Sheet.
- The session-bound pooled RPC transport now rejects stale unterminated buffer bytes and partial socket-close payloads instead of treating them as valid clinical responses, which prevents transient cross-RPC garbage from surfacing in chart reads such as Immunizations.
- `/vista/cprs/orders-summary?dfn=` now derives its unsigned-order fallback from the same normalized active-orders loader as the Orders tab instead of maintaining a separate weaker parser.
- The active-orders recovery sequence now runs under a single pooled RPC connection lock for `ORWORR AGET`, `ORWORR GETBYIFN`, and `ORWORR GETTXT`, which prevents Cover reload interleaving from producing malformed IDs or transient false-empty unsigned summaries.
- Orders Summary retries the normalized active-orders fallback once when Cover burst load transiently resolves zero unsigned rows, so the Cover Sheet card converges on the same truthful unsigned order row as the Orders tab.
- Cover Sheet and immunization-history table rows now use stable composite React keys instead of weak coarse identifiers, which prevents duplicate-key runtime overlays when VistA-derived rows reuse broad markers such as `CDC`, `IMM`, or `GROUP`.

### Orders

```
GET /vista/cprs/orders?dfn=46
→ ORWORR AGET [DFN]
→ ORWORR GETBYIFN [orderIen] per live active order row
→ ORWORR GETTXT [orderIen] when human-readable text needs recovery
→ Returns: { ok, source, filter, count, orders: [{ id, ien, name, details, status, displayGroup, startDate, provider, packageRef, orderType, textSource, raw, rawDetail, rpcUsed }], excludedRawCount, rpcUsed }

POST /vista/cprs/orders/verify
→ ORWDXA VERIFY [DFN, orderId, verifyAction]
→ Returns: { ok, mode, status, response, rpcUsed }

POST /vista/cprs/orders/flag
→ ORWDXA FLAG [orderId, flagReason]
→ Returns: { ok, mode, status, response, message, rpcUsed }
```

The CPRS Orders tab now recovers clinically usable active orders instead of exposing raw `ORWORR AGET` fragments:
- active rows are enriched through `ORWORR GETBYIFN` and `ORWORR GETTXT` so medication text, provider, package, and start date are readable in the chart
- placeholder rows are filtered out and counted in `excludedRawCount` instead of being shown as broken orders
- live VistA orders remain visually distinct from local drafts, but both can now drive the shared detail pane truthfully
- the chart now surfaces honest verify and flag actions against the existing live backend routes instead of treating VistA orders as a disconnected read-only table
- `/vista/cprs/orders-summary?dfn=` now reuses the same normalized active-order dataset for its unsigned-order recovery path, so the Cover Sheet Orders Summary card and the standalone Orders tab resolve the same canonical order IEN and text
- under the verified VEHU clinician workflow for DFN 46, both the direct route and the real Cover reload now converge on the truthful unsigned order row `8207;8` dated `2026-03-08`

### Reports

```
GET /vista/reports
→ ORWRP REPORT LISTS []
→ Returns: {
    ok,
    reports: [{ id, name, hsType, qualifier, qualifierType, sectionLabel, localOnly }],
    sections,
    dateRangeOptions,
    hsTypeOptions
  }

Catalog parity notes:
- `OR_PN` is now explicitly mapped to the dedicated `OR_PNMN` / `Progress Notes` section when VEHU returns the report row before the section heading in `ORWRP REPORT LISTS`.
- This preserves CPRS-style report tree grouping without changing the raw VistA catalog evidence returned in `rawReports`.

GET /vista/reports/text?dfn=46&id=11&qualifier=d30^One Month
→ ORWRP REPORT TEXT [DFN, id, "", "30", "", "", ""]
→ Returns: { ok, text, resolved, rpcUsed }

GET /vista/reports/text?dfn=46&id=1&qualifier=h10^BRIEF CLINICAL^^^^^1
→ ORWRP REPORT TEXT [DFN, id, "10", "", "", "", ""]
→ Returns: { ok, text, resolved, rpcUsed }

GET /vista/reports/text?dfn=46&id=11&qualifier=dS^Date Range...&alpha=2026-03-01&omega=2026-03-08
→ ORWRP REPORT TEXT [DFN, id, "", "", "", 3260301.000000, 3260308.000000]
→ Returns: { ok, text, resolved, rpcUsed }

GET /vista/reports/text?dfn=46&id=OR_PN
→ ORWRP REPORT TEXT [DFN, "OR_PN", "", "", "", "", ""]
→ If ORWRP returns blank text for Progress Notes in VEHU, fallback to TIU DOCUMENTS BY CONTEXT + TIU GET RECORD TEXT
→ Returns: { ok, text, resolved, rpcUsed, fallbackUsed, fallbackReason }
```

## Standalone Parity Panel Truthfulness Contract

- The standalone Consults, Surgery, D/C Summaries, Labs, and Reports tabs use shared `useDataCache()` metadata, not just list length.
- A successful live empty response still renders the normal empty-state copy for that tab.
- A failed or integration-pending list read renders a grounded pending banner with status, attempted RPCs, and target RPCs instead of a false empty-chart state.
- Tabs with local filters distinguish filter-empty results from chart-empty results.
- Target RPC grounding by panel:
  - Consults: `ORQQCN LIST`
  - Surgery: `ORWSR LIST`
  - D/C Summaries: `TIU DOCUMENTS BY CONTEXT`
  - Labs: `ORWLRR INTERIM`
  - Reports: `ORWRP REPORT LISTS`, `ORWRP REPORT TEXT`

## Testing

### Quick Smoke Test

```powershell
# Start services
cd services/vista; docker compose --profile dev up -d
cd apps/api; npx tsx --env-file=.env.local src/index.ts

# Verify endpoints
Invoke-RestMethod http://127.0.0.1:3001/vista/icd-search?q=diabetes
Invoke-RestMethod http://127.0.0.1:3001/vista/consults?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/clinical-procedures?dfn=69
Invoke-RestMethod 'http://127.0.0.1:3001/vista/clinical-procedures/395?kind=consult'
Invoke-RestMethod 'http://127.0.0.1:3001/vista/clinical-procedures/consult-link?dfn=69&consultId=395'
Invoke-RestMethod http://127.0.0.1:3001/vista/clinical-procedures/medicine?dfn=69
Invoke-RestMethod http://127.0.0.1:3001/vista/surgery?dfn=69
Invoke-RestMethod 'http://127.0.0.1:3001/vista/surgery/detail?id=10021&dfn=69'
Invoke-RestMethod http://127.0.0.1:3001/vista/dc-summaries?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/labs?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/reports
```

### Note on Test Data

The VEHU sandbox has limited clinical data for some domains, but surgery detail is now verified against DFN 69:

- Consults: 0 records (RPC works, no data)
- Clinical Procedures results: `GET /vista/clinical-procedures?dfn=69` returns `count:3` through consult fallback with `rpcUsed:["TIU IDENTIFY CLINPROC CLASS","TIU DOCUMENTS BY CONTEXT","ORQQCN LIST"]`
- Clinical Procedures detail: `GET /vista/clinical-procedures/395?kind=consult` returns full live consult-linked procedure text from `ORQQCN DETAIL`
- Clinical Procedures consult link: `GET /vista/clinical-procedures/consult-link?dfn=69&consultId=395` returns the live candidate consult list plus full selected consult detail; attach/detach writes remain pending until MD-package results exist
- Clinical Procedures medicine: remains integration-pending by design because VEHU exposes no useful patient-scoped medicine result data from the MD package RPC families
- Surgery list: DFN 69 returns 4 rows from `ORWSR LIST`
- Surgery detail: `GET /vista/surgery/detail?id=10021&dfn=69` resolves through linked note `3572` because VEHU throws `GETONE+5^ORWSR` on the case-header row itself
- D/C Summaries: 0 records (RPC works, no data)
- Labs: 0 records / "No Data Found" (RPC works, no data)
- Reports: 23 report types available (real catalog!)
- ICD Search: Returns real lexicon results for any query ≥ 2 chars

All endpoints return `ok: true` even with empty results. The RPCs are correctly
wired and will return real data when patients have clinical records.

## Troubleshooting

### "Not connected. Call connect() first."

Every endpoint must call `await connect()` before `callRpc()` and `disconnect()`
after. Check that the new endpoint follows the connect/disconnect pattern.

### "raw.split is not a function"

`callRpc()` returns a `string[]`, not a raw string. Don't call `.split()` on it.
Use `Array.isArray(lines) ? lines : [lines]` for safety.

### Intermittent pooled chart reads return malformed cross-RPC text

The DUZ-scoped RPC pool now treats any unterminated buffered bytes as connection corruption.
If this symptom reappears, inspect the pooled connection path first and confirm the response closed with an XWB EOT terminator rather than a partial socket close.

### ICD search returns swapped fields

ORQQPL4 LEX returns `IEN^Description^ICD-code`, not `IEN^ICD^Description`.
The description comes before the ICD code in the response.

### Reports text returns empty

Some report types require CPRS qualifier tokens, not just a bare report id.
Use the catalog metadata:

- Health Summary: pass an `h*` qualifier token such as `h10^BRIEF CLINICAL^^^^^1`
- Date-range reports: pass a `d*` qualifier token such as `d30^One Month`
- Custom date ranges: pass `alpha` and `omega` values; the route converts them to FileMan timestamps
