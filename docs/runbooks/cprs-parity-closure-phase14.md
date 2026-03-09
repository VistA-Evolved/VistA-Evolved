# Runbook: CPRS Parity Closure — Phase 14

## Overview

Phase 14 introduces the VistA Compatibility Layer that detects RPC availability
at runtime and provides structured fallback behavior. This eliminates WARNs
from the verifier for known sandbox-missing RPCs and enables write-back
operations with server-side draft storage.

## Architecture

### RPC Capability Discovery

```
Client → GET /vista/rpc-capabilities → API → VistA (probe each RPC)
                                        ↓
                                   Cache (5min TTL)
                                        ↓
                              { rpcs: { "ORWPT LIST ALL": { available: true }, ... } }
```

### Write-back Flow

```
Client → POST /vista/orders/sign → API
                                    ↓
                         optionalRpc("ORWDX SAVE")
                              ↙          ↘
                        available?      not available?
                           ↓                 ↓
                     callRpc()        createDraft()
                           ↓                 ↓
                     { mode: "real" }  { mode: "draft", syncPending: true }
```

## New Endpoints

| Method | Path                    | Description                     |
| ------ | ----------------------- | ------------------------------- |
| GET    | /vista/rpc-capabilities | RPC availability map            |
| POST   | /vista/orders/sign      | Sign order (real or draft)      |
| POST   | /vista/orders/release   | Release signed order            |
| POST   | /vista/labs/ack         | Acknowledge lab result          |
| POST   | /vista/consults/create  | Create consult request          |
| POST   | /vista/surgery/create   | Create surgery record           |
| POST   | /vista/problems/save    | Add/edit problem                |
| GET    | /vista/drafts           | List pending server-side drafts |
| GET    | /vista/drafts/stats     | Draft count summary             |
| GET    | /vista/write-audit      | Write-back audit trail          |
| GET    | /vista/imaging/status   | Imaging viewer availability     |
| GET    | /vista/imaging/report   | Radiology report text           |

## New Files

| File                                  | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| apps/api/src/vista/rpcCapabilities.ts | Capability discovery engine + cache |
| apps/api/src/routes/capabilities.ts   | GET /vista/rpc-capabilities route   |
| apps/api/src/routes/write-backs.ts    | Write-back endpoints + draft store  |
| apps/api/src/routes/imaging.ts        | Imaging viewer integration          |

## Modified Files

| File                                              | Change                                     |
| ------------------------------------------------- | ------------------------------------------ |
| apps/api/src/index.ts                             | Import + register new route plugins        |
| apps/api/src/routes/inbox.ts                      | Use capability layer for inbox RPCs        |
| apps/web/src/stores/data-cache.tsx                | Wire signOrder/releaseOrder/ackLabs to API |
| apps/web/src/components/cprs/panels/LabsPanel.tsx | Server-side ack                            |

## Labs Panel Truth Contract

- The Labs Results view must not expose an enabled primary acknowledge action until at least one lab result row is selected.
- For empty live-result patients such as VEHU DFN 46, the panel should truthfully show `0 live result(s)` and keep the acknowledge action disabled instead of surfacing a dead click.
- The panel must reconcile the selected result and selected acknowledgement ids against the latest live `/vista/labs` response instead of keeping stale client-side selection after refresh.
- When a refreshed live result set is empty or no longer contains the previously selected row, the detail panel selection must clear or move to a valid live row.
- When one or more selectable results are checked, the existing `ORWLRR ACK` path remains the write contract.
- The standalone acknowledge dialog must describe `mode: "draft"` acknowledgements as server-side draft storage, not as a local-only save path.
- In the Labs Orders view, `Submit VistA Request` must stay disabled until the VistA Lab Test Request field is populated.
- In the Labs Orders view, `Create Workflow Order` must stay disabled until Test Name is populated.
- In the Labs Specimens view, `Create Specimen` must stay disabled until Order and Accession Number are populated.
- In the Labs Result entry view, `Record Result` must stay disabled until Order, Analyte, and Value are populated.

## Standalone CPRS Write Dialog Truth Contract

- Standalone CPRS write dialogs must describe `mode: "draft"` write fallbacks as server-side draft storage rather than local-only saves.
- This applies to the current allergy add, problem add, problem edit, vital add, and note create dialogs.
- When a route returns `mode: "real"`, the dialog may report direct VistA success.
- When a route returns `mode: "draft"`, the dialog must explain that VistA sync is pending against a server-side draft rather than implying the data only exists in the browser.

## AI Assist Truth Contract

- The AI Assist `Intake Summary` action must not present an enabled generate button when the current patient has no intake sessions.
- For patients such as VEHU DFN 46 where `GET /intake/by-patient/46` returns `{"ok":true,"sessions":[]}`, the panel must keep `Generate Intake Summary` disabled before any click.
- The panel should explain that a real intake session is required instead of discovering the block only after the user attempts generation.
- When intake sessions do exist, the existing governed generation, audit, and clinician-confirmation flow remains the contract.

## Imaging Truth Contract

- The Imaging `Create Order` action must not present an enabled primary button while the required `Procedure` and `Clinical Indication` fields are blank.
- For patients such as VEHU DFN 46, opening `/cprs/chart/46/imaging` -> `New Order` should keep `Create Order` disabled until both required fields are populated.
- The panel should explain the required fields before submit instead of discovering the block only after the user clicks into a submit-time validation error.
- Once both required fields are present, the existing `POST /imaging/worklist/orders` workflow remains the contract.

## Reports Truth Contract

- The Reports `Load Custom Range` action must not present an enabled button while either `Start Date` or `End Date` is missing.
- For date-range reports such as `Lab Status`, choosing `Date Range...` should keep `Load Custom Range` disabled until both dates are populated.
- The panel should not wait for a failed click to reveal that required dates are missing.
- Once both dates are present, the existing live report-loading path remains the contract.

## Tasks Truth Contract

- The chart Tasks `Staff Queue` view must explicitly represent the patient portal staff queue, not the clinician VistA MailMan inbox.
- For current-patient queue items such as `Rate limit proof 7`, `/cprs/chart/46/tasks` should direct clinicians to File > Messages / MailMan when they need direct MailMan access.
- The Tasks `Send Reply` action must not present an enabled button while the inline reply textarea is blank.
- Once non-whitespace reply text is present, the existing patient portal staff messaging reply workflow remains the contract.

## MailMan Truth Contract

- The clinician `/cprs/messages` screen must read and send directly through VistA MailMan rather than presenting a local fallback posture.
- The page should identify itself as VistA MailMan and should not show local-only or fallback status text to clinicians.
- Clinician compose success must reflect actual VistA MailMan acceptance instead of reporting local cache success.
- The File menu must expose a direct `Messages / MailMan` navigation path so clinicians can reach the real MailMan screen without detouring through unrelated queue views.

## Problems Onset Truth Contract

- The clinician Problems surfaces must preserve the precision of VistA/FileMan onset dates instead of fabricating impossible full dates.
- For partial onset values such as the PTSD problem on VEHU DFN 46, `/vista/problems?dfn=46` should return `1975-04` rather than `1975-04-00`.
- The Cover Sheet and Problems tab must render the truthful normalized value returned by the API instead of displaying a placeholder day of `00`.
- Full dates should remain `YYYY-MM-DD`, month-only dates should render `YYYY-MM`, and year-only dates should render `YYYY`.

## Orders Draft Cache Truth Contract

- The Orders panel must clearly distinguish live VistA active orders from local draft-cache rows.
- When `/vista/cprs/orders?dfn=46` returns live orders for the selected type, the lower split-pane must not imply that no such orders exist.
- Empty local-cache messaging must explicitly say `draft orders in local cache` and, when applicable, point clinicians to the live VistA orders shown above.
- Order actions and routing remain governed by the existing live `/vista/cprs/orders*` contracts.

## Consults Selection Truth Contract

- The Consults panel must reconcile the selected consult against the latest live `/vista/consults` payload after refreshes and patient changes.
- If the currently selected consult is no longer present in the live list, the detail pane must clear instead of preserving stale service, type, status, or detail text.
- If the selected consult still exists, the panel may preserve the selection using the fresh live row object.
- The consult list and detail workflows remain governed by the live `ORQQCN LIST` and `ORQQCN DETAIL` contracts.

## Medications Selection Truth Contract

- The Medications panel must reconcile the selected medication against the latest live `/vista/medications` payload after refreshes and patient changes.
- If the currently selected medication is no longer present in the live list, the detail pane must clear instead of preserving stale medication name, sig, or status.
- If the selected medication still exists, the panel may preserve the selection using the fresh live row object.
- Medication list truth remains governed by the live `ORWPS ACTIVE` and active-order fallback contract returned by `/vista/medications`.

## Notes Selection Truth Contract

- The Notes panel must reconcile the selected note against the latest live `/vista/notes` payload after refreshes and patient changes.
- If the currently selected note is no longer present in the live TIU list, the detail pane, note text, sign dialog, and addendum state must clear instead of preserving stale note context.
- If the selected note still exists, the panel may preserve the selection using the fresh live row object.
- Notes read, sign, and addendum workflows remain governed by the live TIU contracts already exposed through the current notes routes.

## Chart Route Alias Truth Contract

- The CPRS chart route must normalize legacy Cover Sheet slug variants before validating the requested tab.
- For redirected URLs such as `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet`, successful sign-in must land on `/cprs/chart/46/cover` instead of a `NEXT_HTTP_ERROR_FALLBACK;404` chart error view.
- For redirected URLs such as `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fdc-summaries`, `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fai-assist`, and `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Ftele-health`, successful sign-in must recover to `/cprs/chart/46/dcsumm`, `/cprs/chart/46/aiassist`, and `/cprs/chart/46/telehealth` respectively instead of a chart error view.
- Cover Sheet module gating, tab highlighting, panel rendering, and inspector wiring must all resolve against the canonical `cover` tab slug.
- Tab alias recovery must preserve canonical gating and rendering for `cover`, `dcsumm`, `aiassist`, and `telehealth`.
- Non-aliased invalid tab slugs should continue to fall through to the existing `notFound()` behavior.

## Surgery Selection Truth Contract

- The Surgery panel must reconcile the selected surgical case against the latest live `/vista/surgery` payload after refreshes and patient changes.
- If the currently selected case is no longer present in the live surgery list, the left pane and detail pane must clear instead of preserving stale case rows or operative detail.
- The panel must not keep a stale client-side surgery list alive after the live VistA list is empty.
- Surgery list and detail workflows remain governed by the live `ORWSR LIST` and surgery detail routes.

## D/C Summary Selection Truth Contract

- The D/C Summary panel must reconcile the selected summary against the latest live `/vista/dc-summaries` payload after refreshes and patient changes.
- If the currently selected discharge summary is no longer present in the live TIU list, the selection and full-text pane must clear instead of preserving stale summary text.
- If the selected summary still exists, the panel may preserve the selection using the fresh live row object.
- Discharge summary list and full-text workflows remain governed by the live TIU routes already exposed through the chart.

## Reports Selection Truth Contract

- The Reports panel must reconcile the selected report and qualifier state against the latest live `/vista/reports` catalog after refreshes and patient changes.
- If the currently selected report disappears from the live catalog, the selection, qualifier state, and rendered report text must clear instead of preserving stale report context.
- If a selected qualifier is no longer valid for the current live catalog, the panel must clear the invalid qualifier and its dependent text state.
- Report catalog and text workflows remain governed by the live `ORWRP REPORT LISTS` and `ORWRP REPORT TEXT` routes.

## Configuration

| Env Variable            | Default | Description                         |
| ----------------------- | ------- | ----------------------------------- |
| VISTA_CAPABILITY_TTL_MS | 300000  | Cache TTL for RPC capabilities (ms) |

## Verification

```powershell
.\scripts\verify-phase1-to-phase14-parity-closure.ps1
```

Expected: All PASS, 0 WARN, 0 FAIL.

## Manual Testing

```powershell
# 1. Check capabilities
curl http://127.0.0.1:3001/vista/rpc-capabilities

# 2. Test order signing (will use draft mode on WorldVistA)
$body = '{"dfn":"1","orderId":"test-1","signedBy":"PROVIDER"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/vista/orders/sign -Method POST -Body $body -ContentType "application/json"

# 3. Check drafts
curl http://127.0.0.1:3001/vista/drafts

# 4. Check imaging status
curl http://127.0.0.1:3001/vista/imaging/status
```

## Known Gaps (Post-Phase 14)

These items remain in the "missing in distro" category—they require RPCs
not present in the WorldVistA Docker sandbox and cannot be simulated:

1. **Encounter management** — ORWPCE SAVE (requires encounter framework)
2. **Full order dialog** — ORWDX SAVE (requires order dialog IEN setup)
3. **Remote facility data** — ORWCIRN FACILITIES (single-facility sandbox)
4. **VistA Imaging gateway** — MAG4 REMOTE PROCEDURE (VistA Imaging not installed)
5. **Lab charting** — ORWLRR CHART (not available on sandbox)

All gaps have structured fallbacks and are documented in the capability map.
