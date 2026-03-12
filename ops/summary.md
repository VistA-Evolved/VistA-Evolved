## Phase 726 Update - Portal Appointments Slice

## What changed
1. Fixed the portal appointments page so the honest scheduling-mode badge now loads through a portal-authenticated route instead of a clinician-session-only scheduling endpoint.
- `apps/api/src/routes/portal-core.ts`
- `apps/portal/src/lib/api.ts`

2. Recorded the completed portal appointments browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and portal app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/portal dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
2. Open `http://127.0.0.1:3002/dashboard/appointments` in a fresh signed-out browser context and confirm it fails closed back to the portal login page.
3. Sign in with `patient1 / Patient1!` and return to `/dashboard/appointments`.
4. Confirm the page shows the live appointment list and the badge `Request Only (Clinic Confirms)`.
5. Corroborate the backing routes from the authenticated browser context or cookie-backed client:
	- `GET /portal/appointments`
	- `GET /portal/appointments/mode`
6. Confirm `GET /portal/appointments/mode` returns `mode: request_only` and the page reflects that state in the visible badge.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the page silently swallowed `401 Authentication required` from clinician route `/scheduling/mode`, so the promised scheduling-mode badge never rendered even though the live portal appointments route was working.
- After the fix, `GET /portal/appointments/mode` returns the live request-only scheduling posture under the patient portal session, and the browser page renders the matching badge.

## Follow-ups
1. Continue the remaining portal dashboard routes in checklist order from `portal:/dashboard/consents`.

## Phase 726 Update - Portal AI Help Slice

## What changed
1. Fixed the portal AI Help route family so patient-facing AI requests now pass through the correct portal auth and tenant boundary instead of being blocked as clinician-scoped `/ai/*` requests.
- `apps/api/src/middleware/security.ts`
- `apps/api/src/middleware/module-guard.ts`

2. Fixed the portal client/page contract to match the live AI route payloads and request body shape.
- `apps/portal/src/lib/api.ts`
- `apps/portal/src/app/dashboard/ai-help/page.tsx`

3. Recorded the completed portal AI Help browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and portal app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/portal dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
2. Sign in to the portal at `http://127.0.0.1:3002/` with `patient1 / Patient1!`.
3. Open `/dashboard/ai-help` and confirm the `Lab Education` tab loads.
4. Enter `Hemoglobin A1c` and `6.2%`, click `Explain`, and confirm the page renders the governed educational explanation and disclaimer.
5. Switch to `Portal Help`, ask `How do I request a refill?`, and confirm the page renders the live navigation answer.
6. Corroborate the backing portal AI routes from the authenticated browser context or cookie-backed client:
	- `GET /portal/iam/csrf-token`
	- `POST /ai/portal/education` with `{ "labName": "Hemoglobin A1c", "labValue": "6.2%" }`
	- `POST /ai/portal/search` with `{ "question": "How do I request a refill?" }`
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the portal page posted the wrong request body to `/ai/portal/search`, expected the wrong response shape from both portal AI routes, and hit real auth/tenant failures because `/ai/portal/*` was still treated like clinician `/ai/*` traffic by the shared middleware.
- After the fix, both AI Help tabs render live governed responses under the patient portal session, and direct in-browser route corroboration shows `POST /ai/portal/education` returning `ok:true` with `explanation` and `POST /ai/portal/search` returning `ok:true` with `answer`.

## Follow-ups
1. Re-audit the remaining portal dashboard routes in checklist order now that the portal AI boundary is aligned with the live backend contract.

## Phase 726 Update - Preferences Slice

## What changed
1. Fixed `/cprs/settings/preferences` so the route now honors the CPRS session contract instead of exposing the editable preferences shell under unauthenticated access.
- `apps/web/src/app/cprs/settings/preferences/page.tsx`

2. Recorded the completed preferences browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. In a fresh unauthenticated browser context, open `/cprs/settings/preferences` and confirm the route redirects to `/cprs/login?redirect=%2Fcprs%2Fsettings%2Fpreferences`.
3. Authenticate as `PRO1234 / PRO1234!!` and confirm the preferences page renders the local controls for theme, density, layout mode, initial tab, and cover-sheet drag reorder.
4. Confirm the route behaves as a local settings surface rather than claiming any live VistA-backed data dependency.
5. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, `/cprs/settings/preferences` failed open and exposed editable local controls under an unauthenticated CPRS session.
- After the fix, unauthenticated access redirects to login and authenticated access remains a truthful local preferences surface.

## Follow-ups
1. No immediate follow-up for this slice; future work here is configuration UX, not live clinical truthfulness.

## Phase 726 Update - Remote Data Viewer Slice

## What changed
1. Fixed `/cprs/remote-data-viewer` so the route now honors the CPRS session contract instead of exposing a full viewer shell to unauthenticated users.
- `apps/web/src/app/cprs/remote-data-viewer/page.tsx`

2. Made the page truthful about the current stack by surfacing missing `/vista/remote-facilities` and `/vista/remote-data` routes plus unresolved tenant-backed registry state, instead of collapsing those failures into `No Remote Sources Available`.
- `apps/web/src/app/cprs/remote-data-viewer/page.tsx`

3. Recorded the completed remote-data-viewer browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Corroborate the backing routes on the canonical stack:
	- `curl.exe -s http://127.0.0.1:3001/vista/remote-facilities`
	- `curl.exe -s -b login-cookies.txt "http://127.0.0.1:3001/vista/remote-facilities"`
	- `curl.exe -s -b login-cookies.txt "http://127.0.0.1:3001/vista/remote-data?facility=test-source&domain=allergies&dfn=46"`
	- `curl.exe -s -b login-cookies.txt "http://127.0.0.1:3001/admin/registry/default"`
3. In a fresh unauthenticated browser context, open `/cprs/remote-data-viewer` and confirm the route redirects to `/cprs/login?redirect=%2Fcprs%2Fremote-data-viewer`.
4. Authenticate as `PRO1234 / PRO1234!!` and return to `/cprs/remote-data-viewer`.
5. Confirm the authenticated page shows the truthful unavailability banner naming the missing remote-data routes and unresolved tenant-backed registry state.
6. Confirm the query action is disabled until a patient is selected and the results pane says `Remote source contracts unavailable` rather than `No Remote Sources Available`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the page turned auth failures, `404` route misses, and the stale `admin/registry/default` tenant error into fake empty-source posture.
- After the fix, the page redirects when signed out and shows the real stack blockers when signed in, with no fake facility/source inventory.

## Follow-ups
1. If real remote-data routes or tenant-backed registry resolution are added later, this page should be re-audited so it can distinguish configured remote sources from the current missing-contract posture.

## Phase 726 Update - Order Sets Slice

## What changed
1. Fixed `/cprs/order-sets` so the route now honors the live CPRS session contract instead of rendering a full quick-order shell under unauthenticated access.
- `apps/web/src/app/cprs/order-sets/page.tsx`

2. Removed the hidden `DFN 1` fallback and made the page truthful about its role as local quick-order draft staging rather than live VistA order entry.
- `apps/web/src/app/cprs/order-sets/page.tsx`

3. Recorded the completed order-sets browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Corroborate the live order-set catalogs so the page is classified against reality rather than assumption:
	- `curl.exe -s -b login-cookies.txt "http://127.0.0.1:3001/admin/vista/clinical-setup/order-sets"`
	- `curl.exe -s -b login-cookies.txt "http://127.0.0.1:3001/vista/admin/order-sets"`
3. In a fresh unauthenticated browser context, open `/cprs/order-sets` and confirm the route redirects to `/cprs/login?redirect=%2Fcprs%2Forder-sets` instead of rendering the quick-order shell.
4. Authenticate as `PRO1234 / PRO1234!!` and return to `/cprs/order-sets` without a currently selected patient.
5. Confirm the authenticated page renders the truthful guarded state: `Select a patient to stage local quick-order drafts.`, the `Patient required.` banner, disabled `View Orders Tab`, and disabled template actions.
6. Confirm the footer text now describes the page as local CPRS web draft-cache staging instead of claiming this page itself performs the live VistA order-entry contract.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, `/cprs/order-sets` failed open under unauthenticated access and silently substituted `Patient DFN: 1`, which made the page look like a live, ready-to-use order-entry surface even when no authenticated session or current patient existed.
- After the fix, unauthenticated access redirects to login, authenticated access without a current patient stays non-actionable and truthful, and the page copy now matches its actual implementation as local quick-order draft staging.

## Follow-ups
1. If this route is later wired to live order-set retrieval or patient-scoped order creation, it should be re-audited so the UI can distinguish live VistA-backed catalogs from the current local template list.

## Phase 726 Update - CPRS Login Slice

## What changed
1. Browser-proved `/cprs/login` against the live `/auth/session` and `/auth/login` contract on the canonical VEHU stack.
- `apps/web/src/app/cprs/login/page.tsx`
- `apps/web/src/stores/session-context.tsx`

2. Recorded the completed login browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. In a fresh unauthenticated browser context, open `/cprs/login` and confirm the sign-on form renders with the verified VEHU dev account `PRO1234 / PRO1234!!` plus the lane guidance note.
3. Corroborate `GET /auth/session` returns `{"ok":false,"authenticated":false}` before login.
4. Submit the verified credentials and confirm the browser lands on `/cprs/patient-search`.
5. Corroborate `POST /auth/login` and authenticated `GET /auth/session` both return the live PROGRAMMER,ONE session payload with a `csrfToken`.
6. In an authenticated browser context, open `/cprs/login` again and confirm it redirects straight to `/cprs/patient-search` instead of re-rendering the sign-on form.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The page already matched the live auth contract on this stack, so no code change was required.
- Unauthenticated `/cprs/login` rendered the truthful VEHU sign-on form, valid sign-on redirected to patient search, and authenticated revisits to `/cprs/login` redirected away based on the existing session check.

## Follow-ups
1. No immediate follow-up for this slice; it is a clean proof baseline for later auth and redirect regression checks.

## Phase 726 Update - Inpatient Operations Slice

## What changed
1. Fixed `/cprs/inpatient` so the protected route now fails closed on bootstrap/auth failure instead of rendering the full inpatient shell, fake ward zero-state copy, and working-looking discharge-prep controls under unauthenticated access.
- `apps/web/src/app/cprs/inpatient/page.tsx`

2. Made the ADT and discharge-preparation workspace truthful on the current stack by parsing API errors strictly, separating live discharge-plan recovery from the missing `/vista/med-rec/*` route family, and disabling med-rec-specific actions behind an explicit integration-pending banner.
- `apps/web/src/app/cprs/inpatient/page.tsx`

3. Recorded the completed inpatient browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate as `PRO1234 / PRO1234!!` and open `/cprs/inpatient`.
3. Confirm the default Census tab shows the live ward buttons from `GET /vista/inpatient/wards`, and select `3 NORTH GU` to confirm the live `5` patient census from `GET /vista/inpatient/ward-census?ward=6`.
4. Open `ADT & Discharge Prep` and confirm the workspace shows `Mixed: discharge live, med-rec pending`, disables `Start Med Rec`, and lists the live discharge plan recovered from `GET /vista/discharge/plans?dfn=46`.
5. Load the recovered discharge plan and confirm the plan detail renders truthfully while medication reconciliation stays explicitly pending.
6. Open `/cprs/inpatient` in a fresh unauthenticated browser context and confirm the route fails closed with `Unable to load inpatient operations. Authentication required` instead of the full inpatient workspace.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated access still rendered the inpatient shell and ADT workspace, while the authenticated ADT view falsely claimed medication reconciliation was live even though `/vista/med-rec/sessions` and `/vista/med-rec/start` returned `404 Not Found` on the canonical stack.
- After the fix, the route boots behind a protected inpatient bootstrap, census and bedboard still match the live VistA reads, discharge-plan recovery stays live, and the missing `/vista/med-rec/*` contract is called out explicitly instead of being certified by fake zero-state workflow UI.

## Follow-ups
1. If medication reconciliation workflow routes are later added to the API, this page should be re-audited to re-enable the disabled controls and replace the current integration-pending banner with real session proof.

## Phase 726 Update - Workflows Slice

## What changed
1. Fixed `/cprs/admin/workflows` so the route body now fails closed on protected admin bootstrap failure instead of rendering a fake loaded workflow console with empty-state Definitions, Instances, Packs, Stats, and Switchboard tabs under auth failure.
- `apps/web/src/app/cprs/admin/workflows/page.tsx`

2. Added strict tab-level error handling so real backend failures no longer collapse into fake empty or zero-state workflow UI.
- `apps/web/src/app/cprs/admin/workflows/page.tsx`

3. Recorded the completed workflows browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate as `PRO1234 / PRO1234!!` and open `/cprs/admin/workflows`.
3. Confirm Definitions shows the live `8` seeded workflow definitions.
4. Confirm Packs shows the live `8` department workflow packs and Stats shows `8` total definitions, `8` active definitions, and `0` initial instances.
5. Open Switchboard and confirm it shows `5` registered FSMs; select `department-workflow` and confirm the live state/transition detail appears.
6. Start `ED Standard Visit` for DFN `46` and confirm the page switches to Instances with a live in-progress workflow instance and the expected step ladder.
7. Open `/cprs/admin/workflows` in a fresh unauthenticated browser context and confirm the route body fails closed with `Unable to load workflow manager. Authentication required` instead of fake empty-state tabs.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, every protected tab swallowed auth failures and rendered fake empty-state UI such as `No workflow definitions found`, `No active workflow instances`, `No stats available`, and `Registered FSMs (0)` even though the backing routes had already returned `Authentication required`.
- After the fix, the route body boots behind a protected admin check, authenticated tabs still match the live workflow and switchboard contracts, and unauthenticated access fails closed with explicit auth/load messaging.

## Follow-ups
1. This page has real write actions, so future slice work can extend from this truthful baseline into step completion and TIU-backed workflow note flows if deeper action proof is needed.

## Phase 726 Update - Unified VistA Admin Console Slice

## What changed
1. Fixed `/cprs/admin/vista-admin` so the route body now fails closed on protected admin bootstrap failure instead of rendering a fake loaded console with a public green VistA status, visible terminal toggle, and inline `HTTP 401` content errors.
- `apps/web/src/app/cprs/admin/vista-admin/page.tsx`

2. Corrected the exercised System tab data flow by loading only the active subtab dataset and wiring Security Keys to the real `/vista/admin/keys` endpoint.
- `apps/web/src/app/cprs/admin/vista-admin/page.tsx`

3. Recorded the completed unified VistA admin console proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate as `PRO1234 / PRO1234!!` and open `/cprs/admin/vista-admin`.
3. Confirm the default Users view shows the live `/vista/admin/users` contract, including `100 users` headed by `.5 POSTMASTER`, `.6 SHARED,MAIL`, and `1 PROGRAMMER,ONE`.
4. Open the Security Keys subtab and confirm it shows the live `/vista/admin/keys` list headed by `XUPROG`, `XUMGR`, and `XUPROGMODE` instead of `HTTP 404`.
5. Open the embedded terminal and confirm it connects as `PROGRAMMER,ONE (DUZ 1, role: admin)`.
6. Open `/cprs/admin/vista-admin` in a fresh unauthenticated browser context and confirm the route body fails closed with `Unable to load VistA admin console. Authentication required` instead of a usable-looking console shell.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated access still rendered the full console body with a public `VistA Connected` indicator and terminal toggle, while the authenticated Security Keys subtab hit a nonexistent route and the exercised System path did not stay aligned with the live backend contracts.
- After the fix, the route body boots behind a protected admin check, the Users and Security Keys subtabs match the live `/vista/admin/users` and `/vista/admin/keys` routes, the embedded terminal still connects under an authenticated session, and unauthenticated access fails closed in the route body.

## Follow-ups
1. This page remains a large consolidated admin surface over many `/vista/admin/*` endpoints, so future slice work should continue tab by tab if additional visible truth defects appear beyond the exercised System and terminal path.

## Phase 726 Update - VistA Hub Slice

## What changed
1. Fixed the VistA admin hub so protected quick stats now fail closed instead of rendering a fake loaded hub with placeholder metrics when the operational dashboard request fails with authentication errors.
- `apps/web/src/app/cprs/admin/vista/page.tsx`

2. Recorded the completed VistA hub browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/vista`.
3. Corroborate `GET /admin/vista/dashboard/operational` and confirm the browser quick-stats strip matches the live `users.total`, `clinics.total`, `wards.total`, and `pharmacy.drugs` values.
4. Confirm the hub renders the static VistA administration navigation cards beneath those live stats.
5. Open `/cprs/admin/vista` in a fresh unauthenticated browser context and confirm the route fails closed with `Unable to load VistA admin hub. Authentication required` instead of a fake loaded hub with placeholder stats.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the hub ignored auth/load failures from `/admin/vista/dashboard/operational` and reused placeholder `--` quick stats, which made unauthenticated access look like a successfully loaded admin workspace.
- Direct authenticated route corroboration showed the real contract was a protected live metrics strip headed by `500` users, `565` clinics, `61` wards, and `1,000` drugs.
- After the fix, the authenticated hub still matches those live values, while the unauthenticated page now fails closed with explicit auth/load messaging.

## Follow-ups
1. Keep protected summary hubs from treating placeholders as a neutral state; this slice needed strict quick-stats validation so auth failures cannot look like a normal empty dashboard.

## Phase 726 Update - Terminal Slice

## What changed
1. Fixed the admin browser terminal route so protected terminal access now fails closed instead of mounting a fake loading terminal shell while the WebSocket is already failing authentication in the background.
- `apps/web/src/app/cprs/admin/terminal/page.tsx`

2. Recorded the completed terminal browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/terminal`.
3. Corroborate `GET /terminal/health` and `GET /terminal/sessions` and confirm the browser shows a connected terminal status against the live `ws://127.0.0.1:3001/ws/console` gateway.
4. Confirm the authenticated terminal view renders the live console banner and the `Connected as PROGRAMMER,ONE (DUZ 1, role: admin)` gateway messages.
5. Open `/cprs/admin/terminal` in a fresh unauthenticated browser context and confirm the route fails closed with `Unable to load terminal. Authentication required` instead of showing a loading terminal shell.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the terminal route mounted the protected shell unconditionally, so unauthenticated access sat on `Loading terminal...` while the WebSocket repeatedly failed auth, falsely implying the admin console was still loading.
- Direct authenticated route corroboration showed the real contract was a healthy protected SSH bridge with zero active sessions and a working `/ws/console` terminal gateway.
- After the fix, the authenticated browser page still matches that live contract, while the unauthenticated route now fails closed with explicit auth/load messaging.

## Follow-ups
1. Keep protected real-time admin surfaces from relying on socket failure alone; this slice needed an authenticated HTTP bootstrap before mounting the terminal UI.

## Phase 726 Update - Templates Slice

## What changed
1. Fixed the templates admin page so protected templates, quick-text, stats, and specialty-pack surfaces now fail closed instead of rendering fake empty or zero-state content when their backend requests fail with authentication errors.
- `apps/web/src/app/cprs/admin/templates/page.tsx`

2. Recorded the completed templates browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/templates`.
3. Corroborate `GET /admin/templates`, `GET /admin/templates/quick-text`, and `GET /admin/templates/stats` with tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e` and confirm the page matches the live protected zero-state data on the `Templates`, `Quick Text`, and `Stats` tabs.
4. Confirm the authenticated `Specialty Packs` tab exposes only the seed action surface for the current tenant.
5. Open `/cprs/admin/templates` in a fresh unauthenticated browser context and confirm every exercised tab fails closed with truthful auth/load messaging instead of fake empty-state or zero-state content.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the templates page ignored auth-failure JSON payloads and reused the authenticated zero-state UI, which made unauthenticated `Templates`, `Quick Text`, `Stats`, and `Specialty Packs` look loaded even though the backing routes had already returned `Authentication required`.
- Direct authenticated route corroboration showed the real contract was a protected zero state for templates, quick text, and stats, plus a static specialty-pack seed action surface.
- After the fix, the authenticated browser page still matches those exercised live routes, while the unauthenticated page now fails closed on every exercised tab with explicit auth/load messaging.

## Follow-ups
1. Keep protected tabbed admin pages from relying on raw `res.json()` fallthrough; this slice needed strict payload validation to prevent protected zero-state reuse under failed loads.

## Phase 726 Update - Support Slice

## What changed
1. Fixed the support tooling page so protected diagnostics and tickets requests now fail closed instead of rendering fake diagnostics, a fake empty ticket list, or a working-looking create-ticket form under unauthenticated access.
- `apps/web/src/app/cprs/admin/support/page.tsx`

2. Recorded the completed support browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/support`.
3. Corroborate `GET /admin/support/diagnostics` and `GET /admin/support/tickets` with tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e` and confirm the page matches the live diagnostics payload and ticket list.
4. On the authenticated `Support Tickets` tab, create a ticket and confirm the new row matches the live post-create route output.
5. Open `/cprs/admin/support` in a fresh unauthenticated browser context and confirm `System Diagnostics` shows `Unable to load diagnostics. Authentication required` while `Support Tickets` shows `Unable to load support tickets. Authentication required` with no create form or fake empty table.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the support page ignored auth-failure JSON payloads, so unauthenticated diagnostics rendered a bare loaded shell and unauthenticated tickets rendered a false `No tickets yet` workspace with the create-ticket form still visible.
- Direct authenticated route corroboration showed the real contract was a protected diagnostics report plus a protected tenant-scoped tickets list that began empty and then reflected the browser-created proof ticket.
- After the fix, the authenticated browser page still matches those exercised live routes, while the unauthenticated page now fails closed on both tabs with explicit auth/load messaging and no fake support workspace underneath.

## Follow-ups
1. Keep protected admin tooling pages from treating `ok:false` JSON responses as successful loads; this slice needed strict payload validation in addition to transport error handling.

## Phase 726 Update - Verify Slice

## What changed
1. Recorded the completed `/cprs/verify` browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/verify` in a fresh unauthenticated browser context and confirm it redirects to `/cprs/login?redirect=%2Fcprs%2Fverify`.
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and return to `/cprs/verify`.
4. Confirm the page heading reads `CPRS Web Replica - Verification` with subtitle `System Verification`.
5. Click `Re-run All Checks` if needed and confirm the final settled browser result is `21/21 passed, 0 failed`, including the live ICD row at `230 result(s)`.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The verify dashboard is now truthful on both auth states: signed-out access redirects to login, and the authenticated page reads the live payload shapes correctly for demographics, allergies, vitals, notes, medications, problems, ICD search, and the remaining route/contract checks.
- A transient mid-run ICD mismatch was investigated before recording; direct authenticated route proof and in-browser fetch proof both showed `/vista/icd-search?q=diabetes` returning `ok:true`, `count:230`, and populated `results`, and a same-session rerun settled the page to the correct final all-pass state.

## Follow-ups
1. Keep this slice recorded as browser-proven only after the dashboard has fully settled; intermediate verification rows can lag the final authenticated route truth during an in-page run.

## Phase 726 Update - Root Landing Slice

## What changed
1. Recorded the completed web-root landing-page browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical web app and API:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
2. Open `/` in a fresh browser context.
3. Confirm the landing page shows `EHR -- Evolved`, `Hello System is running.`, and exactly three links: `CPRS Web Replica`, `Verification Dashboard`, and `Canonical CPRS Shell`.
4. Click `CPRS Web Replica` and confirm it navigates to `/cprs/login` and renders the live sign-on page.
5. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The web root is a truthful static entry point on this stack, not a live protected dashboard. Browser proof matched source inspection and confirmed the primary login navigation works.

## Follow-ups
1. Keep the landing page treated as a simple unauthenticated shell in the audit; it does not need live-route grounding beyond its navigation targets.

## Phase 726 Update - Portal Account Slice

## What changed
1. Fixed the portal account flow so the patient portal uses a consistent API host on the current lane, establishes both required portal session cookies at login, and clears both sessions on sign-out.
- `apps/portal/src/lib/api-config.ts`
- `apps/portal/src/app/page.tsx`
- `apps/portal/src/components/portal-nav.tsx`

2. Recorded the completed portal account browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and portal app:
	- `Set-Location apps/api; npx tsx --env-file=.env.local src/index.ts`
	- `pnpm -C apps/portal dev`
2. Open `http://127.0.0.1:3002/dashboard/account` in a fresh browser context and confirm it fails closed to the portal sign-in page.
3. Sign in as `patient1 / Patient1!` and confirm the app lands inside the portal dashboard with both the core portal session and IAM-backed account routes available.
4. Open `/dashboard/account` and confirm the page renders live account data: `Name: patient1`, `Patient Profiles: 1`, `MFA: Not enabled`, and at least one active device row.
5. Click `Sign Out` and confirm the portal returns to the sign-in page.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the portal mixed two auth contracts: login created only the Phase 26 `portal_session`, while the account page depended on the Phase 29 IAM cookie and therefore failed with `401` or `Failed to fetch`. The portal also defaulted to `http://localhost:3001`, which mismatched the audited `127.0.0.1` host and stranded cookies across hostnames.
- After the fix, the portal derives its default API host from the browser hostname, login establishes both sessions before navigation, sign-out clears both sessions, and the account page loads truthful live account and device data in-browser.

## Follow-ups
1. Proxy/family-access should be rechecked under the repaired dual-session portal login, because it uses the same IAM cookie family that previously had no patient-facing bootstrap path.

## Phase 726 Update - Portal Activity Slice

## What changed
1. Fixed the portal IAM logout route so it now returns effect proof instead of a bare `ok:true`, which prevents the no-fake-success middleware from crashing the API during portal sign-out.
- `apps/api/src/portal-iam/portal-iam-routes.ts`

2. Recorded the completed portal activity browser proof in the Phase 726 browser audit and runtime override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and portal app:
	- `Set-Location apps/api; npx tsx --env-file=.env.local src/index.ts`
	- `pnpm -C apps/portal dev`
2. Sign in to the portal as `patient1 / Patient1!`.
3. Open `http://127.0.0.1:3002/dashboard/activity` and confirm the page renders the `Activity Log` heading, filter controls, and at least one live `Sign In` row for `patient1`.
4. Change the `Event Type` filter to `Sign Ins` and confirm the single sign-in row remains visible.
5. Click `Sign Out` from the portal shell and confirm the browser returns to the portal login page.
6. Confirm the API remains healthy after logout:
	- `curl.exe -s http://127.0.0.1:3001/health`
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The activity page now loads truthful patient-visible audit data from `/portal/iam/activity`, and the filter controls are wired to that live route rather than acting as static UI.
- The earlier portal sign-out crash is fixed: `/portal/iam/logout` now carries explicit effect proof, so sign-out no longer terminates the API with `ERR_HTTP_HEADERS_SENT`.

## Follow-ups
1. Continue through the remaining portal routes with the repaired dual-session login and stable logout path in place; the next unresolved route is `/dashboard/ai-help`.

## Phase 726 Update - Service Lines Slice

## What changed
1. Fixed the service-lines dashboard so protected ED, OR, and ICU tabs no longer hang on loading copy when their backend requests fail with authentication errors.
- `apps/web/src/app/cprs/admin/service-lines/page.tsx`

2. Recorded the completed service-lines browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/service-lines`.
3. Corroborate `GET /ed/board`, `GET /or/board`, and `GET /icu/metrics` and confirm they return the live zero-state ED, OR, and ICU metrics.
4. Confirm the authenticated browser `ED`, `OR`, and `ICU` tabs match those live route values.
5. Open `/cprs/admin/service-lines` in a fresh unauthenticated browser context and confirm each tab fails closed with truthful auth/load messaging instead of perpetual loading copy.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the protected tab loaders ignored auth failures, so unauthenticated `ED`, `OR`, and `ICU` views stayed on fake loading messages even though the underlying routes had already returned `Authentication required`.
- Direct authenticated route corroboration showed the real contract was a truthful protected zero-state: all-zero ED metrics, all-zero OR metrics with six available rooms, and ICU metrics with `28` total beds and zero occupancy.
- After the fix, the authenticated browser page still matches those exercised live routes, while the unauthenticated page now fails closed on every tab with explicit auth/load messaging.

## Follow-ups
1. Keep protected admin tab loaders from treating missing data as an indefinite loading state; this slice needed strict response validation on each tab rather than passive `d.ok && setState(...)` fetch chains.

## Phase 726 Update - RPC Debug Slice

## What changed
1. Fixed the rpc-debug console so it no longer fetches the rpc-debug routes from the Next origin or render a fake zeroed debug workspace when those requests fail.
- `apps/web/src/components/cprs/panels/RpcDebugPanel.tsx`

2. Recorded the completed rpc-debug browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/rpc-debug`.
3. Corroborate `GET /vista/rpc-debug/actions`, `GET /vista/rpc-catalog`, and `GET /vista/rpc-debug/registry` and confirm they return the live action, catalog, and registry payloads.
4. Confirm the authenticated browser summary cards, location filter, search box, and action table match those live route values, including visible rows such as `Load Allergies` and `Search Patients`.
5. Open `/cprs/admin/rpc-debug` in a fresh unauthenticated browser context and confirm the route fails closed with `Authentication required` instead of rendering a zeroed debug console.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the rpc-debug panel fetched relative `/vista/*` URLs from Next and ignored non-OK responses, so both authenticated and unauthenticated loads collapsed into the same fake zeroed console even though the real API routes were populated and session-protected.
- Direct authenticated route corroboration showed the real contract was live: `51` actions, `4585` catalog entries, and `424` registry entries.
- After the fix, the authenticated browser page now matches those exercised live routes, while the unauthenticated route degrades honestly with `Authentication required` and no synthetic zero-state panel.

## Follow-ups
1. Keep CPRS admin panels off relative fetches to the Next origin when the real contract lives on the API server; this slice needed both API_BASE alignment and a fully fail-closed render path for protected debug tooling.

## Phase 726 Update - Reports Slice

## What changed
1. Fixed the reports console so the authenticated Clinical Stats tab no longer calls dead route `/reports/clinical` and render `Not Found`; it now uses the real backend contract `/reports/clinical-activity`.
- `apps/web/src/app/cprs/admin/reports/page.tsx`

2. Recorded the completed reports browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/reports`.
3. Corroborate `GET /reports/operations`, `GET /reports/integrations`, `GET /reports/audit?limit=20`, `GET /reports/clinical-activity`, and `GET /reports/export/jobs` and confirm they return the live reports payloads.
4. Confirm the authenticated browser `Operations`, `Integrations`, `Audit Trail`, `Clinical Stats`, and `Exports` tabs match those live route values, including the Clinical tab counts from `/reports/clinical-activity`.
5. Open `/cprs/admin/reports` in a fresh unauthenticated browser context and confirm the route still fails closed with `Please log in to access reports.` instead of rendering a loaded reporting workspace.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the authenticated `Clinical Stats` tab requested dead route `/reports/clinical`, which produced a browser `404` and rendered `Not Found` even though the live backend route existed at `/reports/clinical-activity`.
- Direct authenticated route corroboration showed the real reports contract was live and truthful: operations metrics with `ORQPT DEFAULT PATIENT LIST`, a zero-state integrations report, a mutable audit stream, clinical counts `0 / 26 / 0 / 1`, and zero export jobs.
- After the fix, the authenticated browser page now matches those exercised live reporting routes, while the unauthenticated route continues to degrade honestly with `Please log in to access reports.`

## Follow-ups
1. Keep report-tab route keys aligned exactly with the backend contract; this slice did not need a new auth gate, only a strict correction from a dead frontend path to the live `/reports/clinical-activity` route.

## Phase 726 Update - Reconciliation Slice

## What changed
1. Fixed the reconciliation console so unauthenticated access no longer renders a working remittance import workspace, and empty authenticated pagers no longer show `Page 1/0`.
- `apps/web/src/app/cprs/admin/reconciliation/page.tsx`

2. Recorded the completed reconciliation browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/reconciliation`.
3. Corroborate `GET /rcm/reconciliation/imports`, `/payments?page=1&limit=20`, `/matches/review`, `/underpayments?page=1&limit=20`, and `/stats` and confirm they return the live zero-state reconciliation payloads.
4. Confirm the authenticated browser `Upload Remittance`, `Payments`, `Underpayments`, and `Dashboard` surfaces match those live route values, including `Page 1/1` on empty pagers.
5. Open `/cprs/admin/reconciliation` in a fresh unauthenticated browser context and confirm the page shows `Unable to load reconciliation console. Authentication required` instead of a working upload form and fake protected tabs.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated reconciliation route failures were swallowed and the page still rendered a working import form plus protected empty-state tabs.
- Direct authenticated route corroboration showed the real contract was a clean zero-state store: no imports, no payments, no matches, no underpayments, and all-zero stats.
- After the fix, the authenticated browser page still matches that live zero-state contract, while the unauthenticated page now fails closed and the empty authenticated pagers render truthfully as `Page 1/1`.

## Follow-ups
1. Keep protected remittance/admin pages behind a route-level bootstrap gate; this slice also needed empty-pagination normalization so authenticated zero states stay truthful instead of displaying impossible page counts.

## Phase 726 Update - RCM Slice

## What changed
1. Fixed the umbrella RCM admin console so unauthenticated access no longer treats auth-error payloads as live data and fabricates `OFFLINE`, `SQLite`, and empty RCM workspace state.
- `apps/web/src/app/cprs/admin/rcm/page.tsx`

2. Recorded the completed RCM browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and web app, then verify live health:
	- `./start-api.ps1`
	- `pnpm -C apps/web dev`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/rcm`.
3. Corroborate `GET /rcm/health`, `GET /rcm/submission-safety`, and `GET /admin/payer-db/backend` and confirm they return the live `97`-payer subsystem health, `export_only` submission safety, and `backend: pg`.
4. Corroborate `GET /rcm/claims?limit=100` plus `GET /rcm/claims/stats` and confirm they return an empty claim workqueue with zero totals.
5. Corroborate `GET /rcm/payers?limit=20` plus `GET /rcm/payers/stats` and confirm they return the live payer catalog headed by `NZ-ACC`, `US-AETNA`, and `SG-AIA`, with `total: 97` and the live country/mode breakdown.
6. Corroborate `GET /rcm/connectors`, `GET /rcm/connectors/health`, and `GET /rcm/audit/stats` and confirm they return the live connector health cards plus the single valid `directory.refreshed` audit chain entry.
7. Confirm the authenticated browser `Claim Workqueue`, `Payer Registry`, `Connectors & EDI`, and `Audit Trail` surfaces match those live route values.
8. Open `/cprs/admin/rcm` in a fresh unauthenticated browser context and confirm the route now fails closed with `Unable to load RCM console. Authentication required` instead of rendering fabricated RCM status badges and empty admin tabs.
9. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated `/rcm/*` auth failures were being accepted as if they were live data, which made `/cprs/admin/rcm` render `OFFLINE`, `SQLite`, and fake empty RCM workspace content.
- Direct authenticated route corroboration showed the real page contract was live and populated at the shell level: `97` payers, PostgreSQL backend, export-only submission safety, 10 connector health entries, and a valid single-entry audit chain.
- After the fix, the authenticated browser page still matches the exercised live RCM contracts, while the unauthenticated page now fails closed at the route level instead of fabricating an RCM dashboard.

## Follow-ups
1. Keep large protected wrapper pages from mounting tab workspaces until their route-level bootstrap calls succeed; this slice needed a shell-level auth gate rather than another layer of tab-specific empty-state fallbacks.

## Phase 726 Update - Queue Slice

## What changed
1. Fixed the queue admin console so protected queue tabs no longer swallow unauthenticated failures and render the same seed and empty-state UI used for a successfully loaded zero-state queue, while preserving the legitimately public display-board tab.
- `apps/web/src/app/cprs/admin/queue/page.tsx`

2. Recorded the completed queue browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/queue`.
3. Corroborate `GET /queue/departments` and confirm it returns the 12 seeded department configurations for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`.
4. Corroborate `GET /queue/tickets?dept=primary-care` and `GET /queue/stats/primary-care` and confirm they return an empty queue plus zeroed statistics.
5. Corroborate `GET /queue/display/primary-care` and confirm it returns the public zero-state display board with `waitingCount: 0` and `estimatedWaitMinutes: 0`.
6. Confirm the authenticated browser `Active Queue`, `Display Board`, `Departments`, and `Statistics` tabs match those live route values.
7. Open `/cprs/admin/queue` in a fresh unauthenticated browser context and confirm the protected tabs show truthful auth/load failure text while `Display Board` still renders the truthful public zero-state board.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated `/queue/departments`, `/queue/tickets`, and `/queue/stats` requests returned `401 Authentication required`, but the page swallowed those failures and rendered the same seed and empty-state queue admin UI used for a real zero-state load.
- Direct authenticated route corroboration showed the real queue contract was a seeded department catalog with an empty `primary-care` queue, zeroed `primary-care` stats, and a public display board that remained accessible without authentication.
- After the fix, the authenticated browser page still matches that live contract, while the unauthenticated protected tabs now fail closed with truthful auth/load messaging and the `Display Board` tab continues to reflect the live public route truthfully.

## Follow-ups
1. Keep mixed-auth admin pages split by route contract; this slice needed separate protected-tab and public-tab handling so the display board stayed accessible without certifying protected queue admin state.

## Phase 726 Update - Payer Directory Slice

## What changed
1. Fixed the payer-directory console so unauthenticated registry, source, and merge-route failures no longer render the same empty-state UI used for a successfully loaded zero-state registry.
- `apps/web/src/app/cprs/admin/payer-directory/page.tsx`

2. Recorded the completed payer-directory browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/payer-directory`.
3. Corroborate `GET /rcm/payerops/registry/health` and confirm it returns zeroed registry and matrix counts, including `totalPayers: 0` and `totalSources: 0`.
4. Corroborate `GET /rcm/payerops/payers`, `GET /rcm/payerops/registry/sources`, and `GET /rcm/payerops/registry/snapshots` and confirm they each return empty arrays on the current tenant.
5. Confirm the authenticated browser `Payer Registry`, `Ingestion Sources`, and `Merge Tool` tabs match those live zero-state routes.
6. Open `/cprs/admin/payer-directory` in a fresh unauthenticated browser context and confirm the page shows truthful auth/load failure text instead of the loaded empty-state registry, source, and merge UI.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, all payer-directory routes returned `401 Authentication required` in an unauthenticated browser context, but the page swallowed those failures and rendered the same zero-state copy used for a genuinely empty payer registry.
- Direct authenticated route corroboration showed the real contract was a clean zero-state registry: `0` payers, `0` sources, `0` snapshots, and a zero-candidate merge tool.
- After the fix, the authenticated browser page still matches that live zero-state contract, while the unauthenticated page now fails closed with truthful auth/load messaging across all three tabs.

## Follow-ups
1. Keep zero-state admin registries from using empty arrays as the fallback for failed fetches; this slice needed strict response validation and tab-specific error rendering to avoid certifying auth failures as successful empty loads.

## Phase 726 Update - Ops Slice

## What changed
1. Fixed the ops admin console so unauthenticated failures across overview, alerts, store inventory, and runbooks no longer render a silent blank admin shell.
- `apps/web/src/app/cprs/admin/ops/page.tsx`

2. Recorded the completed ops browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/ops`.
3. Corroborate `GET /admin/ops/overview` and confirm it returns `overallScore: 94`, `passingGates: 32`, `totalGates: 34`, `storeCount: 470`, and `runbookCount: 212`.
4. Corroborate `GET /admin/ops/alerts` and confirm it returns the warning `40 critical in-memory-only stores (data loss on restart)`.
5. Corroborate `GET /admin/ops/store-inventory` and confirm it returns `total: 470`, `criticalInMemory: 40`, and populated classification/domain maps.
6. Corroborate `GET /admin/ops/runbooks` and confirm it returns `212` indexed runbooks.
7. Confirm the authenticated browser `Overview`, `Alerts`, `Store Inventory`, and `Runbooks` tabs match those live route values.
8. Open `/cprs/admin/ops` in a fresh unauthenticated browser context and confirm the page no longer renders a blank loaded shell; on the recorded pass the visible final state was `Error: Too many requests` after initial `401 Authentication required` responses were followed by rate limiting.
9. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, all four unauthenticated `/admin/ops/*` requests returned auth failures, but the page used a permissive parallel fetch path that swallowed them and rendered a blank normal-looking admin shell with tabs and no explanation.
- Direct authenticated route corroboration showed the real ops contract was populated: overview `94 / 32 of 34 / 470 / 212`, one infrastructure warning for `40 critical in-memory-only stores`, a populated store inventory map, and `212` indexed runbooks.
- After the fix, the authenticated browser page still matches those live routes, while the unauthenticated page now fails closed instead of certifying a loaded blank admin workspace.

## Follow-ups
1. Keep admin multi-route dashboards off permissive `Promise.allSettled` patterns that silently discard failed responses; this slice needed strict parallel response validation so auth failures could not masquerade as an empty loaded shell.

## Phase 726 Update - Onboarding Slice

## What changed
1. Fixed the onboarding wizard so unauthenticated session-load failures no longer render the same empty-tenant workspace used for a successful authenticated zero state, and the modules step now loads the real module catalog instead of dead route `/api/modules`.
- `apps/web/src/app/cprs/admin/onboarding/page.tsx`

2. Recorded the completed onboarding browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/onboarding`.
3. Corroborate `GET /admin/onboarding` and `GET /admin/onboarding/steps` and confirm the authenticated empty-session state plus the five wizard steps.
4. Corroborate `GET /api/modules/status` and confirm it returns the live enabled module catalog for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`; confirm `GET /api/modules` is not the real contract.
5. Use the browser to start a new onboarding session, advance through Facility Setup and VistA Connection, and confirm the `Module Selection` step renders the live module cards from `/api/modules/status`.
6. Advance through `User Provisioning` and `Review & Complete`, then confirm the final authenticated browser state shows `Onboarding Complete` and `Facility has been configured successfully.`
7. Open `/cprs/admin/onboarding` in a fresh unauthenticated browser context and confirm the page shows `Unable to load onboarding sessions. Authentication required` instead of the fake empty-session state.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated onboarding page swallowed `401` responses and rendered the same `No onboarding sessions yet` zero-state used for a successful authenticated empty tenant, while the authenticated modules step fetched dead route `/api/modules` and silently omitted the real module catalog.
- Direct route corroboration showed the real contracts were `/admin/onboarding*` for the wizard state and `/api/modules/status` for the module catalog; `/api/modules` is a live `404`.
- After the fix, the authenticated browser wizard matches those live routes through to a completed onboarding flow, while the unauthenticated page now fails closed with truthful auth/load messaging.

## Follow-ups
1. Keep admin wizard loaders from treating failed initial fetches as legitimate zero-state workspaces, and keep page route contracts aligned with the real API endpoints rather than legacy path guesses.

## Phase 726 Update - Module Validation Slice

## What changed
1. Fixed the module-validation console so unauthenticated route failures no longer hang on misleading loading states across the full report and every category tab.
- `apps/web/src/app/cprs/admin/module-validation/page.tsx`

2. Recorded the completed module-validation browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/module-validation`.
3. Corroborate `GET /admin/module-validation/report` and confirm it returns `passed: true`, `errorCount: 0`, `warningCount: 5`, `infoCount: 16`, `activeSku: FULL_SUITE`, and tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`.
4. Corroborate `GET /admin/module-validation/dependencies`, `GET /admin/module-validation/boundaries`, and `GET /admin/module-validation/coverage` and confirm they match the issue rows shown on each browser tab.
5. Confirm the authenticated browser `Full Report`, `Dependencies`, `Boundaries`, and `Coverage` tabs match those live route values.
6. Open `/cprs/admin/module-validation` in a fresh unauthenticated browser context and confirm the page shows truthful auth/load failure text on the default view and each tab instead of hanging on `Loading...` copy.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, all four unauthenticated `/admin/module-validation/*` requests returned `401 Authentication required`, but the page swallowed those failures and stayed on misleading perpetual loading text across the full report and category tabs.
- Direct authenticated route corroboration showed the real contract was healthy and populated: `PASSED`, `0` errors, `5` warnings, `16` info, `DEP_OK` on dependencies, telehealth adapter plus health-endpoint findings on boundaries, and the `fhir` plus kernel/store-policy warnings on coverage.
- After the fix, the authenticated browser page still matches those live module-validation routes, while the unauthenticated page now fails closed with truthful auth/load error messaging across every tab.

## Follow-ups
1. Keep admin validator surfaces from treating failed fetches as indefinite loading state; this slice needed the same strict response validation already applied to the other proven admin consoles.

## Phase 726 Update - Denial Cases Slice

## What changed
1. Fixed the denial-cases console so auth/load failures no longer render the same loaded empty queue used for a successfully fetched empty denial store, and empty pagination no longer shows `Page 1/0`.
- `apps/web/src/app/cprs/admin/denial-cases/page.tsx`

2. Recorded the completed denial-cases browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/denial-cases`.
3. Corroborate `GET /rcm/denials?page=1&limit=20` with the authenticated session plus `x-tenant-id: 77371ffb-9929-4344-9fea-a0a7bbcc645e` and confirm it returns `items: []`, `total: "0"`, and `totalPages: 0`.
4. Corroborate `GET /rcm/denials/stats` with the same session and tenant context and confirm it returns `stats: {}`.
5. Confirm the authenticated browser `Work Queue` tab shows `0 total | Page 1/1`, `No denial cases found`, and disabled `Prev` and `Next` controls.
6. Switch to `Dashboard` and confirm all eight denial status cards show `0` with `Total: 0 denial cases`.
7. Open `/cprs/admin/denial-cases` in a fresh unauthenticated browser context and confirm the page shows `Unable to load denial dashboard. Authentication required` instead of rendering `No denial cases found`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated denial-case loads swallowed `401` failures and rendered the same empty queue copy used for a successful empty denial dataset, falsely implying the workspace had loaded.
- Direct authenticated route corroboration showed the real tenant-scoped contract was an empty denial queue and empty stats payload.
- After the fix, the authenticated browser page matches that live empty route truth while normalizing the pager to `Page 1/1`, and the unauthenticated page now fails closed with truthful auth messaging.

## Follow-ups
1. Keep admin work-queue pages from treating failed fetches and successful empty datasets as the same render branch; this slice needed both fail-closed load handling and a stable empty-page normalization.

## Phase 726 Update - Coverage Slice

## What changed
1. Fixed the specialty coverage dashboard so auth/load failures no longer crash the CPRS content boundary from malformed overview state.
- `apps/web/src/app/cprs/admin/coverage/page.tsx`

2. Recorded the completed coverage browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/coverage`.
3. Corroborate `GET /admin/coverage/score` and confirm it returns `overallScore: 82`, `overallGrade: B`, and distribution `A:4, B:38, C:3, D:0, F:0`.
4. Corroborate `GET /admin/coverage/specialties` and confirm it returns `45` specialty rows, including `primary-care 92 A` and the other leading specialties.
5. Corroborate `GET /admin/coverage/gaps` and confirm it returns `gapCount: 0` with no improvement-priority entries.
6. Corroborate `GET /admin/coverage/qa-ladder` and confirm it returns gate `G-SPECIALTY-COVERAGE`, aggregate score `82 (B)`, `status: warn`, `passCount: 0`, `warnCount: 45`, and `failCount: 0`.
7. Confirm the authenticated browser `Overview`, `Specialties`, `Gaps`, and `QA Ladder` tabs match those live route values.
8. Open `/cprs/admin/coverage` in a fresh unauthenticated browser context and confirm the page shows `Unable to load coverage dashboard. Authentication required` instead of crashing with `Cannot read properties of undefined (reading 'A')`.
9. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated coverage loads ignored failed API responses and then crashed in `OverviewTab` while reading a missing grade-distribution object, surfacing `Error in CPRS Content` instead of a truthful auth failure.
- Direct authenticated route corroboration showed the real coverage contract was healthy and populated: score `82 (B)`, 45 specialties, zero gaps, and a `WARN` QA ladder with 45 warning checks.
- After the fix, the authenticated browser page matches that live route truth across all four tabs, while the unauthenticated page now fails closed with truthful auth messaging instead of throwing.

## Follow-ups
1. Keep admin scorecards from assuming route payload shape after failed loads; this surface needed the same strict response validation used on the other proven admin consoles.

## Phase 726 Update - Contracting Hub Slice

## What changed
1. Fixed the contracting hub so it now calls the real API server, renders the live contracting dashboard, and fails closed on auth/load errors instead of crashing on HTML 404 responses or hanging on `Loading contracting data...`.
- `apps/web/src/app/cprs/admin/contracting-hub/page.tsx`

2. Recorded the completed contracting hub browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/contracting-hub`.
3. Corroborate `GET /rcm/hmo/contracting` and confirm it returns `totalPayers: 27`, `totalTasks: 0`, zero counts in `byStatus`, and 27 payer rows with `tasks: []`.
4. Confirm the authenticated browser summary strip shows `Payers 27`, `Total Tasks 0`, `open 0`, `in progress 0`, `blocked 0`, and `done 0`.
5. Confirm the payer list renders the live PH HMO payer IDs with `No tasks -- click to init`.
6. Click `PH-MAXICARE` and confirm the detail panel shows `No tasks yet. Click "Init Tasks" to create standard onboarding tasks.`
7. Open `/cprs/admin/contracting-hub` in a fresh unauthenticated browser context and confirm the page shows `Error: Authentication required` instead of hanging on `Loading contracting data...` or crashing on invalid JSON.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the page fetched relative `/rcm/hmo/contracting*` URLs from Next, received HTML `404` responses, and crashed with `Unexpected token '<'`; unauthenticated loads could also remain stuck on `Loading contracting data...` under `401` failures.
- Direct authenticated route corroboration showed the live dashboard contract was a truthful 27-payer zero-task state with zero open, in-progress, blocked, and done tasks.
- After the fix, the authenticated browser page matches that live contracting route truth, and the unauthenticated page now fails closed with `Authentication required` instead of crashing or hanging.

## Follow-ups
1. Keep admin RCM dashboards on the shared `API_BASE` path; this surface had drifted to relative Next fetches, which converted routine route failures into browser-visible parse crashes.

## Phase 726 Update - Compliance Slice

## What changed
1. Fixed the compliance dashboard so it now uses the real regulatory API contract, resolves tenant context, and fails closed on auth/load errors instead of hanging on `Loading...` or rendering a blank shell.
- `apps/web/src/app/cprs/admin/compliance/page.tsx`

2. Recorded the completed compliance browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/compliance`.
3. Corroborate `GET /admin/my-tenant` and confirm it returns tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e` for the active admin session.
4. Corroborate `GET /regulatory/posture`, `GET /regulatory/frameworks`, `GET /regulatory/attestations/summary`, and `GET /regulatory/validators` with the same authenticated cookies plus `x-tenant-id: 77371ffb-9929-4344-9fea-a0a7bbcc645e` where required.
5. Confirm the authenticated browser `Posture` tab shows tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`, country `US`, frameworks `HIPAA, NIST_800_53`, `Validators 3`, valid chains, and supported countries `US, PH, GH`.
6. Switch to `Frameworks` and confirm the browser renders the five live framework rows.
7. Switch to `Attestations` and confirm the browser shows `No attestations recorded yet.` matching the current zero-attestation route state.
8. Switch to `Validators` and confirm the browser renders the three live validator rows for `US`, `PH`, and `GH`.
9. Open `/cprs/admin/compliance` in a fresh unauthenticated browser context and confirm the page shows `Unable to load compliance dashboard. Authentication required` instead of hanging on `Loading...`.
10. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the page fetched nonexistent `/api/regulatory/*` endpoints, so authenticated loads returned repeated `404` responses and rendered only a blank shell while unauthenticated loads mixed `401` and `404` failures and stayed on `Loading...`.
- Direct authenticated route corroboration showed the real dashboard contract lives at `/regulatory/*`, with tenant-scoped posture plus live framework and validator catalogs.
- After the fix, the authenticated browser page matches the live `Posture`, `Frameworks`, `Attestations`, and `Validators` route truth, while the unauthenticated page now fails closed with truthful auth messaging.

## Follow-ups
1. Keep admin dashboards off nonexistent Next-local `/api/*` assumptions; this surface needed the same `API_BASE` plus tenant-resolution pattern already used by the other proven admin consoles.

## Phase 726 Update - QA Dashboard Slice

## What changed
1. Fixed the QA dashboard so tenant-required and authentication failures no longer collapse into the false `QA Routes Disabled` state.
- `apps/web/src/app/cprs/admin/qa-dashboard/page.tsx`

2. Recorded the completed QA dashboard browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/qa-dashboard`.
3. Corroborate `GET /admin/my-tenant` and confirm it returns tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e` for the active admin session.
4. Corroborate `GET /qa/status`, `GET /qa/traces/stats`, `GET /qa/flows`, `GET /qa/results`, and `GET /qa/dead-clicks` with the same authenticated cookies plus `x-tenant-id: 77371ffb-9929-4344-9fea-a0a7bbcc645e`.
5. Confirm the authenticated browser `Traces` tab shows the same live metrics: `Buffer 108/5000`, `Avg 405.84ms`, `P95 1097ms`, `Error Rate 0.0%`, and top RPCs led by `ORQPT DEFAULT PATIENT LIST`.
6. Switch to `Flows` and confirm the browser renders the live 17-row flow catalog.
7. Switch to `Results` and confirm the browser shows `No flow results yet. Run a flow first.` matching the current no-results route state.
8. Switch to `Dead Clicks` and confirm the browser shows `No dead clicks detected` matching the current zero dead-click route state.
9. Open `/cprs/admin/qa-dashboard` in a fresh unauthenticated browser context and confirm the page shows `Unable to load QA dashboard status. Authentication required` instead of `QA Routes Disabled`.
10. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, both authenticated and unauthenticated browser passes falsely showed `QA Routes Disabled` even though the real authenticated tenant-scoped `/qa/status` route returned `qaEnabled:true`; the page was omitting tenant context and conflating tenant/auth failures with the disabled feature state.
- Direct authenticated route corroboration showed the current live QA contract for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`: trace stats `108` total calls with `0` failures, `17` flows, `no_results`, and `0` dead clicks.
- After the fix, the authenticated browser page matches that live tenant-scoped contract across `Traces`, `Flows`, `Results`, and `Dead Clicks`, while the unauthenticated page now fails closed with truthful auth messaging instead of certifying a false disabled state.

## Follow-ups
1. Keep tenant-scoped admin consoles from collapsing `TENANT_REQUIRED` and `401` failures into feature-flag booleans; this surface needed explicit tenant resolution before it could safely decide whether QA was actually disabled.

## Phase 726 Update - Pilot Slice

## What changed
1. Fixed the pilot readiness console so unauthenticated load failures no longer render the same empty-site and preflight guidance used for a genuinely empty pilot site store.
- `apps/web/src/app/cprs/admin/pilot/page.tsx`

2. Recorded the completed pilot browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/pilot`.
3. Corroborate the `Sites` tab against `GET /admin/pilot/sites` and confirm it returns `sites: []`, matching the browser row `No pilot sites configured`.
4. Corroborate `GET /admin/pilot/summary` and confirm it returns `total: 0` with empty `byStatus` and `byEnvironment` objects for the current tenant.
5. Switch to the `Preflight` tab and confirm the browser shows `Select a site and run preflight checks from the Sites tab.` because no site exists to preflight.
6. Open `/cprs/admin/pilot` in a fresh unauthenticated browser context and confirm the `Sites` tab shows `Authentication required` instead of `No pilot sites configured`.
7. Switch the unauthenticated page to `Preflight` and confirm it shows `Unable to load pilot sites. Authentication required` instead of the generic select-a-site guidance.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated pilot page swallowed `401` responses and rendered the same `No pilot sites configured` and `Select a site and run preflight checks from the Sites tab.` copy used for a successfully loaded empty pilot store.
- Direct authenticated route corroboration showed the real contract was a truthful zero-state tenant: `GET /admin/pilot/sites` returned `sites: []` and `GET /admin/pilot/summary` returned `total: 0` with empty status and environment maps.
- After the fix, the authenticated browser page still matches that live zero-state route contract, while the unauthenticated page now fails closed with truthful auth/load messaging on both tabs.

## Follow-ups
1. Keep admin zero-state pages from treating initial list-load failure and empty-data success as the same render branch; this surface had both a list tab and a secondary guidance tab that could otherwise certify themselves falsely under `401`.

## Phase 726 Update - PhilHealth Setup Slice

## What changed
1. Fixed the PhilHealth setup console so unauthenticated load failures no longer render a fake blank facility workspace, fake provider zero-state, or fake readiness counters.
- `apps/web/src/app/cprs/admin/philhealth-setup/page.tsx`

2. Recorded the completed PhilHealth setup browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/philhealth-setup`.
3. Corroborate the page against `GET /rcm/philhealth/setup` and confirm it shows blank facility details, zero providers, and `0 of 8 complete` readiness with the same eight incomplete items returned by the route.
4. Corroborate `GET /rcm/philhealth/stats` and confirm it returns `facilitySetups: 1` and zero claim drafts on this tenant.
5. Open `/cprs/admin/philhealth-setup` in a fresh unauthenticated browser context and confirm the page shows `Unable to load PhilHealth setup. Authentication required` instead of a blank editable facility form.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated setup page showed `Authentication required` but still rendered blank facility fields, `Provider Accreditations (0)`, and `0 of 0 complete`, which falsely implied the setup workspace had loaded.
- Direct authenticated route corroboration showed the real zero-state setup contract: default facility record, zero providers, and eight incomplete readiness items.
- After the fix, the authenticated browser page still matches that live route, while the unauthenticated page now fails closed with a truthful setup load error.

## Follow-ups
1. Keep configuration pages from using uncontrolled local form state as a fallback render after failed initial loads; otherwise auth failures can look like editable empty configuration.

## Phase 726 Update - PhilHealth eClaims3 Slice

## What changed
1. Fixed the PhilHealth eClaims 3.0 console so auth/load failures no longer collapse into fake zero-state or loading UI across Build, Submissions, Denials, and Spec.
- `apps/web/src/app/cprs/admin/philhealth-eclaims3/page.tsx`

2. Recorded the completed PhilHealth eClaims3 browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/philhealth-eclaims3`.
3. Corroborate `Build & Export` against `GET /rcm/philhealth/claims` and confirm it returns `count: 0` with `drafts: []`, matching `No claim drafts available. Create one in PH Claims first.`
4. Corroborate the header and `Spec Gates` tab against `GET /rcm/eclaims3/status` and `GET /rcm/eclaims3/spec-gates`, confirming `XML spec: Pending`, manual-only submission mode, and `0 of 5` gates completed with all five gates `not_started`.
5. Corroborate `Submissions` and `Denials` against `GET /rcm/eclaims3/submissions` and confirm they return `total: 0`, matching the browser zero-state messages.
6. Open `/cprs/admin/philhealth-eclaims3` in a fresh unauthenticated browser context and confirm the page shows truthful adapter, drafts, submissions, denials, and spec-gate auth failure messaging instead of fake zero-state content or loading text.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, unauthenticated eClaims3 loads swallowed `401` responses and fell through into fake zero-state content: `XML spec: Loading...`, `No claim drafts available`, `No submissions yet`, and misleading spec-progress metrics.
- Direct authenticated route corroboration showed the real zero-state/manual-only contract: no drafts, no submissions, zero denials, `specAvailable:false`, and five `not_started` spec gates with `0/5` progress.
- After the fix, the authenticated browser page still matches that live contract on all four tabs, while the unauthenticated page now fails closed with truthful auth/load failure messages.

## Follow-ups
1. Keep multi-tab adapter consoles from using silent fetchers; this surface had four independent data areas, and each one was previously capable of masquerading as valid empty state under `401`.

## Phase 726 Update - PhilHealth Claims Slice

## What changed
1. Fixed the PhilHealth claims console so auth/load failures no longer render the same empty-drafts state used for a genuinely empty claim store.
- `apps/web/src/app/cprs/admin/philhealth-claims/page.tsx`

2. Recorded the completed PhilHealth claims browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/philhealth-claims`.
3. Corroborate the list against `GET /rcm/philhealth/claims` and confirm it returns `count: 0` with `drafts: []`, matching the browser message `No claim drafts yet. Create one to get started.`
4. Open `/cprs/admin/philhealth-claims` in a fresh unauthenticated browser context and confirm the page shows `Authentication required` plus `Unable to load claim drafts.` instead of the loaded zero-drafts message.
5. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated page showed `Authentication required` but still rendered `No claim drafts yet. Create one to get started.`, which falsely implied the claim list had loaded successfully.
- Direct authenticated route corroboration showed a truthful zero-draft contract from `GET /rcm/philhealth/claims` with `count: 0` and `drafts: []`.
- After the fix, the authenticated browser page still matches that live zero-state route, while the unauthenticated page now renders `Unable to load claim drafts.` instead of collapsing into the loaded empty-state message.

## Follow-ups
1. Keep zero-state admin workspaces from sharing the same render branch for `empty` and `failed` list loads; this surface showed the same failure pattern as the other RCM admin consoles.

## Phase 726 Update - PH Market Slice

## What changed
1. Fixed the PH market dashboard so it now calls the real API server, renders the live populated HMO market data, and surfaces truthful auth/load failures instead of crashing on HTML 404 responses or hanging on loading state.
- `apps/web/src/app/cprs/admin/ph-market/page.tsx`

2. Recorded the completed PH market browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/ph-market`.
3. Corroborate the `overview` tab against `GET /rcm/hmo/market-summary` and confirm it shows `27` HMOs, `5` portal adapters, `20%` capability coverage, `27` LOA templates, `27` claim configs, and payer-type counts `L3 19` and `L1 8`.
4. Switch to `hmos` and confirm it renders the live manifest rows from `GET /rcm/hmo/manifest`, including entries such as `PH-ASIANLIFE`, `PH-INTELLICARE`, and `PH-MAXICARE` with truthful adapter badges and capability percentages.
5. Switch to `contracting` and confirm it matches the live zero-task summary from `summary.contracting` with all counts at `0`.
6. Open `/cprs/admin/ph-market` in a fresh unauthenticated browser context and confirm the page shows `Unable to load PH market data. Authentication required` instead of crashing on a JSON parse error or staying on `Loading PH market data...`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the page fetched relative `/rcm/hmo/*` URLs from Next, received HTML `404` responses, and crashed with `Unexpected token '<'`; unauthenticated loads could also remain stuck on `Loading PH market data...` under `401` failures.
- Direct authenticated route corroboration showed a live populated PH market contract: `27` HMOs, `5` portal adapters, `3` generic manual adapters, `19` manual-only payers, `20%` capability coverage, `27` LOA templates, `27` claim packet configs, and `0` contracting tasks.
- After the fix, the authenticated browser page matches that live populated route data across `overview`, `hmos`, and `contracting`, while the unauthenticated page now degrades honestly with `Authentication required`.

## Follow-ups
1. Keep admin dashboards on the shared `API_BASE` contract; this page had drifted to relative Next fetches, which turned a normal route failure into a browser-visible parse crash.

## Phase 726 Update - Performance Slice

## What changed
1. Fixed the performance dashboard so auth/load failures no longer render a fake loading state or the same zero-state copy used for a genuinely empty performance store.
- `apps/web/src/app/cprs/admin/performance/page.tsx`

2. Recorded the completed performance browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/performance` in a fresh unauthenticated browser context and confirm the `Summary` tab shows `Unable to load performance summary. Authentication required` instead of sitting on `Loading...`.
3. Switch the unauthenticated page through `Route Profiles`, `Budgets`, and `Slow Queries` and confirm each tab shows its truthful auth failure message instead of a loaded zero-state.
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/performance`.
5. Corroborate the `Summary` tab against `GET /admin/performance/summary` and confirm it returns the truthful zero-state summary with `healthScore: 100`, `systemP95Ms: 0`, `systemAvgMs: 0`, and `budgetCount: 0`.
6. Corroborate the `Route Profiles`, `Budgets`, and `Slow Queries` tabs against `GET /admin/performance/profiles`, `GET /admin/performance/budgets`, and `GET /admin/performance/slow-queries`, confirming all three return empty arrays on this stack.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated performance page sat on `Loading...` in Summary and rendered loaded zero-state copy on Route Profiles, Budgets, and Slow Queries even though the underlying requests had failed with `401`.
- Direct authenticated route corroboration showed a truthful zero-state performance store: summary `100/100` with zero route telemetry, empty route profiles, empty budgets, and empty slow-query log.
- After the fix, unauthenticated browser passes show truthful auth failure messaging on all four tabs, while the authenticated browser page still matches the live performance route contracts exactly.

## Follow-ups
1. Keep admin telemetry dashboards strict about non-OK response handling; this surface had four independent read tabs, and silent fetch fallthrough was allowing auth failures to masquerade as clean performance data.

## Phase 726 Update - Exports Slice

## What changed
1. Fixed the exports console so auth/load failures no longer render the same empty source-catalog state used for a genuinely loaded exports registry.
- `apps/web/src/app/cprs/admin/exports/page.tsx`

2. Recorded the completed exports browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/exports`.
3. Corroborate the `Sources` tab against `GET /admin/exports/sources` and confirm it returns the live sources `platform-audit`, `analytics-events`, and `analytics-aggregated` plus supported formats `csv`, `json`, `jsonl`, and `ndjson`.
4. Corroborate the `Jobs` tab against `GET /admin/exports/jobs?limit=50` and confirm it returns `jobs: []`, matching the browser message `No export jobs`.
5. Corroborate the `Stats` tab against `GET /admin/exports/stats` and confirm it returns zero counts for `totalJobs`, `completed`, `failed`, and `active`.
6. Open `/cprs/admin/exports` in a fresh unauthenticated browser context and confirm the page shows `Unable to load export sources. Authentication required` instead of `No sources registered`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated exports page swallowed `401` failures and rendered the same `No sources registered` empty-state used for a successful empty source catalog, falsely implying the exports registry had loaded.
- Direct authenticated route corroboration showed the real live contract was three sources, zero jobs, and zero stats for the active tenant.
- After the fix, the authenticated browser page still matches that live route truth, while the unauthenticated page now fails closed with `Unable to load export sources. Authentication required`.

## Follow-ups
1. Keep admin source-registry pages strict about initial load failures versus genuine empty-state success; this surface needed separate page-load and action-error handling so `401` responses could not certify the registry as empty.

## Phase 726 Update - HMO Portal Slice

## What changed
1. Fixed the HMO portal dashboard so auth/load failures no longer render fake empty adapter, specialty, submissions, or stats states.
- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx`

2. Recorded the completed HMO portal browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/hmo-portal`.
3. Corroborate the `Adapters` tab against `GET /rcm/hmo-portal/adapters` and confirm it returns the five live portal adapters `PH-MAXICARE`, `PH-MEDICARD`, `PH-INTELLICARE`, `PH-PHILCARE`, and `PH-VALUCARE`.
4. Corroborate the `LOA Builder` tab against `GET /rcm/hmo-portal/specialties` and confirm it returns the live specialty-template catalog including `general_medicine`, `surgery`, and the rest of the portal-supported specialties.
5. Corroborate the `Submissions` tab against `GET /rcm/hmo-portal/submissions` and confirm it returns `submissions: []`, matching the browser message `No submissions yet. Build and submit an LOA or claim packet to get started.`
6. Corroborate the `Stats` tab against `GET /rcm/hmo-portal/submissions/stats` and confirm all submission-state counters return `0`.
7. Open `/cprs/admin/hmo-portal` in a fresh unauthenticated browser context and confirm the route-backed tabs show truthful auth failures such as `Unable to load adapters. Authentication required`, `Unable to load specialty templates. Authentication required`, `Unable to load submissions. Authentication required`, and `Unable to load stats. Authentication required`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated HMO portal page swallowed `401` failures and rendered fake loaded states such as `No adapters registered` and the same empty submissions copy used for a genuine zero-state tenant.
- Direct authenticated route corroboration showed the real live contract was five portal adapters, a populated specialty-template catalog, zero submissions, and zeroed submission stats for the active tenant.
- After the fix, the authenticated browser page still matches that live route truth, while the unauthenticated page now fails closed on the route-backed tabs with truthful auth/load failure messaging.

## Follow-ups
1. Keep shared admin fetch helpers strict about non-OK responses; this surface used a single permissive helper across four route-backed tabs, which let one auth failure pattern masquerade as multiple valid empty-state views.

## Phase 726 Update - LOA Queue Slice

## What changed
1. Fixed the LOA work queue so auth/load failures no longer render the same empty queue used for a genuinely empty tenant.
- `apps/web/src/app/cprs/admin/loa-queue/page.tsx`

2. Recorded the completed LOA queue browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/loa-queue`.
3. Corroborate the queue against `GET /rcm/payerops/loa-queue?sortBy=slaDeadline&sortDir=asc` and confirm it returns `items: []`, `total: 0`, and zeroed `slaBreakdown` values.
4. Corroborate the backing list route against `GET /rcm/payerops/loa` and confirm it returns `count: 0` and `loaCases: []`.
5. Confirm the authenticated browser page shows `Total Active: 0`, all SLA counters at `0`, and `No active LOA cases match the current filters.`
6. Open `/cprs/admin/loa-queue` in a fresh unauthenticated browser context and confirm the page shows `Unable to load LOA queue. Authentication required` instead of the loaded empty queue state.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated LOA queue page swallowed `401` failures and rendered the same empty queue summary and `No active LOA cases match the current filters.` copy used for a genuine zero-case tenant.
- Direct authenticated route corroboration showed the real live contract was a truthful zero-state LOA queue with zeroed SLA counters and no LOA cases for the active tenant.
- After the fix, the authenticated browser page still matches that live route truth, while the unauthenticated page now fails closed with `Unable to load LOA queue. Authentication required`.

## Follow-ups
1. Keep queue-style admin pages from reusing empty-state branches for failed initial loads; this surface needed the queue summary, filters, and empty table view suppressed whenever the first route fetch fails.

## Phase 726 Update - LOA Workbench Slice

## What changed
1. Fixed the LOA workbench so unauthenticated list and stats failures no longer collapse into the same empty-state or loading UI used for a genuinely empty LOA request store.
- `apps/web/src/app/cprs/admin/loa-workbench/page.tsx`

2. Recorded the completed LOA workbench browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/loa-workbench`.
3. Corroborate the default `Active LOAs` tab against `GET /rcm/loa` and confirm it returns `requests: []` with `total: 0`.
4. Switch to `Stats` and corroborate `GET /rcm/loa/stats`, confirming it returns `total: 0` with `byStatus: {}`.
5. Confirm the authenticated browser `Active LOAs` tab shows `No LOA requests found. Create one from the Create LOA tab.` and the `Stats` tab shows `Total LOAs 0`.
6. Open `/cprs/admin/loa-workbench` in a fresh unauthenticated browser context and confirm the default tab shows `Unable to load LOA requests. Authentication required` instead of the loaded empty request state.
7. Switch the unauthenticated page to `Stats` and confirm it shows `Unable to load LOA stats. Authentication required` instead of lingering on `Loading stats...`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated LOA workbench swallowed `401` failures from `/rcm/loa`, rendered `No LOA requests found. Create one from the Create LOA tab.`, and left the stats tab on `Loading stats...`, which falsely implied a loaded empty workbench.
- Direct authenticated route corroboration showed the real live contract was a truthful zero-state LOA request list plus zeroed stats for the active tenant.
- After the fix, the authenticated browser page still matches that live route truth, while the unauthenticated page now fails closed with explicit auth failures on both the list and stats tabs.

## Follow-ups
1. Keep zero-state admin workbenches from sharing the same render branch for failed initial loads and successful empty datasets; this slice needed separate failure handling for both the list and stats fetches.

## Phase 726 Update - Migration Slice

## What changed
1. Fixed the migration console so unauthenticated route failures no longer render fake `OFFLINE` health, fake empty import/export job tables, or a fake empty template selector.
- `apps/web/src/app/cprs/admin/migration/page.tsx`

2. Recorded the completed migration browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/migration`.
3. Corroborate `GET /migration/health` and `GET /migration/stats`, confirming both return `totalJobs: 0`, empty `byStatus` and `byDirection`, and `templateCount: 22`.
4. Corroborate `GET /migration/templates` and confirm it returns the live 22-template built-in catalog.
5. Corroborate `GET /migration/jobs?direction=import` and `GET /migration/jobs?direction=export`, confirming both return `jobs: []` with `total: 0`.
6. Confirm the authenticated browser `Import Jobs`, `Export Jobs`, `Mapping Templates`, and `Status` tabs match those live values, including `ONLINE`, the populated template catalog, and zero job counts.
7. Open `/cprs/admin/migration` in a fresh unauthenticated browser context and confirm the header shows `Authentication required` instead of `OFFLINE`.
8. Confirm the unauthenticated `Import Jobs`, `Export Jobs`, `Mapping Templates`, and `Status` tabs show their truthful auth failure messages instead of fake empty-state content.
9. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated migration console swallowed `401` failures from `/migration/health`, `/migration/templates`, `/migration/jobs`, and `/migration/stats`, then misreported the console as `OFFLINE` and rendered fake empty import/export/template states.
- Direct authenticated route corroboration showed the real live contract was `ONLINE`, `22` built-in templates, zero import/export jobs, and zeroed migration status cards.
- After the fix, the authenticated browser page still matches that live route truth, while the unauthenticated page now fails closed with explicit auth failures across the header and each route-backed tab.

## Follow-ups
1. Keep admin toolkit consoles from interpreting auth errors as subsystem health or zero-state data; this surface needed explicit separation between failed health checks and a truly offline migration service.

## Phase 726 Update - Module Disabled Slice

## What changed
1. Browser-proved the static module-disabled guard page and confirmed no code change was required.
- `apps/web/src/app/cprs/admin/module-disabled/page.tsx`

2. Recorded the completed module-disabled browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/module-disabled?module=Imaging` in an authenticated browser session.
3. Confirm the page shows `Module Not Enabled`, interpolates `Imaging` into the warning message, links `Module Administration` to `/cprs/admin/modules`, and links `Return to CPRS` to `/cprs`.
4. Open the same URL in a fresh unauthenticated browser context and confirm the same truthful static guard page renders.
5. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The page is a static query-driven guard surface with no backing API calls.
- Authenticated and unauthenticated browser passes both rendered the same truthful contract for `module=Imaging`, with no fake live data or mutation affordances.
- No truth defect was found, so no code change was required for this slice.

## Follow-ups
1. Keep disabled-module guard pages simple and static; this slice is only truthful because it does not pretend to resolve entitlements or facility state dynamically.

## Phase 726 Update - PayerOps Slice

## What changed
1. Fixed the payerops console so auth/load failures no longer render a fake offline badge or the same empty-state copy used for a genuinely empty payer-operations workspace.
- `apps/web/src/app/cprs/admin/payerops/page.tsx`

2. Recorded the completed payerops browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/payerops` in a fresh unauthenticated browser context and confirm the header shows `Unable to load payer operations status.` with `Authentication required` instead of a fake `OFFLINE` badge.
3. Switch the unauthenticated page through `Enrollments`, `LOA Cases`, `Credential Vault`, and `Adapters` and confirm each tab shows its truthful auth failure message instead of a loaded empty-state.
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/payerops`.
5. Corroborate the header and stats strip against `GET /rcm/payerops/health` and `GET /rcm/payerops/stats`, confirming `ONLINE`, `encryption: healthy`, `portalConfigs: 0`, and zeroed counts.
6. Corroborate the `Enrollments`, `LOA Cases`, `Credential Vault`, and `Adapters` tabs against `GET /rcm/payerops/enrollments`, `GET /rcm/payerops/loa`, `GET /rcm/payerops/credentials`, `GET /rcm/payerops/credentials/expiring?days=60`, and `GET /rcm/payerops/adapters`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated payerops page swallowed `401` failures, rendered a fake `OFFLINE` status, and fell through to the same empty-state copy used for genuine zero enrollments, LOA cases, credentials, and adapters.
- Direct authenticated route corroboration showed a truthful healthy zero-state stack: payerops health `ok:true`, zeroed aggregate stats, zero enrollments, zero LOA cases, zero credentials, zero expiring credentials, and two live adapters with `portalConfigs: 0`.
- After the fix, unauthenticated browser passes show truthful auth failure messaging in the header and across all four tabs, while the authenticated browser page still matches the live payerops route contracts.

## Follow-ups
1. Keep admin workspaces with shared fetch helpers strict about non-OK response handling; this page was reusing one JSON helper that turned every auth failure into silent fake zero-state UI.

## Phase 726 Update - Payer Registry Slice

## What changed
1. Fixed the payer-registry console so auth/load failures no longer render the same zero-state or loading-state copy used for a genuinely empty persistent registry.
- `apps/web/src/app/cprs/admin/payer-registry/page.tsx`

2. Recorded the completed payer-registry browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/payer-registry` in a fresh unauthenticated browser context and confirm the `registry` tab shows `Unable to load payer registry.` with `Authentication required` instead of `No payers in persistent store`.
3. Switch the unauthenticated page through `evidence`, `audit`, and `stats` and confirm each tab shows its truthful auth failure message instead of loaded zero-state or loading copy.
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/payer-registry`.
5. Corroborate the `registry` tab against `GET /admin/payers` and confirm it returns `count: 0`, `total: 0`, and `payers: []`.
6. Corroborate the `evidence` and `stats` tabs against `GET /admin/payers/stats` and confirm the page shows zeroed evidence coverage and zeroed registry stats.
7. Corroborate the `audit` tab against `GET /admin/payers/audit/verify` and confirm it shows `CHAIN VALID: Empty audit trail`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated payer-registry page swallowed `401` failures and rendered the same registry zero-state copy used for a genuine empty persistent store, which falsely implied the registry had loaded successfully.
- Direct authenticated route corroboration showed `GET /admin/payers` returning a truthful empty registry, `GET /admin/payers/stats` returning zeroed stats and evidence coverage, and `GET /admin/payers/audit/verify` returning `Empty audit trail`.
- After the fix, unauthenticated browser passes on `registry`, `evidence`, `audit`, and `stats` show truthful auth failure messaging, while the authenticated browser page still matches the live zero-state payer-registry routes.

## Follow-ups
1. Keep admin registry consoles strict about non-OK response handling on every tab; this page had four independent route-backed surfaces, and silent catch blocks were allowing auth failures to masquerade as clean empty-state data.

## Phase 726 Update - Remittance Intake Slice

## What changed
1. Fixed the remittance-intake dashboard so auth/load failures no longer render the same empty-state or loading-state copy used for genuinely empty remittance data.
- `apps/web/src/app/cprs/admin/remittance-intake/page.tsx`

2. Fixed the remittance-intake tab styles so live tab switching no longer emits the React shorthand-border warning.
- `apps/web/src/app/cprs/admin/remittance-intake/page.tsx`

3. Recorded the completed remittance-intake browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/remittance-intake` in a fresh unauthenticated browser context and confirm the `Documents` tab shows `Authentication required` instead of `No remittance documents. Upload one from the Upload tab.`
3. Switch the unauthenticated page to `Stats` and confirm it shows `Authentication required` instead of lingering on `Loading stats...`
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/remittance-intake`.
5. Corroborate the `Documents` tab against `GET /rcm/remittance` and confirm it returns `documents: []` and `total: 0`.
6. Corroborate the `Stats` tab against `GET /rcm/remittance/stats` and confirm it returns `total: 0`, `totalPaid: 0`, `underpaymentCount: 0`, and `underpaymentTotal: 0`.
7. Switch through `Documents`, `Upload`, and `Stats` and confirm the tab switch no longer emits the prior React border warning.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated remittance page swallowed `401` failures and rendered the same zero-documents copy used for real empty remittance data, while the `Stats` tab could remain on a misleading loading state.
- Direct authenticated route corroboration showed `GET /rcm/remittance` returning a truthful zero document list and `GET /rcm/remittance/stats` returning truthful zero totals for this tenant.
- After the fix, unauthenticated browser passes on `Documents` and `Stats` show truthful auth failure messaging, while the authenticated browser page still matches the live zero-state remittance routes.
- The React tab-style warning seen during the initial browser pass no longer reproduced after normalizing the tab border styles.

## Follow-ups
1. Keep mixed workflow pages with independent fetch paths strict about route-failure handling; this page had one live list tab and one live stats tab, and both were previously misreporting auth failures as real empty-state UI.

## Phase 726 Update - PH HMO Console Slice

## What changed
1. Fixed the PH HMO Console so auth/load failures no longer render fake empty or partially loaded states across Registry, Capabilities, Packets, and Validation.
- `apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx`

2. Recorded the completed PH HMO Console browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/ph-hmo-console` in a fresh unauthenticated browser context and confirm each tab now shows `Authentication required` instead of fake loaded states such as `No HMOs match the current filter` or `Validation data unavailable`.
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/ph-hmo-console`.
4. Corroborate the `Registry` tab against `GET /rcm/payers/ph/hmos` and `GET /rcm/payers/ph/hmos/stats`, confirming the page shows `27` total HMOs, `5` with portal support, `22` contracting-needed, and live registry rows.
5. Corroborate the `Validation` tab against `GET /rcm/payers/ph/hmos/validate`, confirming it shows `Registry Valid YES`, `HMO Count 27`, `Errors 0`, and `Warnings 17`.
6. On the `Packets` tab, select `Maxicare (PH-MAXICARE)` and generate a LOA packet, then corroborate it against `GET /rcm/payers/ph/hmos/PH-MAXICARE/loa-packet`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated PH HMO Console swallowed `401` failures and rendered fake loaded states across all four tabs: an empty registry state, an empty capability matrix, a packet selector with no HMO options, and `Validation data unavailable`.
- Direct authenticated route corroboration showed a live 27-row PH HMO registry with stats `withPortal: 5` and `contractingNeeded: 22`, a valid 27-row validation report with `17` warnings, and a live Maxicare LOA packet under `/rcm/payers/ph/hmos/PH-MAXICARE/loa-packet`.
- After the fix, unauthenticated browser passes on every tab show truthful auth failure messaging, while the authenticated browser page still matches the live registry, validation, and packet-generation routes.

## Follow-ups
1. Keep multi-tab admin consoles strict about non-OK response handling; silent catch blocks were causing this page to misrepresent auth failures as loaded registry data on every tab.

## Phase 726 Update - Payer Intelligence Slice

## What changed
1. Fixed the payer-intelligence dashboard so auth/load failures no longer render the same empty-state copy used for successfully loaded KPI and aging zero-states.
- `apps/web/src/app/cprs/admin/payer-intelligence/page.tsx`

2. Recorded the completed payer-intelligence browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/payer-intelligence` in a fresh unauthenticated browser context and confirm the default `Payer KPIs` section shows `Authentication required` together with `Unable to load payer intelligence.` instead of `No payer data in selected period.`
3. Switch the unauthenticated page to `Aging Summary` and confirm it shows `Unable to load aging data.` instead of `No aging data.`
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/payer-intelligence`.
5. Corroborate the `Payer KPIs` section against `GET /payerops/analytics/payer-intelligence` and confirm it returns `report.payers: []` for the active tenant on this stack.
6. Corroborate the `Aging Summary` section against `GET /payerops/analytics/aging` and confirm it returns a zeroed five-bucket aging report with `totalOutstanding: 0` and `totalClaims: 0`.
7. Switch between `Payer KPIs` and `Aging Summary` and confirm the browser remains aligned with those live route-backed zero-states.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated payer-intelligence page showed `Authentication required` while still rendering the loaded empty-state copy `No payer data in selected period.` on the KPI section and `No aging data.` on the aging section, which falsely implied successful data loads.
- Direct authenticated route corroboration showed `GET /payerops/analytics/payer-intelligence` returning a truthful zero KPI report with `payers: []`, while `GET /payerops/analytics/aging` returned a truthful zero aging report with `totalOutstanding: 0`, `totalClaims: 0`, and five zeroed buckets.
- After the fix, the unauthenticated browser page renders section-specific load-failure messages, and the authenticated browser page matches the live zero-state contracts for both KPI and aging sections.

## Follow-ups
1. Keep analytics pages strict about separating auth/load failures from true zero-data states, especially when multiple sections share one top-level error flag.

## Phase 726 Update - Payments Slice

## What changed
1. Fixed the payments dashboard so auth/load failures no longer render the same empty-state copy used for successfully loaded zero-data tabs.
- `apps/web/src/app/cprs/admin/payments/page.tsx`

2. Recorded the completed payments browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/payments` in a fresh unauthenticated browser context and confirm the default `batches` tab shows `Authentication required` together with `Unable to load remittance batches.` instead of `No batches yet. Create one to get started.`
3. Switch the unauthenticated page through `reconciliation`, `aging`, and `underpayments` and confirm each tab shows truthful load-failure copy rather than loaded zero-state copy.
4. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/payments`.
5. Corroborate the `batches` tab against `GET /payerops/payments/batches` and confirm it returns `items: []` and `total: 0`.
6. Corroborate the `reconciliation` tab against `GET /payerops/payments/reconciliation` and confirm it returns `items: []` and `total: 0`.
7. Corroborate the `aging` tab against `GET /payerops/analytics/aging` and confirm it returns a zeroed five-bucket aging report with `totalOutstanding: 0` and `totalClaims: 0`.
8. Corroborate the `underpayments` tab against `GET /payerops/payments/underpayments` and confirm it returns `items: []` and `total: 0`.
9. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated payments page swallowed `401` failures and rendered the same empty-state copy used for genuine zero-data tabs, starting with `No batches yet. Create one to get started.` on the default tab.
- Direct authenticated route corroboration showed `batches`, `reconciliation`, and `underpayments` all returning `{"ok":true,"items":[],"total":0}`, while `GET /payerops/analytics/aging` returned a truthful zero aging report.
- After the fix, the unauthenticated browser page renders tab-specific load-failure messages, and the authenticated browser page matches the live zero-state route contracts for all four tabs.

## Follow-ups
1. Keep multi-tab workbench pages defensive per tab; this surface had four independent fetch paths and all four needed explicit failure handling to avoid fake empty-state claims.

## Phase 726 Update - Denials Slice

## What changed
1. Fixed the denials workbench so auth/load failures no longer render the same empty-state copy used for a genuinely empty resolved denial queue.
- `apps/web/src/app/cprs/admin/denials/page.tsx`

2. Recorded the completed denials browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/denials` in a fresh unauthenticated browser context and confirm the page shows `Authentication required` together with `Unable to load denials.` instead of `No denials found. All denials have been resolved.`
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/denials`.
4. Corroborate the default unresolved view against `GET /rcm/claims/lifecycle/denials?resolved=false&limit=25&offset=0` and confirm it returns `items: []` and `total: 0`.
5. Corroborate the resolved view against `GET /rcm/claims/lifecycle/denials?resolved=true&limit=25&offset=0` and confirm it also returns `items: []` and `total: 0` on this tenant.
6. Click `Refresh` and confirm the page stays aligned with the live unresolved zero-state route.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated denials page rendered both `Authentication required` and `No denials found. All denials have been resolved.`, which falsely implied the queue had loaded and been confirmed empty even though the underlying route call had failed with `401`.
- Direct authenticated route corroboration showed both unresolved and resolved lifecycle denial routes returning a truthful zero-state: `{"ok":true,"items":[],"total":0}`.
- After the fix, a fresh unauthenticated browser pass showed `Authentication required` with `Unable to load denials.`, while the authenticated browser page matched the live unresolved zero-state route and `Refresh` preserved that alignment.

## Follow-ups
1. Keep RCM workbench pages strict about separating auth/load failures from resolved-empty-state copy; the same message cannot truthfully represent both conditions.

## Phase 726 Update - Claims Workbench Slice

## What changed
1. Fixed the claims-workbench console so auth/load failures render honest error states instead of collapsing into fake zero-state copy.
- `apps/web/src/app/cprs/admin/claims-workbench/page.tsx`

2. Fixed the claims-workbench tab styles to remove the shorthand-border React warning exposed during live tab switching.
- `apps/web/src/app/cprs/admin/claims-workbench/page.tsx`

3. Replaced stale invalid VEHU example values on the create form with truthful current sandbox examples.
- `apps/web/src/app/cprs/admin/claims-workbench/page.tsx`

4. Recorded the completed claims-workbench browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/claims-workbench` in a fresh unauthenticated browser context and confirm the page shows `Error: Authentication required` plus a truthful load-failure message such as `Unable to load claims board.` instead of `No claims data yet.`
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/claims-workbench`.
4. Corroborate the `Status Board` tab against `GET /rcm/claims/hmo/board` and confirm it shows `Total Claims 0` with no fabricated claim states or denial rows.
5. Click `VistA Sources` and corroborate the page against `GET /rcm/claims/source-map`, confirming the page shows `Total Fields 23`, `Available 11`, `Awaiting Config 8`, and `Not Applicable 4`.
6. Click `Rulepacks` and corroborate the page against `GET /rcm/payers/rulepacks`, confirming the five live payer rulepack cards render.
7. Click `Create Claim` and confirm the form now uses truthful VEHU examples `e.g. 46` and `e.g. ZZZRETFOURNINETYFOUR,PATIENT`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated claims-workbench page swallowed `401` responses from its backing routes and rendered the false zero-state `No claims data yet.` even though the board, source-map, and rulepack requests had all failed.
- Direct authenticated route corroboration showed `GET /rcm/claims/hmo/board` returning a truthful zero board, `GET /rcm/claims/source-map` returning `23` entries with stats `11/8/4`, and `GET /rcm/payers/rulepacks` returning `5` live payer rulepacks.
- After the fix, the unauthenticated browser page renders `Error: Authentication required` and tab-specific load-failure messages, while the authenticated browser page matches the live board, source-map, and rulepack routes.
- The tab-switch React warning is gone after normalizing the tab border styles, and the `Create Claim` form no longer suggests invalid VEHU test data.

## Follow-ups
1. Keep workflow dashboards strict about distinguishing load/auth failures from true zero-data states; this page had three different live-backed tabs, and all of them were being misrepresented by silent catch blocks.

## Phase 726 Update - Claims Queue Slice

## What changed
1. Fixed the claims-queue console so auth failures no longer render the same empty-state copy used for a genuinely empty queue.
- `apps/web/src/app/cprs/admin/claims-queue/page.tsx`

2. Recorded the completed claims-queue browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/claims-queue` in a fresh unauthenticated browser context and confirm the page shows `Authentication required` without also showing `No claims found. Create one to get started.`
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/claims-queue`.
4. Corroborate the page against `GET /rcm/claims/lifecycle?limit=5` and confirm it returns `items: []` and `total: 0`.
5. Corroborate the summary cards against `GET /rcm/claims/lifecycle/stats` and confirm the page shows `Total Claims 0`, `Unresolved Denials 0`, `Scrub Pass Rate 0%`, and `Total Denials 0`.
6. Click `Refresh` and confirm the page stays aligned with the live lifecycle and stats routes.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated claims queue page rendered both `Authentication required` and `No claims found. Create one to get started.`, which falsely implied a confirmed empty queue even though the underlying route calls had failed with `401`.
- Direct authenticated route corroboration showed `GET /rcm/claims/lifecycle?limit=5` returning `{"ok":true,"items":[],"total":0}` and `GET /rcm/claims/lifecycle/stats` returning zeroed lifecycle metrics for this stack.
- After the fix, a fresh unauthenticated browser pass showed only `Authentication required`, while the authenticated browser page matched the live zero-state route contract exactly and `Refresh` preserved that alignment.

## Follow-ups
1. Keep admin queue pages strict about separating load/auth failures from true empty-data states; the same copy cannot truthfully represent both conditions.

## Phase 726 Update - Certification Slice

## What changed
1. Fixed the certification console so auth failures and malformed posture payloads surface as page errors instead of crashing the CPRS content boundary.
- `apps/web/src/app/cprs/admin/certification/page.tsx`

2. Recorded the completed certification browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Open `/cprs/admin/certification` in a fresh unauthenticated browser context and confirm the page shows `Error: Authentication required` instead of crashing.
3. Authenticate in the browser as `PRO1234 / PRO1234!!` and reopen `/cprs/admin/certification`.
4. Corroborate the page against `GET /posture/certification` and confirm it shows `100%`, `PRODUCTION`, `10/10 certification gates pass (production)`, and the same 10 gate rows.
5. Click `Refresh` and confirm the page stays aligned with the live certification posture payload.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the unauthenticated certification page crashed with `TypeError: Cannot read properties of undefined (reading 'filter')` because it assumed `posture.gates` existed even when the route returned an auth error payload.
- After the fix, the same unauthenticated page load renders `Error: Authentication required`, which is truthful for the `/posture/*` admin auth contract.
- Authenticated route corroboration showed `GET /posture/certification` returning `score: 100`, `readinessLevel: production`, `summary: 10/10 certification gates pass (production)`, and 10 passing gates.
- The authenticated browser page matched that route contract exactly, and clicking `Refresh` kept the browser aligned with the live route response.

## Follow-ups
1. Keep posture-backed admin pages defensive about auth and malformed payloads; these routes should degrade into error states rather than crashing the content pane.

## Phase 726 Update - Capability Matrix Slice

## What changed
1. Recorded the completed capability-matrix browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/capability-matrix`.
3. Confirm the page shows the live Phase 88 header and, on this stack, the truthful zero-state `No capability data yet. Run ingestion from Payer Directory first, then configure capabilities here.`
4. Corroborate the page against `GET /rcm/payerops/capability-matrix` and confirm it returns `count: 0`, `matrix: []`, and zeroed stats.
5. Corroborate the guidance against `GET /rcm/payerops/payers?limit=5` and confirm the payer registry is also empty on this stack.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Authenticated route corroboration showed `GET /rcm/payerops/capability-matrix` returning `ok: true`, zero matrix rows, the five expected capability types, and zeroed stats.
- The browser page matched that live route contract with `0 cells, 0 active+proven`, no grid rows, and the same empty-state guidance.
- A follow-up authenticated route check showed `GET /rcm/payerops/payers?limit=5` also returning `count: 0` and `payers: []`, confirming the browser guidance about running ingestion from Payer Directory is truthful rather than stale copy.
- No product truth defect was found in this slice; the page accurately reflects the live empty capability registry.

## Follow-ups
1. When payer ingestion populates the registry on this stack, rerun this slice to cover the interactive cell drawer and evidence-enforcement behavior with live data.

## Phase 726 Update - Branding Slice

## What changed
1. Fixed the admin branding console so it resolves the current session tenant instead of hardcoding `default`, which was triggering cross-tenant admin validation failures.
- `apps/web/src/app/cprs/admin/branding/page.tsx`

2. Made the branding page surface real API failures instead of silently rendering a shell when the backing admin routes reject the request.
- `apps/web/src/app/cprs/admin/branding/page.tsx`

3. Recorded the completed branding browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/branding`.
3. Confirm the page resolves the active tenant from the live session and no longer hangs on `Loading...`.
4. Corroborate the `Branding` tab against `GET /admin/branding/<tenantId>` and confirm the blank disabled branding state matches the live payload.
5. Click `Theme` and confirm `Modern Default` is selected, matching `GET /admin/ui-defaults/<tenantId>`.
6. Click `Preview` and confirm the fallback `VistA-Evolved` header/footer render for the disabled branding configuration.
7. On the `Theme` tab, click `Save Default Theme` with the current selection and confirm the success banner plus a follow-up `GET /admin/ui-defaults/<tenantId>` response showing `themePack: modern-default`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the authenticated branding page called `/admin/branding/default` and `/admin/ui-defaults/default`, which the live backend rejected with `400 reason is required for cross-tenant admin actions`, leaving the page on a fake loading state.
- After the fix, the page resolved tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e` from `/admin/my-tenant`, and the browser page matched the live branding payload (`enabled: false`, empty visual overrides) and live UI defaults payload (`themePack: modern-default`, `theme: light`, `density: comfortable`, `layoutMode: cprs`).
- A safe live `Save Default Theme` action succeeded in the browser and the follow-up route check confirmed `themePack: modern-default` remained persisted for the active tenant.

## Follow-ups
1. Keep tenant-targeted admin pages aligned with the session tenant or with explicit tenant-resolution UX; hardcoding `default` is not compatible with the current admin cross-tenant guardrails.

## Phase 726 Update - Billing Slice

## What changed
1. Fixed the admin billing console so it uses the real live billing API contract instead of a nonexistent `/admin/billing/*` route family.
- `apps/web/src/app/cprs/admin/billing/page.tsx`

2. Added a truthful session-scoped usage endpoint backed by the metering snapshot store so the `Usage` tab can render live counters.
- `apps/api/src/billing/billing-routes.ts`

3. Recorded the completed billing browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/billing`.
3. Confirm the `Plans` tab shows the five live billing plans with monthly pricing, entity types, provider limits, and feature summaries.
4. Click `Subscription` and confirm the page shows the current tenant subscription with plan, status, period dates, and the disabled cancel button when already cancelled.
5. Click `Usage` and confirm the page shows the metering snapshot note plus the live counter table from `/billing/usage`.
6. Click `Health` and confirm the page shows the live provider/configuration payload from `/billing/health`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Before the fix, the browser billing page rendered `No plans available` and emitted 404s because it called a nonexistent `/admin/billing/*` API family while the live backend exposed `/billing/*` routes only.
- Direct authenticated route corroboration showed `GET /billing/plans`, `GET /billing/subscription`, and `GET /billing/health` all returned 200, while `GET /admin/billing/plans` returned 404.
- After the fix, authenticated browser-session route corroboration showed `GET /billing/plans` returning five live plans, `GET /billing/subscription` returning the current cancelled enterprise subscription for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`, `GET /billing/usage` returning a truthful `metering-snapshot` payload with live counters, and `GET /billing/health` returning `{ ok: true, provider: "mock", configured: false }`.
- The browser `Plans`, `Subscription`, `Usage`, and `Health` tabs matched those live route payloads in the audited session.
- The billing tab-strip style warning found during interaction was fixed by removing the shorthand/longhand border conflict in the tab styles.

## Follow-ups
1. Keep the billing admin surface explicitly session-scoped unless a real admin cross-tenant billing API is added; the original editable tenant box implied capabilities the backend does not provide.

## Phase 726 Update - Analytics Slice

## What changed
1. Fixed the analytics event-buffer stats contract so the admin analytics page no longer renders `NaN%` for live buffer usage.
- `apps/api/src/services/analytics-store.ts`

2. Recorded the completed analytics browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/analytics`.
3. Confirm the `Ops Dashboard` tab shows a numeric `Buffer Usage` value and a visible event-category table instead of `NaN%`.
4. Click `Clinical Utilization` and confirm the page matches the live zero-state utilization metrics.
5. Click `Events Explorer` and confirm the page shows the live `usage.report / dashboard_ops_view` event rows.
6. Click `Export`, then click `Run Aggregation Now`, and confirm the page shows `Aggregation triggered successfully` while the hourly and daily bucket counts update.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the analytics slice remained clean with `{"ok":true,...,"platformPg":{"ok":true}}`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Before the fix, both the browser `Ops Dashboard` and `Export` tabs rendered `Buffer Usage: NaN%` because the live event-buffer stats helper returned `categoryCounts` only and no `bufferUsage` compatibility field.
- After the fix and canonical API restart, `GET /analytics/health` returned `eventBuffer.bufferUsage: 0.00008`, `categories: {"usage.report":4}`, `hourlyBuckets: 2`, and `dailyBuckets: 2`, and the browser `Export` tab matched those values with truthful rounded display.
- Direct authenticated API corroboration showed `GET /analytics/dashboards/clinical` returning a truthful zero-state contract, and the browser `Clinical Utilization` tab matched that route output exactly.
- Direct authenticated API corroboration showed `GET /analytics/events?limit=10` returning four `usage.report` events for `dashboard_ops_view`, and the browser `Events Explorer` tab rendered the same four rows.
- Clicking the browser `Run Aggregation Now` control returned `Aggregation triggered successfully`, and both the browser and the live `/analytics/health` route immediately reflected the updated aggregation bucket counts.

## Follow-ups
1. Keep analytics route payloads backward-compatible where admin dashboards already depend on field names that were shipped earlier; this slice failed because the helper and page drifted apart on stats naming.

## Phase 726 Update - Alignment Slice

## What changed
1. Recorded the completed alignment browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/alignment`.
3. Confirm the `Score` tab shows `79` global score plus the live registry summary cards and panel rows.
4. Click `Gates` and confirm the page shows `Pass: 8`, `Fail: 0`, `Warn: 0`, with the same gate rows returned by `/admin/alignment/gates`.
5. Click `Tripwires`, verify the initial zero-state if clean, then click `Seed Defaults` and confirm the page shows the five default tripwire rows.
6. Click `Snapshots`, verify the initial zero-state if clean, then click `Capture Now` and confirm the page shows the new live snapshot row with `registrySize: 424` and `passRate: 100%`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the alignment slice remained clean with `{"ok":true,...,"platformPg":{"ok":true}}`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Direct authenticated API corroboration showed `GET /admin/alignment/summary` returning `globalScore: 79`, `fullyWiredPanels: 9`, `partiallyWiredPanels: 6`, `noVistaPanels: 4`, `registrySize: 424`, `exceptionCount: 421`, `gatesPass: 8`, `gatesFail: 0`, `gatesWarn: 0`, and initial zero-state counts for snapshots and tripwires.
- The browser `Score` and `Gates` tabs matched those live contracts exactly, including the visible panel rows and eight passing gate checks.
- The browser `Tripwires` tab matched the initial empty state from `/admin/alignment/tripwires`, and clicking `Seed Defaults` created the five expected live tripwire rows, which the route returned immediately after the browser action.
- The browser `Snapshots` tab matched the initial empty state from `/admin/alignment/snapshots`, and clicking `Capture Now` created a live snapshot row with `registrySize: 424`, `passRate: 100`, and `capturedBy: admin`, which the route returned immediately after the browser action.
- No product truth defect was found in this slice; the page matched the live alignment contracts before and after safe browser-driven interactions.

## Follow-ups
1. Keep alignment interactions safe and state-light during browser audits; tripwire seeding and snapshot capture are sufficient proof paths without introducing synthetic failure events.

## Phase 726 Update - Adapters Slice

## What changed
1. Fixed the adapters RPC Coverage tab so it matches the live runtime-matrix payload and no longer renders blank RPC names or duplicate undefined keys.
- `apps/web/src/app/cprs/admin/adapters/page.tsx`

2. Recorded the completed adapters browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/adapters`.
3. Confirm the `Adapter Health` tab shows `ALL HEALTHY` plus the five live adapter rows.
4. Click `Domain Matrix` and confirm the page shows `88 available`, `0 missing`, `88 total RPCs`, `Instance: worldvista-docker`, and the live domain coverage rows.
5. Click `RPC Coverage` and confirm the table renders real RPC names such as `ORWPT LIST ALL`, `ORQQAL LIST`, `ORQQVI VITALS`, and `ORWDX SAVE` instead of blank names.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the adapters slice remained clean with `{"ok":true,...,"platformPg":{"ok":true}}`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Direct authenticated API corroboration showed `GET /api/adapters/health` returning five healthy non-stub adapters: `clinical-engine`, `scheduling`, `billing`, `imaging`, and `messaging`.
- The browser `Adapter Health` tab matched that live route state with `ALL HEALTHY` and the same five rows.
- Direct authenticated API corroboration showed `GET /vista/runtime-matrix` returning `instanceId: worldvista-docker`, `totalAvailable: 88`, `totalMissing: 0`, and `totalKnown: 88`, and the browser `Domain Matrix` tab matched those live values.
- The initial browser `RPC Coverage` pass exposed a real contract defect: the live payload uses `rpcName`, but the UI rendered `name`, leaving the `RPC Name` column blank and generating duplicate keys like `patient-undefined`.
- After the fix, the browser `RPC Coverage` tab rendered truthful RPC names for all `89` visible entries and no longer showed blank-name rows.

## Follow-ups
1. Keep the adapters page tolerant of runtime payload aliases where route contracts already expose both historical and current field names.

## Phase 726 Update - Break-Glass Slice

## What changed
1. Recorded the completed break-glass browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/break-glass`.
3. Confirm the Sessions tab reflects the current live route state.
4. Click `Posture` and confirm the page shows truthful IAM posture values plus the same break-glass counts returned by `/admin/iam/posture`.
5. Click `Request`, submit a controlled request, return to `Sessions`, and verify the row appears with live `Approve` and `Deny` controls.
6. Deny the pending request and confirm the final live stats return `activeCount: 0`, `pendingCount: 0`, and `byStatus.denied` incremented.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the break-glass slice returned `{"ok":true,...,"platformPg":{"ok":true}}`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Direct authenticated API corroboration on initial load showed `GET /admin/break-glass/active` returning `sessions: []`, `GET /admin/break-glass/stats` returning `total: 0`, and `GET /admin/iam/posture` returning matching zeroed `breakGlass` posture values.
- The browser Sessions and Posture tabs matched that zero-state and posture-state contract exactly.
- A browser-originated submit on the Request tab created session `4a203f31-46ae-4dbb-8a2b-cbbef3a7b656`, and the live route immediately reflected that new `pending` session with the same module, permission, DFN, and reason shown in the browser.
- Clicking the browser `Deny` control on the pending row moved the session into denied history, and the final live stats returned `total: 2`, `byStatus.denied: 2`, `activeCount: 0`, and `pendingCount: 0`.
- No product truth defect was found in this slice; the page matched the live route contracts across zero-state, posture, request creation, and deny-state transitions.

## Follow-ups
1. Keep break-glass verification using deny-state cleanup so future browser audits do not leave pending or active elevated-access sessions behind.

## Phase 726 Update - Modules Slice

## What changed
1. Fixed the modules Entitlements tab so it matches the real admin catalog contract and no longer crashes on live data.
- `apps/web/src/app/cprs/admin/modules/page.tsx`

2. Recorded the completed modules browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/modules`.
3. Confirm the Modules tab shows `14 modules enabled` and live rows for the current tenant.
4. Click `Entitlements` and confirm the page renders the live entitlement table instead of crashing.
5. Click `Feature Flags` and confirm the page shows the truthful empty state `No feature flags set for this tenant.`.
6. Click `Audit Log` and confirm the page shows the single live `entitlement/api.modules.override` row.
7. Click `Status` and confirm the page shows `Total Modules: 14`, `Enabled: 14`, `Always On: 1`, `Active SKU: FULL_SUITE`, `Total Tenants: 2`, and `Active Connectors: 4`.
8. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the modules slice returned `{"ok":true,...,"platformPg":{"ok":true}}`.
- Direct authenticated API corroboration showed `GET /api/modules/manifests` returning `14` enabled module manifests for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`.
- Direct authenticated API corroboration showed `GET /api/marketplace/config` returning the same `14` enabled modules and `2` active connectors for the sandbox jurisdiction, and `GET /api/marketplace/summary` returning `activeSku: FULL_SUITE`, `totalTenants: 2`, and `totalConnectors: 4`.
- Direct authenticated API corroboration showed `GET /admin/modules/feature-flags` returning `flags: []`, and the browser Feature Flags tab matched that truthful zero-state.
- Direct authenticated API corroboration showed `GET /admin/modules/audit` returning a single live legacy override entry for `entitlement/api.modules.override`, and the browser Audit Log tab rendered the same row.
- Before the fix, clicking the browser Entitlements tab crashed with `TypeError: Cannot read properties of undefined (reading 'name')` because the UI treated `/admin/modules/catalog` rows as `manifest` objects.
- After the fix, the Entitlements tab renders the full live table using the flat catalog shape and no longer crashes.

## Follow-ups
1. Keep the admin modules page explicit about its split backend contract; the marketplace routes and the Phase 109 entitlement routes should not be treated as interchangeable payload shapes.

## Phase 726 Update - Audit Viewer Slice

## What changed
1. Fixed the immutable-audit stats contract so the audit viewer no longer shows a false broken hash-chain state.
- `apps/api/src/routes/iam-routes.ts`
- `apps/web/src/app/cprs/admin/audit-viewer/page.tsx`

2. Recorded the completed audit-viewer browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/audit-viewer`.
3. Confirm the Events tab renders live immutable-audit rows and that selecting `Authentication` then clicking `Refresh` leaves only `auth.login` rows.
4. Click `Stats` and confirm the page shows truthful tenant counts plus `Global chain integrity: VALID`.
5. Click `Chain` and confirm the page shows `CHAIN VALID`.
6. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the final audit-viewer pass returned `{"ok":true,...,"platformPg":{"ok":true}}`.
- Direct authenticated API corroboration showed `GET /iam/audit/events?limit=5` returning the same tenant-scoped immutable-audit rows rendered in the browser, including `auth.login` and `audit.view`.
- Direct authenticated API corroboration showed `GET /iam/audit/events?actionPrefix=auth.&limit=50` returning only the filtered `auth.login` rows, and the browser Events filter interaction matched that route output.
- Before the fix, `GET /iam/audit/stats` omitted `chainValid`, so the browser Stats tab rendered `BROKEN` while `GET /iam/audit/verify` returned `valid:true` and the Chain tab showed `CHAIN VALID`.
- After the fix, `GET /iam/audit/stats` returns `chainValid:true` and `chainScope:"global"`, and the browser Stats tab now renders `Global chain integrity: VALID`, matching the live verify route.

## Follow-ups
1. Keep integrity indicators route-driven; this page should never infer hash-chain status from missing fields again.

## Phase 726 Update - Payer DB Slice

## What changed
1. Fixed the payer DB admin page so it no longer falsely claims the registry is SQLite-backed.
- `apps/web/src/app/cprs/admin/payer-db/page.tsx`

2. Recorded the completed payer DB browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `./start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/payer-db`.
3. Confirm the Payers tab renders live registry rows and that searching `Aetna` reduces the table to `US-AETNA`.
4. Click `SG-AIA` and confirm the live capabilities panel shows the truthful empty state `No capabilities set`.
5. Click `Evidence` and confirm the page shows `No evidence snapshots`.
6. Click `Audit` and confirm the page shows `Total events: 0` and `No audit events`.
7. Regenerate the runtime audit outputs:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the payer DB slice returned `{"ok":true,...,"platformPg":{"ok":true}}`.
- Direct authenticated API corroboration showed `GET /admin/payer-db/payers?limit=5` returning `ok:true`, `total:57`, and live payer rows beginning with `SG-AIA`, `AU-APRA-IMPORTER`, `NZ-ACC`, and `US-AETNA`.
- The browser Payers tab matched that live registry state and the in-browser search for `Aetna` reduced the list to the same single `US-AETNA` row.
- Direct authenticated API corroboration showed `GET /admin/payer-db/payers/SG-AIA/capabilities` returning `{"ok":true,"capabilities":[]}`, and the browser matched with a truthful `No capabilities set` state.
- Direct authenticated API corroboration showed `GET /admin/payer-db/evidence` returning `{"ok":true,"count":0,"snapshots":[]}`, and the browser Evidence tab matched with `No evidence snapshots`.
- Direct authenticated API corroboration showed `GET /admin/payer-db/audit/stats` returning `{"ok":true,"stats":{"total":0,"byAction":{},"byEntityType":{}}}`, and the browser Audit tab matched with `Total events: 0` and `No audit events`.
- The only live truth defect in this slice was stale UI copy claiming `Payer Registry (SQLite)`; the page now uses storage-agnostic wording that matches the current platform-backed registry.

## Follow-ups
1. Keep payer admin surfaces storage-agnostic unless the page is explicitly wired to a runtime-reported backend value.

## Phase 726 Update - Integrations Console Slice

## What changed
1. Fixed the admin integrations console so tenant-scoped admin requests use the authenticated session tenant instead of the stale hardcoded `default` tenant.
- `apps/web/src/app/cprs/admin/integrations/page.tsx`

2. Fixed the HL7 message-detail segment table so live VistA segment summaries no longer trigger duplicate React keys.
- `apps/web/src/app/cprs/admin/integrations/page.tsx`

3. Recorded the completed integrations browser proof in the Phase 726 browser audit and runtime audit override ledger.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Start the canonical API and verify live health:
	- `.\start-api.ps1`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate in the browser as `PRO1234 / PRO1234!!` and open `/cprs/admin/integrations`.
3. Confirm the registry tab is a truthful zero-state for the authenticated tenant rather than a 404/400 error state.
4. Click `VistA HL7/HLO` and confirm the live telemetry values render, including `20` logical links, `HL7.VEHU.DOMAIN.GOV`, `19` apps, and queue depth `7`.
5. Click `Message Browser`, click `Search`, then click `View` on IEN `39358` and confirm the detail panel opens with live masked segment summary data.
6. Regenerate the runtime audit outputs so the integrations surface no longer stays `unreviewed`:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- Canonical API health during the final integrations pass returned `{"ok":true,...,"platformPg":{"ok":true}}`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Direct authenticated API corroboration showed the actual tenant-scoped admin registry surfaces were truthfully empty for tenant `77371ffb-9929-4344-9fea-a0a7bbcc645e`: registry count `0`, health summary all zeros, and legacy connectors `[]`.
- The browser registry tab matched that live tenant-scoped state after the fix instead of showing the previous wrong-tenant `default` failures.
- Direct authenticated API corroboration showed `GET /vista/interop/summary` returning live interop telemetry with `linkCount: 20`, `domain: HL7.VEHU.DOMAIN.GOV`, `appCount: 19`, queue depth `7`, and `rpcsUsed` of `VE INTEROP HL7 LINKS`, `VE INTEROP HL7 MSGS`, `VE INTEROP HLO STATUS`, and `VE INTEROP QUEUE DEPTH`.
- The browser `VistA HL7/HLO` tab rendered those same live values, including `20` logical links, `TEST` mode, `19` registered apps, and queue depth `7`.
- Direct authenticated API corroboration showed `GET /vista/interop/v2/hl7/messages?limit=5` returning live message row `39358` (`outbound`, `done`, link `61`, text IEN `2230625`).
- The browser `Message Browser` tab rendered that same row, and clicking `View` opened live detail for IEN `39358` with `Total Segments: 2624` and masked segment summary rows.
- The live detail pass exposed a real UI defect under repeated VistA segment labels; the segment-summary table now uses a composite key so the earlier duplicate-key warnings do not recur during the clean proof path.

## Follow-ups
1. Keep `/cprs/admin/integrations` bound to the session tenant; future admin-console work should not hardcode `default` for tenant-scoped routes.

## Phase 726 Update - Browser Control Audit

## Phase 726 Update - Legacy Alias Audit

## What changed
1. Replaced the stale legacy patient-search and chart shells with canonical CPRS redirects.
- `apps/web/src/app/patient-search/page.tsx`
- `apps/web/src/app/chart/[dfn]/[tab]/page.tsx`

2. Preserved legacy chart slug compatibility while removing the duplicate chart implementation.
- `/chart/46/cover-sheet` now normalizes to `/cprs/chart/46/cover`
- Additional legacy aliases such as `dc-summaries`, `dc-summ`, `ai-assist`, `tele-health`, `med-rec`, `med-reconciliation`, `e-prescribing`, and `eprescribing` now flow through the same canonical redirect path

3. Recorded the alias proof in the Phase 726 browser audit and runtime audit overrides.
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`

## Manual test steps
1. Load the legacy alias entry points in the running web app:
	- `/patient-search`
	- `/chart/46/cover`
	- `/chart/46/cover-sheet`
2. Confirm the rendered frontend output resolves through the canonical CPRS pages rather than the removed legacy shells.
3. Regenerate the runtime checklist and truth matrix:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`

## Verifier output
- The pre-fix browser pass proved `/patient-search` was stale and divergent from the canonical CPRS patient-selection flow.
- The patched frontend now emits canonical Next redirects for the alias routes:
	- `/patient-search` -> `NEXT_REDIRECT;replace;/cprs/patient-search;307;`
	- `/chart/46/cover` -> `NEXT_REDIRECT;replace;/cprs/chart/46/cover;307;`
	- `/chart/46/cover-sheet` -> `NEXT_REDIRECT;replace;/cprs/chart/46/cover;307;`
- File diagnostics on the touched alias route files returned no errors.

## Follow-ups
1. Keep alias entry points as thin forwarding routes only; any future CPRS patient-search or chart changes should happen exclusively under the canonical `/cprs/*` paths.

## Phase 726 Update - Note Builder And Workspace Slice

## What changed
1. Repaired the clinician note-builder flow so it works on a clean tenant instead of opening as an empty dead surface.
- `apps/api/src/templates/types.ts`
- `apps/api/src/templates/template-engine.ts`
- `apps/api/src/templates/template-routes.ts`
- `apps/web/src/app/encounter/note-builder/page.tsx`
- `apps/api/tests/note-builder-template-fallback.test.ts`

2. Added session-level note-builder template routes with truthful starter-template fallback.
- `GET /encounter/note-builder/templates`
- `GET /encounter/note-builder/templates/:id`
- Built-in specialty-pack starters now appear when a tenant has no published templates.

3. Fixed the browser generation path end to end.
- Default DFN changed from invalid `3` to valid VEHU `46`
- Request body aligned on `dfn`
- Response now includes the nested `note` shape the page renders
- Client now fetches and sends CSRF explicitly on generate
- Client now normalizes `field.key` and `field.fieldType` instead of incorrectly reading `field.id` and `field.type`

4. Fixed the VistA workspace terminal WebSocket path end to end.
- `apps/api/src/routes/ws-terminal.ts`
- `/ws/terminal` now uses `request.session`, wraps terminal audit writes safely, no longer aborts on the stale post-start audit call, and parses buffered JSON control frames before forwarding shell input.

5. Fixed the handoff create-flow truth gap uncovered during the inpatient browser pass.
- `apps/web/src/app/cprs/handoff/page.tsx`
- `Load Ward Patients` now surfaces integration-pending CRHD metadata, the sandbox note, and the live fallback RPC instead of silently implying an empty ward when `/handoff/ward-patients` returns `count: 0` with declared pending targets.

6. Completed live chart-shell browser proof on the canonical VEHU stack.
- No code change was required for this slice; `/cprs/chart/46/cover` and `/cprs/chart/46/notes` matched the authenticated canonical API responses and are now recorded explicitly in the browser audit artifact.

7. Preserved evidence-backed runtime audit state across regeneration.
- `scripts/ui-estate/build-runtime-ui-estate.mjs`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `docs/ui-estate/README.md`
- Regenerated `data/ui-estate/runtime-ui-audit-checklist.json`, `docs/ui-estate/runtime-ui-audit-checklist.md`, `data/ui-estate/runtime-ui-truth-matrix.json`, and `docs/ui-estate/runtime-ui-truth-matrix.md` now retain browser-proven status for completed Phase 726 surfaces instead of resetting them all to `unreviewed`.

## Manual test steps
1. Start the API in a persistent session and verify health:
	- `pnpm api:restart:safe`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Verify note-builder routes with a real session and CSRF token:
	- login as `PRO1234 / PRO1234!!`
	- `GET /encounter/note-builder/templates`
	- `GET /encounter/note-builder/templates/:id`
	- `POST /encounter/note-builder/generate` with `dfn=46`
3. Open the browser page and prove the repaired UX:
	- `/encounter/note-builder`
	- select a starter template
	- fill required fields
	- click `Generate Draft Note`
4. Re-open the workspace shell and retest terminal mode after authentication:
	- `/cprs/vista-workspace`
	- switch to a module such as `MailMan`
	- switch to `Terminal`

## Verifier output
- `pnpm --dir apps/api exec vitest run tests/note-builder-template-fallback.test.ts` passed with `2/2` tests.
- File-level diagnostics on the touched note-builder and ws-terminal files returned no errors.
- Canonical API health after restart returned `{"ok":true,...,"platformPg":{"ok":true}}` and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`.
- Direct authenticated API proof after the patch returned `50` starter templates from `GET /encounter/note-builder/templates`, returned full field metadata for `Allergy/Immunology Consult` from `GET /encounter/note-builder/templates/:id`, and returned `ok:true` with generated draft text from `POST /encounter/note-builder/generate` for DFN `46`.
- Browser proof on `/encounter/note-builder` now renders the starter-template picker, valid default DFN `46`, full form fields, and a generated note containing `Chief Complaint: Audit chief complaint`, `Assessment: Stable chronic issues`, and `Plan: Continue current plan and follow up as needed`.
- Workspace shell proof on `/cprs/vista-workspace` is now complete on the canonical stack: the page rendered live package inventory and kernel status cards, `XM` terminal mode connected with live SSH output, interactive `pwd` returned `/home/vista`, and no resize JSON leaked into the pane after the buffered control-frame parsing fix.
- Inpatient browser proof is now explicit on the canonical stack: `/inpatient/census` rendered `29 wards | 182 total patients`, clicking `7A GEN MED` opened a live `38`-patient census table, and `/inpatient/bedboard` rendered the same live ward inventory with a populated `38 occupied` bed grid for `7A GEN MED`.
- Handoff create-flow proof now matches backend truth on the canonical stack: `/handoff/ward-patients?ward=7A%20GEN%20MED` returns `count: 0` with CRHD pending targets, and the browser now surfaces that integration-pending reason instead of leaving the user at a silent `0 patients loaded` state.
- Chart-shell browser proof is now explicit on the canonical stack: `/cprs/chart/46/cover` rendered the full patient banner and live cover widgets matching the VEHU routes for problems, allergies, medications, vitals, labs, appointments, and reminders; `/cprs/chart/46/notes` navigated cleanly, rendered live TIU-backed notes, and row click opened note detail for IEN `14385` with full note text.
- Runtime audit artifacts now preserve evidence-backed review state across rebuilds: `pnpm audit:ui-estate:runtime` regenerated the checklist with `browser-proven: 27`, and `pnpm audit:ui-estate:truth` propagated those statuses into the truth matrix for proven surfaces including chart shell, workspace terminal, note builder, inpatient, handoff, and the audited admin VistA pages.

## Follow-ups
1. Keep the API in a persistent session during future browser audits; the only misleading workspace-terminal failures in this slice came from browser session loss during API restarts, not from the final terminal path itself.

## What changed
1. Fixed the live patient-search contract mismatch that blocked browser-level CPRS auditing:
- `apps/api/src/server/inline-routes.ts`
- `GET /vista/default-patient-list` now returns both `results` and backward-compatible `patients`, plus `rpcUsed` on success and failure paths.

2. Completed a first live browser control pass for unresolved P1 pages and recorded it in:
- `artifacts/phase726-p1-browser-control-audit.md`

3. Closed the handoff acceptance control gap uncovered during the browser pass:
- `apps/api/src/routes/handoff/handoff-store.ts`
- `apps/api/src/routes/handoff/index.ts`
- `apps/api/tests/handoff-store.test.ts`
- Same-user accept is now rejected; distinct-user accept remains live-verified.

4. Closed an eMAR fallback truth defect uncovered during the browser pass:
- `apps/api/src/routes/emar/index.ts`
- `apps/api/tests/emar-route-helpers.test.ts`
- `/emar/administer` now skips the unavailable `ZVENAS MEDLOG` write path when capability discovery marks it missing and only treats TIU fallback creation as success when the returned `noteIen` is numeric.

5. Closed three scheduling truth defects uncovered during the browser pass:
- `apps/api/src/adapters/scheduling/vista-adapter.ts`
- `apps/api/src/routes/scheduling/index.ts`
- `apps/api/tests/scheduling-runtime-helpers.test.ts`
- SD W/L wait-list and reference-data responses now gate runtime-error payloads before parsing, and `/scheduling/recall` now uses `SD RECALL LIST BY PATIENT` with a truthful empty-state sentinel guard instead of surfacing malformed recall rows.

## Manual test steps
1. Start the API in a persistent session and verify health:
	- `pnpm api:restart:safe`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Confirm the patient-search contract fix is live:
	- login first, then call `GET /vista/default-patient-list`
	- verify the payload includes both `results` and `patients`
3. Open the web app and authenticate with `PRO1234 / PRO1234!!`.
4. Review the live UI surfaces:
	- `/cprs/inbox`
	- `/cprs/messages`
	- `/cprs/emar?dfn=46`
	- `/cprs/scheduling`
	- `/cprs/nursing?dfn=46`
	- `/cprs/handoff?ward=12`
	- `/inpatient/census?ward=12`
	- `/inpatient/bedboard?ward=12`
	- `/cprs/admin/vista/dashboard`

## Verifier output
- Browser control audit findings:
	- `/cprs/inbox` rendered `27` live items and the first `Acknowledge` interaction reduced the visible pending count to `26`
	- `/cprs/messages` rendered live VistA MailMan baskets and message subjects with no local fallback banner, opened full message detail for VistA IEN `144718`, truthfully guarded package-sender reply with a manual-recipient warning, and successfully sent a browser-composed MailMan message that returned `Message sent to VistA MailMan (144725)`
	- `/cprs/patient-search` rendered live VEHU-backed search results for `ZZZRETFOURNINETYFOUR`, enabled `Open Chart` only after selecting DFN `46`, and navigated cleanly into `/cprs/chart/46/cover` with the correct patient header context
	- `/cprs/admin/vista/clinics` rendered live clinic rows from `VE CLIN LIST`, switched cleanly into a populated `Appointment Types` table, and surfaced a React tab-style warning that is now fixed in `apps/web/src/app/cprs/admin/vista/clinics/page.tsx`
	- `/cprs/admin/vista/users` rendered live user rows from `VE USER LIST`, switched cleanly into populated `Security Keys` and `Menus` tabs, returned live `OR*` menu rows through the browser search form backed by `VE MENU LIST`, and surfaced the same React tab-style warning that is now fixed in `apps/web/src/app/cprs/admin/vista/users/page.tsx`
	- `/cprs/admin/vista/system` rendered live `VE SYS STATUS` cards, a populated `VE TASKMAN LIST` table, a truthful empty `VE ERROR TRAP` state, and a filterable `VE PARAM LIST` table; the page also used the same tab-style pattern that is now fixed in `apps/web/src/app/cprs/admin/vista/system/page.tsx`
	- `/cprs/admin/vista/wards` rendered live `VE WARD LIST` rows, opened a live `VE WARD DETAIL` inline panel on row click, switched cleanly into a populated `VE CENSUS` table, exposed a real census occupancy `NaN%` defect for non-numeric bed labels, and that defect plus the same tab-style warning pattern are now fixed in `apps/web/src/app/cprs/admin/vista/wards/page.tsx`
	- `/cprs/admin/vista/facilities` rendered live `VE INST LIST`, `VE DIV LIST`, `VE SVC LIST`, `VE STOP LIST`, `VE SPEC LIST`, and `VE SITE PARM` data across all six tabs; institutions and stop-code searches both worked in-browser against live filtered rows, and the same tab-style warning pattern is now fixed in `apps/web/src/app/cprs/admin/vista/facilities/page.tsx`
	- `/cprs/admin/vista/inventory` exposed a real route/UI truth defect on Item Master: the browser mislabeled live `VE INV ITEM LIST` fields as `Category` with a blank `NSN` column; after correcting the item/vender API mappings and the page table, Item Master now renders truthful live `NSN` and `Unit of Issue` values, Vendors shows a truthful empty state with corrected `Phone`/`City` headings, and the same tab-style warning pattern is now fixed in `apps/web/src/app/cprs/admin/vista/inventory/page.tsx`
	- `/cprs/admin/vista/inventory` is now fully browser-proven on the canonical stack: Item Master and Vendors were already corrected earlier, and the last unresolved Purchase Orders tab now labels the `VE INV PO LIST` payload truthfully as raw File `443` `0`-node fields (`0 Node Name`, `0 Node Piece 2`, `0 Node Piece 3`, `0 Node Piece 4`) instead of pretending opaque values are resolved vendor/date/status data
	- `/cprs/admin/vista/clinical-setup` is now browser-proven on the canonical stack: Order Sets, TIU Definitions, and Health Summary render live VistA-backed data as-is, while Consult Services and TIU Templates exposed real truth-label defects where internal pointers/codes were presented as friendly fields; those tabs now label the raw values honestly as `Group IEN`, `Owner IEN`, and `Status Code`, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/clinical-setup/page.tsx`
	- `/cprs/admin/vista/lab` is now browser-proven on the canonical stack: Tests, Collection Samples, and Urgency render live VistA-backed data, the leaked `1^OK` detail sentinel from `VE LAB TEST DETAIL` is now filtered out at the route layer, raw type and tube pointers are now labeled honestly as `Type Code` and `Tube IEN`, the fake urgency `Code` column is removed, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/lab/page.tsx`
	- `/cprs/admin/vista/pharmacy` is now browser-proven on the canonical stack: Drug Formulary, Routes, and Schedules render live VistA-backed data, the leaked `1^OK` detail sentinel from `VE DRUG DETAIL` is now filtered out at the route layer, raw drug-class values are labeled as `VA Class Code`, route rows are labeled as `Code` plus `Description`, schedule timing strings are labeled as `Admin Times`, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/pharmacy/page.tsx`
	- `/cprs/admin/vista/radiology` is now browser-proven on the canonical stack: Procedures, Imaging Locations, and Division Params render live VistA-backed data, the leaked `1^OK` detail sentinel from `VE RAD PROC DETAIL` is now filtered out at the route layer, raw procedure type values are labeled as `Type Code`, mixed File 79.1/File 44 source markers are labeled as `Entry Type`, raw File 79 pieces are labeled as `file0Piece2` and `file0Piece3` instead of implied friendly params, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/radiology/page.tsx`
	- `/cprs/admin/vista/quality` is now browser-proven on the canonical stack: Clinical Reminders and QA Site Parameters render live VistA-backed data, the leaked `1^OK` detail sentinel from `VE REMINDER DETAIL` is now filtered out at the route layer, QA site params are labeled truthfully as `facilityCode`, `file0Piece2`, and `file0Piece3` instead of implied friendly meanings, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/quality/page.tsx`
	- `/cprs/admin/vista/workforce` is now browser-proven on the canonical stack: Providers and Person Classes render live VistA-backed data, the leaked `1^OK` detail sentinel from `VE PROV DETAIL` is now filtered out at the route layer, provider-list person-class pointers are labeled honestly as `Person Class IEN` instead of `Taxonomy`, and the same tab-style warning pattern is fixed in `apps/web/src/app/cprs/admin/vista/workforce/page.tsx`
	- `/cprs/admin/vista/provisioning` is now browser-proven on the canonical stack: the five-step tenant wizard is backed by live `/admin/provisioning/*` catalog routes, the browser country dropdown now reflects the full seven-country backend contract instead of a stale five-country subset, and an end-to-end create flow produced persisted tenant `a5797319-b3be-455f-b4f4-609b4cab7d5d` for `Phase 726 Audit Hospital`
	- `/cprs/admin/vista/billing` is now browser-proven on the canonical stack: IB Site Parameters, Insurance Companies, and Claims Summary render live VistA-backed data, the leaked `1^OK` status sentinel is now filtered out of `VE IB SITE`, `VE INS DETAIL`, and `VE CLAIM COUNT`, insurance-company list headers now match the actual live payload (`Reimburse Flag`, `City`), and raw billing keys are labeled honestly as `siteIen`, `rateTypeCode`, `billingClockDays`, `REIMBURSE_FLAG`, and `totalClaims`
	- `/cprs/emar?dfn=46` rendered a truthful mixed posture: live fallback-derived medication schedule for order `8207`, live allergy warnings grounded in `ORQQAL LIST` plus `PSB ALLERGY`, a working TIU-note fallback administration control, and a live barcode verification flow for barcode `8207`
	- Browser audit exposed a route-level defect in `/emar/administer`: the success payload could carry missing-RPC text as `noteIen`; patched source now gates `ZVENAS MEDLOG` via capability discovery and requires a numeric TIU note IEN before returning success
	- Fresh live verification on a patched API instance at port `3102` confirmed the corrected contract: `/emar/administer` returned `ok:true`, `noteIen:"14385"`, `rpcUsed:["TIU CREATE RECORD","TIU SET DOCUMENT TEXT"]`, and `_note` explaining that the BCMA medication-log RPC is unavailable in the sandbox lane
	- `/cprs/scheduling` originally exposed a real wait-list control defect on the canonical browser/API stack: raw M error text was rendered as clinic data, `/scheduling/reference-data` could surface runtime-error payloads as values, and `/scheduling/recall?dfn=46` still used `SD RECALL LIST`
	- Fresh live verification on a patched API instance at port `3106` confirmed the repaired scheduling contract: `/scheduling/waitlist` now returns only the local request row with `pending:true`, `/scheduling/reference-data` returns empty arrays with truthful runtime-error notes, and `/scheduling/recall?dfn=46` now uses `SD RECALL LIST BY PATIENT` and returns a truthful empty state for File `403.5`
	- After restarting the canonical API on `3001`, the browser and live routes now agree: `/cprs/scheduling` shows a truthful empty clinic schedule, a live local request queue entry, a wait list without raw M error leakage, and a recall tab that truthfully reports sandbox File `403.5` as unpopulated
	- `/cprs/nursing?dfn=46` rendered live TIU-backed notes, live vitals flowsheets via `ORQQVI VITALS`, and live nursing tasks via `ZVENAS LIST`
	- `/cprs/handoff?ward=12` rendered truthful local-store posture with explicit CRHD migration grounding and truthful empty states across active, accept, and archive tabs; direct route checks matched the browser with `0` ward patients from `ORQPT WARD PATIENTS` and `0` local-store reports
	- `/cprs/handoff?ward=6` completed live populated-ward proof in two parts: browser verification loaded `5` VistA-backed patients and created/submitted/archived a real report, then a fresh patched API instance on port `3101` proved the acceptance control fix by returning `409` with `Cannot accept -- incoming staff must differ from report creator` for self-accept and allowing the same submitted report to be accepted by VEHU user `TDNURSE,ONE`
	- `/inpatient/census?ward=12` rendered `29 wards | 182 total patients`
	- `/inpatient/bedboard?ward=12` rendered live ward occupancy buttons matching census-backed counts
	- `/cprs/admin/vista/dashboard` rendered live administrative metrics across all 12 domains
	- Direct authenticated API repro for `/vista/mailman/send` now returns `{"ok":true,"vistaRef":"144724","source":"vista"}` with the same clinician payload shape that had been failing before the fix
	- Targeted regression tests `pnpm --dir apps/api exec vitest run tests/scheduling-runtime-helpers.test.ts tests/scheduling-sd.test.ts` passed with `20/20` tests, covering the new scheduling runtime guards plus the existing scheduling integration surface
	- Targeted regression tests `pnpm vitest run tests/emar-route-helpers.test.ts tests/handoff-store.test.ts` passed with `4/4` tests, covering eMAR note-IEN parsing plus handoff self-accept rejection and distinct-user acceptance

## Follow-ups
1. Keep API startup in a persistent session during browser audits so intermittent `System Unreachable` states do not contaminate control-level evidence.
2. Future handoff work should preserve the new creator/acceptor separation invariant; current live proof now covers both the `409` self-accept rejection and successful second-user acceptance on VEHU.
3. Future eMAR work should preserve the current truthful fallback split: live read surfaces and barcode verification may degrade heuristically, but `/emar/administer` must never report success unless it has a numeric TIU note IEN or a real BCMA log entry.
4. Future scheduling work should preserve the new runtime-error gating: SD W/L responses must never be parsed into visible rows when they carry M/YottaDB error payloads, and recall must stay patient-scoped with a truthful empty sentinel.
5. MailMan routine deployment from Windows should normalize line endings and strip the UTF-8 BOM before or during container copy; VEHU rejected the raw CRLF+BOM file until it was cleaned in-container.

## Phase 726 Update - Full Truth And UX Audit Baseline

## What changed
1. Added the canonical Phase 726 prompt set for the full truth and UX audit:
- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-01-IMPLEMENT.md`
- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-99-VERIFY.md`

2. Added runtime audit infrastructure for the current UI estate:
- `scripts/ui-estate/build-runtime-ui-estate.mjs`
- `scripts/ui-estate/build-runtime-ui-truth-matrix.mjs`
- `scripts/ui-estate/verify-runtime-ui-live-baseline.mjs`

3. Generated the current audit boundary and evidence-seeded posture:
- `data/ui-estate/runtime-ui-estate.json`
- `docs/ui-estate/runtime-ui-estate.md`
- `data/ui-estate/runtime-ui-audit-checklist.json`
- `docs/ui-estate/runtime-ui-audit-checklist.md`
- `data/ui-estate/runtime-ui-truth-matrix.json`
- `docs/ui-estate/runtime-ui-truth-matrix.md`

4. Fixed one live route-contract gap found by the new verifier:
- Updated `apps/api/src/server/inline-routes.ts` so `GET /vista/default-patient-list` now returns `rpcUsed: "ORQPT DEFAULT PATIENT LIST"` on both success and failure paths.

5. Added a repeatable live VEHU evidence run for the core P1 read surfaces:
- artifact outputs:
  - `artifacts/phase726-p1-live-baseline.json`
  - `artifacts/phase726-p1-live-baseline.md`
6. Added a repeatable live VEHU follow-up evidence run for unresolved P1 surfaces:
- `scripts/ui-estate/verify-runtime-ui-live-p1-followup.mjs`
- artifact outputs:
	- `artifacts/phase726-p1-followup-baseline.json`
	- `artifacts/phase726-p1-followup-baseline.md`

## Manual test steps
1. Verify Docker baseline:
	- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Start or restart the API safely:
	- `pnpm api:restart:safe`
3. Regenerate the audit boundary:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`
4. Generate live P1 evidence:
	- `pnpm audit:ui-estate:live-p1`
5. Generate unresolved-P1 follow-up evidence:
	- `pnpm audit:ui-estate:live-p1-followup`

## Verifier output
- Runtime truth matrix summary:
	- total surfaces: `131`
	- P1: `29`
	- P2: `33`
	- P3: `69`
	- required-with-strong-signals: `13`
	- required-needs-live-verification: `13`
	- required-unmapped: `3`
- Live P1 baseline summary:
	- total checks: `11`
	- passing checks: `11`
	- failing checks: `0`
	- login user: `PROGRAMMER,ONE`
- Live unresolved-P1 follow-up summary:
	- total checks: `16`
	- passing checks: `16`
	- failing checks: `0`
	- skipped checks: `0`
	- ward candidate: `12`
- Live VEHU-backed proof captured in the artifact bundle:
	- `/health` returned `ok: true`
	- `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`
	- `/vista/default-patient-list` returned `38` patients with `rpcUsed: ORQPT DEFAULT PATIENT LIST`
	- `/vista/allergies?dfn=46` returned `4` results via `ORQQAL LIST`
	- `/vista/problems?dfn=46` returned `6` results via `ORQQPL PROBLEM LIST`
	- `/vista/vitals?dfn=46` returned `5` results via `ORQQVI VITALS`
	- `/vista/medications?dfn=46` returned `1` synthesized active medication with fallback grounded in live CPRS order reads
	- `/vista/notes?dfn=46` returned `39` notes via `TIU DOCUMENTS BY CONTEXT`
	- `/vista/labs?dfn=46` returned `0` structured rows but a truthful `ORWLRR INTERIM` note explaining free-text lab output
	- `/vista/cprs/appointments?dfn=46` returned `0` appointments via `ORWPT APPTLST`
	- `/vista/cprs/reminders?dfn=46` returned `15` reminders via `ORQQPX REMINDERS LIST`
	- `/vista/inbox` returned `27` items with truthful integration-pending feature status metadata
	- `/vista/mailman/folders` returned `12` folders from live VistA
	- `/vista/mailman/inbox?limit=5` returned `5` live VistA messages
	- `/vista/nursing/notes?dfn=46` returned `39` live TIU-backed items via `TIU DOCUMENTS BY CONTEXT`
	- `/vista/nursing/tasks?dfn=46` returned `1` live task via `ZVENAS LIST`
	- `/vista/nursing/io?dfn=46` returned live VistA-backed I&O via `ZVENAS IOLIST`
	- `/admin/vista/dashboard/operational`, `/admin/vista/users?count=5`, `/admin/vista/clinics?count=5`, and `/admin/vista/system/status` all returned live VistA-backed data
	- `/vista/inpatient/ward-census?ward=12` and `/vista/inpatient/bedboard?ward=12` returned truthful empty states with live VistA ward RPC evidence
	- `/handoff/ward-patients?ward=12` returned truthful integration-pending state with declared pending targets
	- `/handoff/reports?ward=12` returned truthful local-store state with storage note and migration path

## Follow-ups
1. Use the Phase 726 checklist and truth matrix to start page-by-page/manual review of the `29` P1 surfaces.
2. Prioritize the `13` required-needs-live-verification surfaces and the `3` required-unmapped surfaces for the next slice.
3. Extend live evidence from route-level proof into control-level proof for inbox, messaging, nursing, handoff, and inpatient flows.
4. Use the new follow-up verifier as the route-level baseline for those unresolved P1 surfaces before doing browser-level/manual control audits.

## Phase 725 Update - Dead Click Tripwire Hardening

- Fixed the root source-scan entrypoint by adding `pnpm qa:tripwire:source`, which uses the app-local `tsx` binary without changing the working directory. The previous delegated form executed from `apps/api` and produced a false green by scanning `0` files.
- Added explanatory `title` tooltips to disabled clinician-facing buttons in Immunizations, Intake, Labs, Messaging Tasks, Inbox, and patient search so disabled actions communicate why they are unavailable.
- Verification:
	- `pnpm qa:tripwire:source` -> `Scanned: 110 files`, `Errors: 0`, `Warnings: 0`
	- VS Code Problems check on all touched files -> no errors
- Follow-up:
	- Fold `pnpm qa:tripwire:source` into a broader QA runner or verifier gate when we want this source-level scan enforced automatically.

# Phase 725 Update - Enterprise Readiness Program Stabilization Slice

## What changed
1. Added the canonical Phase 725 prompt set for the enterprise-readiness execution program:
- `prompts/725-PHASE-725-ENTERPRISE-READINESS-PROGRAM/725-01-IMPLEMENT.md`
- `prompts/725-PHASE-725-ENTERPRISE-READINESS-PROGRAM/725-99-VERIFY.md`

2. Regenerated the canonical prompt index after adding the new prompt pack:
- `docs/qa/phase-index.json`
- command used: `pnpm qa:phase-index`

3. Fixed the first substantive verifier blocker in the clinician web app.
- Repaired broken TSX operator text handling in these files:
	- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx`
	- `apps/web/src/app/cprs/admin/philhealth-eclaims3/page.tsx`
	- `apps/web/src/app/cprs/admin/queue/page.tsx`
	- `apps/web/src/app/cprs/emar/page.tsx`
	- `apps/web/src/app/cprs/handoff/page.tsx`
	- `apps/web/src/app/cprs/nursing/page.tsx`
	- `apps/web/src/app/cprs/order-sets/page.tsx`
	- `apps/web/src/app/patient-search/page.tsx`
	- `apps/web/src/components/cprs/PatientBanner.tsx`
- Restored the `queue` page header after a malformed patch artifact removed the React hook import and displaced the ticket row interface.

4. Updated operator troubleshooting guidance:
- `docs/runbooks/run-from-zero.md`
- Added explicit recovery steps for prompt-index freshness failures and `G09` web compile failures.

## Manual test steps
1. Verify Docker baseline:
	- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Verify API and VistA reachability:
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
3. Validate the isolated frontend compiler gate:
	- `pnpm -C apps/web exec tsc --noEmit`
4. Rebuild the prompt index if prompt folders changed:
	- `pnpm qa:phase-index`
5. Run the canonical repository verifier:
	- `powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`

## Verifier output
- Live runtime proof remained healthy:
	- `/health` returned `ok: true`
	- `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}`
- The first failing gate in this slice was `G09` (`TypeScript Web compile`).
- After the frontend fixes, the isolated compiler passed:
	- `pnpm -C apps/web exec tsc --noEmit`
- Final canonical verifier result:
	- `PASS: 16`
	- `FAIL: 0`
	- `SKIP: 0`
	- `Overall: RC_READY`
	- report path: `evidence/wave-35/501-W35-P2-RC-VERIFY-ORCHESTRATOR/verify-rc/report.json`

## Follow-ups
1. Continue the enterprise-readiness execution program from the next real blocker surfaced by live proof or the canonical verifier, not from static warning volume alone.
2. Use the isolated web compile command first whenever `G09` regresses so verifier triage stays fast and deterministic.

# Phase 724 Update - System Stabilization Continuation

## What changed
1. Added the Phase 724 prompt set for system stabilization continuation:
- `prompts/724-PHASE-724-SYSTEM-STABILIZATION-CONTINUATION/724-01-IMPLEMENT.md`
- `prompts/724-PHASE-724-SYSTEM-STABILIZATION-CONTINUATION/724-99-VERIFY.md`

2. Added safe API startup guard for Windows:
- Added `scripts/start-api-safe.ps1`.
- Behavior:
  - Reuses an already healthy API process on port `3001`.
  - Restarts stale/unhealthy Node listener on `3001`.
  - Refuses to kill non-Node listeners and returns explicit guidance.

3. Wired the safe starter into root scripts:
- `package.json`:
  - `api:start:safe`
  - `api:restart:safe`

4. Updated operational guidance:
- `docs/runbooks/windows-port-3001-fix.md` now recommends `pnpm api:start:safe` first.
- `scripts/dev-up.ps1` summary now points API startup guidance to `pnpm api:start:safe`.

5. Resolved required verifier regression during this run:
- `G02 Phase Index Freshness` failed once after elapsed time.
- Rebuilt phase index with `pnpm qa:phase-index`.
- Re-ran verifier to recover `RC_READY`.

## Manual test steps
1. Verify Docker baseline:
	- `docker ps --format "table {{.Names}}\t{{.Status}}"`
2. Validate safe startup behavior:
	- `pnpm run api:start:safe`
3. Verify API and VistA connectivity:
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
4. Login and validate representative module routes:
	- `POST /auth/login` with `PRO1234 / PRO1234!!`
	- `GET /vista/allergies?dfn=46`
	- `GET /vista/vitals?dfn=46`
	- `GET /vista/medications?dfn=46`
	- `GET /vista/notes?dfn=46`
	- `GET /imaging/health`
	- `GET /telehealth/health`
	- `GET /scheduling/mode`
	- `GET /rcm/payers`
	- `GET /api/modules/status`
5. Re-run verifier:
	- `powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`

## Verifier output
- Verified startup root cause from live logs: `listen EADDRINUSE: address already in use 127.0.0.1:3001`.
- Safe startup command now exits successfully when API is already healthy:
  - `[OK] API already running and healthy ... Reusing existing process`.
- Cross-module runtime checks after auth returned `200` for all tested routes listed above.
- Final verifier report:
  - `overallStatus: RC_READY`
  - `summary: pass=16, fail=0, total=16`
  - report path: `evidence/wave-35/501-W35-P2-RC-VERIFY-ORCHESTRATOR/verify-rc/report.json`

## Follow-ups
1. Continue deeper UI click-through coverage for CPRS and portal feature paths using browser automation evidence.
2. Keep using `pnpm run api:start:safe` as the default local API startup command to avoid false crash loops.

# Phase 720 Update - CPRS Inbox Acknowledge Contract Recovery

## What changed
1. Added the Phase 720 prompt set for CPRS inbox acknowledge contract recovery:
- `prompts/720-PHASE-720-CPRS-INBOX-ACKNOWLEDGE-CONTRACT-RECOVERY/720-01-IMPLEMENT.md`
- `prompts/720-PHASE-720-CPRS-INBOX-ACKNOWLEDGE-CONTRACT-RECOVERY/720-99-VERIFY.md`

2. Updated `apps/api/src/routes/inbox.ts`.
- Added the missing `POST /vista/inbox/acknowledge` route instead of leaving the clinician UI to hit a raw `404 Not Found`.
- Returned a truthful `integration-pending` response explaining that real VistA acknowledgement persistence depends on `ORWORB KILL EXPIR MSG`, which is not available in the current VEHU sandbox.
- Preserved the intended CPRS behavior where the inbox item remains visible and the yellow pending banner can surface without breaking the page.

3. Updated `docs/runbooks/vista-rpc-phase13-operationalization.md`.
- Documented the inbox acknowledge contract so the action is explicitly server-backed integration-pending rather than an absent route.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/inbox` and confirm live inbox items still load.
3. Call `POST /vista/inbox/acknowledge` with a real inbox `itemId` and confirm it returns `integrationPending: true` instead of `404 Not Found`.
4. Open `/cprs/inbox` and click `Acknowledge` on a visible row.
5. Confirm the page stays on the inbox view and shows the yellow `Integration Pending` banner instead of the red `Not Found` error.

## Verifier output
- Live browser proof before the patch: clicking `Acknowledge` on `/cprs/inbox` triggered a console `404 (Not Found)` and replaced the inbox surface with a visible `Not Found` error.
- Route inventory proof before the patch: `/vista/inbox/acknowledge` was not implemented even though the page already expected `integrationPending` responses and displayed a yellow pending banner.
- Live API proof after the patch and API restart: `POST /vista/inbox/acknowledge` returns a structured `integration-pending` payload naming `ORWORB KILL EXPIR MSG` as the missing VistA persistence RPC.
- Live browser proof after the patch and API restart: clicking `Acknowledge` no longer leaves `/cprs/inbox`; the page remains stable and surfaces the expected yellow pending banner while keeping the item visible.

## Current blocker
- Real VistA inbox acknowledgement persistence remains blocked on `ORWORB KILL EXPIR MSG` availability in the active VEHU lane.

## Follow-ups
1. Continue the live clinician-facing CPRS audit from the next inbox or file-menu action after acknowledge no longer fails with a route-level error.

# Phase 719 Update - CPRS Inbox Notification Parse Recovery

## What changed
1. Added the Phase 719 prompt set for CPRS inbox notification parse recovery:
- `prompts/719-PHASE-719-CPRS-INBOX-NOTIFICATION-PARSE-RECOVERY/719-01-IMPLEMENT.md`
- `prompts/719-PHASE-719-CPRS-INBOX-NOTIFICATION-PARSE-RECOVERY/719-99-VERIFY.md`

2. Updated `apps/api/src/routes/inbox.ts`.
- Added a dedicated `ORWORB FASTUSER` notification parser instead of assuming a single caret-field layout.
- Converted raw caret-delimited notification payloads into readable clinician-facing summary text.
- Restricted `patientDfn` to real numeric values so the inbox UI no longer renders a fake `Open Chart` action from misparsed timestamps.

3. Updated `docs/runbooks/vista-rpc-phase13-operationalization.md`.
- Documented the Phase 13 inbox notification parsing contract for `ORWORB FASTUSER` rows that omit the numeric leading fields.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/inbox` and inspect the first notification items.
3. Confirm `summary` contains readable message text like `UNSIGNED General Note available for SIGNATURE`.
4. Confirm `patientDfn` is absent when the source row has no real numeric DFN.
5. Open `/cprs/inbox` and confirm the Summary column is readable and the fake `Open Chart` action is gone for those notification rows.

## Verifier output
- Live API proof before the patch: `/vista/inbox` returned notification items with `summary` equal to the full raw caret-delimited `ORWORB FASTUSER` payload and `patientDfn` incorrectly populated with date/time strings like `03/09/2026@08:16`.
- Live browser proof before the patch: `/cprs/inbox` rendered the raw caret blob in the Summary column and showed `Open Chart` for misparsed notification rows.
- Live API proof after the patch and API restart: `/vista/inbox` returned readable summaries such as `UNSIGNED General Note available for SIGNATURE` and no bogus `patientDfn` for those notifications.
- Live browser proof after the patch and API restart: `/cprs/inbox` rendered readable summary text and removed the fake `Open Chart` action from the affected notification rows.

## Current blocker
- None for the inbox notification parse recovery itself.

## Follow-ups
1. Continue the live CPRS audit from the next clinician-facing workflow after inbox notification truth is restored.

# Phase 718 Update - CPRS MailMan Session Redirect Recovery

## What changed
1. Added the Phase 718 prompt set for CPRS MailMan session redirect recovery:
- `prompts/718-PHASE-718-CPRS-MAILMAN-SESSION-REDIRECT-RECOVERY/718-01-IMPLEMENT.md`
- `prompts/718-PHASE-718-CPRS-MAILMAN-SESSION-REDIRECT-RECOVERY/718-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/messages/page.tsx`.
- Added the shared CPRS session gate using `useSession()` and router redirect behavior.
- Redirected unauthenticated access to `/cprs/login?redirect=%2Fcprs%2Fmessages` instead of rendering an inline auth failure.
- Delayed protected MailMan fetches until the session is ready and authenticated.
- Treated MailMan `401` responses as session-expired state so stale auth no longer settles into a fake empty-inbox posture.

3. Updated `docs/runbooks/phase70-mailman-bridge.md`.
- Documented that `/cprs/messages` must follow the normal CPRS login redirect contract and must not behave like a raw unauthenticated API client.

## Manual test steps
1. Open `/cprs/messages` in a fresh unauthenticated browser page.
2. Confirm the browser redirects to `/cprs/login?redirect=%2Fcprs%2Fmessages` before protected MailMan data loads.
3. Sign in with `PRO1234 / PRO1234!!`.
4. Confirm the browser lands back on `/cprs/messages` with live VistA MailMan baskets and inbox rows.

## Verifier output
- Live browser proof before the patch: a fresh unauthenticated `/cprs/messages` page spammed protected MailMan API requests with `401` responses and rendered an inline `Authentication required` error above a misleading empty inbox.
- Live browser proof after the patch: opening `/cprs/messages` unauthenticated redirects to `/cprs/login?redirect=%2Fcprs%2Fmessages`.
- Live browser proof after sign-in: the redirect lands back on `/cprs/messages`, which renders live MailMan baskets and an `inbox (45)` view backed by VistA MailMan rows.

## Current blocker
- None for the MailMan session-redirect recovery itself.

## Follow-ups
1. Continue the live clinician-facing CPRS audit from the next user-visible workflow after MailMan auth posture is restored.

# Phase 717 Update - CPRS MailMan Mount Race Recovery

## What changed
1. Added the Phase 717 prompt set for CPRS MailMan mount-race recovery:
- `prompts/717-PHASE-717-CPRS-MAILMAN-MOUNT-RACE-RECOVERY/717-01-IMPLEMENT.md`
- `prompts/717-PHASE-717-CPRS-MAILMAN-MOUNT-RACE-RECOVERY/717-99-VERIFY.md`

2. Updated `apps/api/src/routes/vista-mailman.ts` and `apps/api/src/routes/messaging/index.ts`.
- Removed duplicate `connect()` / `disconnect()` handling from the MailMan route layer.
- Kept the service-layer `safeCallRpc` / `safeCallRpcWithList` path as the single broker lifecycle owner so parallel MailMan page requests no longer fight over the shared RPC socket.
- Preserved the existing clinician MailMan response contracts and audit behavior.

3. Updated `docs/runbooks/phase70-mailman-bridge.md`.
- Documented the broker-lifecycle rule so MailMan route handlers do not reintroduce browser mount races around the locked RPC path.

## Manual test steps
1. Open an authenticated CPRS chart session and use File > Messages / MailMan.
2. Confirm the page no longer settles into `VistA MailMan unavailable` during initial load.
3. Confirm MailMan baskets render live counts and the inbox shows live VistA MailMan rows.
4. Open a real message and confirm the detail panel shows VistA-backed content.
5. Authenticate via API and confirm `GET /vista/mailman/folders` and `GET /vista/mailman/inbox?limit=3` return `ok: true` with `source: "vista"`.

## Verifier output
- Live browser proof before the patch: File > Messages / MailMan opened `/cprs/messages` but showed `Error: Connection closed before response` / `VistA MailMan unavailable` while also falling through to the empty-basket posture.
- Root-cause proof: the secure-messaging service already used `safeCallRpc*` with broker locking, but the MailMan routes also wrapped those calls in manual `connect()` / `disconnect()` handling, creating a shared-socket race under the page's parallel mount traffic.
- Live browser proof after the patch and API restart: `/cprs/messages` renders live MailMan baskets, shows `inbox (45)`, lists live VistA messages, and opens message IEN `144715` with full detail instead of the unavailable posture.
- Live API proof after the patch and API restart: `GET /vista/mailman/folders` and `GET /vista/mailman/inbox?limit=3` both returned `ok: true` with `source: "vista"`.

## Current blocker
- None for the MailMan mount-race recovery itself.

## Follow-ups
1. Continue the live clinician-facing CPRS audit from the next user-visible workflow after MailMan routing truth is restored.

# Phase 716 Update - CPRS Verify Dashboard Truth Recovery

## What changed
1. Added the Phase 716 prompt set for CPRS verify dashboard truth recovery:
- `prompts/716-PHASE-716-CPRS-VERIFY-DASHBOARD-TRUTH-RECOVERY/716-01-IMPLEMENT.md`
- `prompts/716-PHASE-716-CPRS-VERIFY-DASHBOARD-TRUTH-RECOVERY/716-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/verify/page.tsx`.
- Routed protected verification checks through `API_BASE` instead of the web origin so the dashboard no longer parses HTML error pages as JSON.
- Replaced stale VEHU-invalid DFN `1` assumptions with DFN `46` and search term `ZZZRETFOURNINETYFOUR`.
- Added session gating so `/cprs/verify` redirects unauthenticated users to `/cprs/login?redirect=%2Fcprs%2Fverify` before protected checks run.

3. Updated `docs/runbooks/cprs-web-replica-v1.md`.
- Documented that the verification dashboard now requires a real CPRS session and uses VEHU-valid grounding.

## Manual test steps
1. Open `/cprs/verify` in a fresh browser session and confirm it redirects to `/cprs/login?redirect=%2Fcprs%2Fverify`.
2. Sign in with `PRO1234 / PRO1234!!`.
3. Confirm the dashboard no longer reports `Unexpected token '<'` HTML parse failures for API checks.
4. Confirm patient-bound checks use DFN 46 / `ZZZRETFOURNINETYFOUR` and return meaningful live results.

## Verifier output
- Live browser proof before the patch: `/cprs/verify` showed `6/21 passed, 15 failed` with repeated `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` failures because it was calling the web origin instead of the API origin.
- Live API proof before the patch: `GET /vista/patient-search?q=ZZZRETFOURNINETYFOUR` returned DFN 46 on the VEHU lane, proving the dashboard's `dfn=1` assumption was stale.
- Live browser proof after the patch: opening `/cprs/verify` in a fresh unauthenticated session redirects to `/cprs/login?redirect=%2Fcprs%2Fverify` before any protected checks run.
- Final authenticated browser proof after the patch: `/cprs/verify` settles at `21/21 passed, 0 failed`, including a passing `/health` check against the real `{ ok: true, ... }` contract and meaningful VEHU-grounded results for the protected patient checks.

## Current blocker
- None for the dashboard recovery itself.

## Follow-ups
1. Continue the live CPRS audit after the verification dashboard is revalidated against the VEHU lane.

# Phase 715 Update - CPRS Legacy Tab Alias Recovery

## What changed
1. Added the Phase 715 prompt set for CPRS legacy tab alias recovery:
- `prompts/715-PHASE-715-CPRS-LEGACY-TAB-ALIAS-RECOVERY/715-01-IMPLEMENT.md`
- `prompts/715-PHASE-715-CPRS-LEGACY-TAB-ALIAS-RECOVERY/715-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`.
- Extended chart alias normalization so legacy slugs `dc-summaries`, `dc-summ`, `ai-assist`, and `tele-health` resolve to canonical `dcsumm`, `aiassist`, and `telehealth` before validation.
- Preserved canonical module gating, tab highlighting, panel rendering, and ActionInspector wiring.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Expanded the chart-route alias truth contract to cover the proven D/C Summary, AI Assist, and Telehealth redirect aliases.

## Manual test steps
1. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fdc-summaries` and sign in.
2. Confirm the app lands on `/cprs/chart/46/dcsumm` instead of the chart error screen.
3. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fai-assist` and sign in.
4. Confirm the app lands on `/cprs/chart/46/aiassist` instead of the chart error screen.
5. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Ftele-health` and sign in.
6. Confirm the app lands on `/cprs/chart/46/telehealth` instead of the chart error screen.

## Verifier output
- Live browser proof before the patch: redirecting to `/cprs/chart/46/dc-summaries`, `/cprs/chart/46/ai-assist`, and `/cprs/chart/46/tele-health` all authenticated successfully and then fell into `NEXT_HTTP_ERROR_FALLBACK;404`.
- Live browser proof after the patch: signing in through the three legacy redirect URLs now lands on `/cprs/chart/46/dcsumm`, `/cprs/chart/46/aiassist`, and `/cprs/chart/46/telehealth` with the D/C Summary, AI Assist, and Telehealth tabs rendered normally.
- Regression proof after the patch: the recovered tabs still show truthful content, including the D/C Summary empty state, the AI Assist disabled intake-summary action for no sessions, and the Telehealth disabled room-creation action for no telehealth appointments.
- Contract proof after the patch: those legacy slugs normalize to canonical chart tabs before validation while unrelated invalid slugs still 404.

## Current blocker
- None for the alias recovery itself.

## Follow-ups
1. Continue the clinician-facing chart audit once the recovered D/C Summary, AI Assist, and Telehealth redirects are revalidated in-browser.

# Phase 714 Update - CPRS Cover Slug Alias Recovery

## What changed
1. Added the Phase 714 prompt set for CPRS cover slug alias recovery:
- `prompts/714-PHASE-714-CPRS-COVER-SLUG-ALIAS-RECOVERY/714-01-IMPLEMENT.md`
- `prompts/714-PHASE-714-CPRS-COVER-SLUG-ALIAS-RECOVERY/714-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`.
- Added legacy tab alias normalization so `cover-sheet` resolves to canonical `cover` before chart route validation.
- Redirect recovery now rewrites authenticated and unauthenticated chart flows onto `/cprs/chart/:dfn/cover` instead of leaving legacy `cover-sheet` URLs to fail with `NEXT_HTTP_ERROR_FALLBACK;404`.
- Kept module gating, tab highlighting, panel rendering, and ActionInspector keyed to the canonical tab slug.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Documented the chart-route alias truth contract so legacy Cover Sheet redirect slugs must recover to the canonical route instead of dropping clinicians into a chart error page.

## Manual test steps
1. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet` in a fresh browser session.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Confirm the browser lands on `/cprs/chart/46/cover` instead of the chart error screen.
4. Confirm the live Cover Sheet renders normal patient data and the Appointments card still truthfully shows `No upcoming appointments` for DFN 46.

## Verifier output
- Live browser proof before the patch: the `cover-sheet` redirect authenticated successfully and then landed on `NEXT_HTTP_ERROR_FALLBACK;404` instead of the Cover Sheet.
- Live browser proof after the patch: opening `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet`, signing in with `PRO1234 / PRO1234!!`, and completing the redirect now lands on `/cprs/chart/46/cover` with the live Cover Sheet rendered.
- Regression proof after the patch: the Cover Sheet Appointments card still shows the truthful `No upcoming appointments` empty state with `ORWPT APPTLST` grounding for DFN 46.
- Contract proof after the patch: `cover-sheet` normalizes to `cover` before validation while invalid unrelated slugs still fall through to the existing 404 behavior.

## Current blocker
- None for the alias recovery itself.

## Follow-ups
1. Continue the clinician-facing chart audit once the legacy Cover Sheet redirect alias is revalidated in-browser.

# Phase 713 Update - CPRS ADT Census Truth Recovery

## What changed
1. Added the Phase 713 prompt set for CPRS ADT census truth recovery:
- `prompts/713-PHASE-713-CPRS-ADT-CENSUS-TRUTH-RECOVERY/713-01-IMPLEMENT.md`
- `prompts/713-PHASE-713-CPRS-ADT-CENSUS-TRUTH-RECOVERY/713-99-VERIFY.md`

2. Updated `apps/api/src/routes/adt/index.ts`.
- Removed the misleading `pendingTargets: ['ZVEADT WARDS']` marker from the no-ward `/vista/adt/census` summary response when live ward counts are already being returned from `ORQPT WARDS` and `ORQPT WARD PATIENTS`.

3. Updated `docs/runbooks/inpatient-adt.md`.
- Documented that the ward census summary is a live ADT read feature and should not be surfaced as integration-pending when the native OR RPCs succeed.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/adt/census` and confirm it returns live ward counts with `pendingTargets: []`.
3. Open `/cprs/chart/46/adt` and confirm the Ward Census Summary no longer shows an integration-pending banner while live counts are displayed.
4. Click a real ward such as `7A GEN MED` and confirm the detail table still loads live ward census patients.

## Verifier output
- Live API proof before the patch: `/vista/adt/census` returned 29 real ward summaries from `ORQPT WARDS` and `ORQPT WARD PATIENTS` while still exposing `pendingTargets: ['ZVEADT WARDS']`.
- Live browser proof before the patch: the CPRS ADT panel showed a misleading `Integration Pending: Census summary | Target RPC: ZVEADT WARDS` banner above live ward counts.
- Live browser proof after the patch: `/cprs/chart/46/adt` shows the live Ward Census Summary table with `RPC Used: ORQPT WARDS, ORQPT WARD PATIENTS` and no misleading integration-pending banner above the live counts.
- Live browser proof after the patch: selecting `7A GEN MED` loads the real ward census detail table with live patient rows instead of leaving the panel in an unverified placeholder state.

## Current blocker
- None for the contract correction itself.

## Follow-ups
1. Continue the clinician-facing chart audit once the ADT census summary banner is revalidated in-browser.

# Phase 712 Update - CPRS Session Expiry Truth Recovery

## What changed
1. Added the Phase 712 prompt set for CPRS session expiry truth recovery:
- `prompts/712-PHASE-712-CPRS-SESSION-EXPIRY-TRUTH-RECOVERY/712-01-IMPLEMENT.md`
- `prompts/712-PHASE-712-CPRS-SESSION-EXPIRY-TRUTH-RECOVERY/712-99-VERIFY.md`

2. Updated `apps/web/src/stores/session-context.tsx`.
- Added periodic and focus/visibility-driven API session revalidation so the chart shell does not keep claiming the clinician is authenticated after the API session has expired.
- Added a shared frontend session-expired event so panels can immediately invalidate stale client auth state when a live API call returns 401.

3. Updated `apps/web/src/components/cprs/panels/OrdersPanel.tsx`.
- Replaced the raw `http-401` source posture with an explicit `session-expired` state.
- Added truthful session-expired messaging so the Orders tab no longer falls through to a fake empty local-cache explanation when live VistA loading failed due to auth expiry.

4. Updated `docs/runbooks/auth-troubleshooting.md`.
- Documented that CPRS should now revalidate and redirect on stale session state instead of leaving chart panels in misleading post-auth-expiry states.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!` and open `/cprs/chart/46/orders`.
2. Confirm the Orders panel shows live VistA rows with `Source: vista` in a fresh session.
3. Simulate a stale browser session by invalidating the API session or waiting for expiry, then trigger an Orders refresh.
4. Confirm the panel does not settle into a fake `http-401` empty-order posture and the chart redirects back toward `/cprs/login` once the stale session is detected.

## Verifier output
- Live browser proof: a fresh clinician login now returns `200` for both `/auth/session` and `/vista/cprs/orders?dfn=46`, and the Orders tab renders the live VistA order row for DFN 46.
- Static code proof: the session provider now revalidates on focus/visibility and responds to explicit frontend session-expired events.
- Static code proof: Orders now treats API `401` as `session-expired` instead of presenting misleading empty-cache messaging.

## Current blocker
- A deterministic in-browser forced-expiry capture was not produced in this slice; the stale-session behavior was recovered from live evidence plus clean-session verification.

## Follow-ups
1. Continue the clinician-facing chart audit from the next live defect once session-expiry truth no longer distorts Orders panel posture.

# Phase 711 Update - CPRS Meds Dialog Truth Recovery

## What changed
1. Added the Phase 711 prompt set for CPRS Meds dialog truth recovery:
- `prompts/711-PHASE-711-CPRS-MEDS-DIALOG-TRUTH-RECOVERY/711-01-IMPLEMENT.md`
- `prompts/711-PHASE-711-CPRS-MEDS-DIALOG-TRUTH-RECOVERY/711-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx`.
- Corrected the quick-order workflow text to reference `ORWDXM AUTOACK` instead of `ORWDX SEND`.
- Updated the quick-order draft message to describe server-side draft storage.
- Updated the manual-entry draft wording to explicitly remain a local-only draft list.

3. Updated `docs/runbooks/vista-rpc-add-medication.md`.
- Added a UI truth contract section distinguishing quick-order server-side draft blockers from manual local-only drafts.

## Manual test steps
1. Open the CPRS Meds panel and launch `+ New Medication Order`.
2. Confirm the quick-order helper text references `ORWDXM AUTOACK`.
3. Confirm the manual-entry helper text explicitly says the draft is local-only.
4. Reuse the live quick-order route proof for `POST /vista/cprs/meds/quick-order` to confirm the backend blocker remains a server-side draft follow-up path when live placement fails.

## Verifier output
- Contract proof: `POST /vista/cprs/meds/quick-order` still uses `ORWDXM AUTOACK` and returns a server-side draft blocker when a live order cannot be placed.
- UI proof: the Meds dialog now distinguishes quick-order server-side drafts from manual local-only drafts.
- Diagnostics proof: touched UI, prompt, runbook, and ops files reported no editor errors after the patch.

## Current blocker
- A live browser capture of the quick-order blocker banner still depends on reproducing the non-live path from the modal during this slice.

## Follow-ups
1. Continue the live chart audit on the next remaining clinician-facing Meds, Orders, or Reports defect.

# Phase 710 Update - CPRS Login Autofill Truth Recovery

## What changed
1. Added the Phase 710 prompt set for CPRS login autofill truth recovery:
- `prompts/710-PHASE-710-CPRS-LOGIN-AUTOFILL-TRUTH-RECOVERY/710-01-IMPLEMENT.md`
- `prompts/710-PHASE-710-CPRS-LOGIN-AUTOFILL-TRUTH-RECOVERY/710-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/login/page.tsx`.
- Replaced the fake prefilled dev-lane appearance caused by placeholders with actual controlled-input prefills in development mode.
- Kept production behavior unchanged by preserving the existing `NODE_ENV !== 'production'` guard.

3. Updated `docs/runbooks/runtime-lanes.md`.
- Documented that the development CPRS login now prefills the verified VEHU credentials into the actual form values.

## Manual test steps
1. Open `/cprs/login` or a redirected CPRS chart login page in a clean browser session.
2. Confirm the VEHU credentials are already present in the input values in development mode.
3. Click `Sign On` without manually retyping the credentials.
4. Confirm navigation succeeds to the requested CPRS chart route.

## Verifier output
- Live browser proof before the patch: the login form visually showed `PRO1234 / PRO1234!!`, but clicking `Sign On` immediately returned `Both access code and verify code are required.` because the controlled inputs were actually empty.
- Static code proof after the patch: the dev-only VEHU credentials now initialize the real form state instead of only populating placeholders.
- Diagnostics proof: touched login, prompt, runbook, and ops files reported no editor errors after the patch.

## Current blocker
- None for the fix itself; post-login chart auditing continues as a separate workflow.

## Follow-ups
1. Continue the clinician-facing chart audit from the authenticated Notes, Labs, and Meds flows now that the login path is truthful.

# Phase 709 Update - CPRS Dialog Draft Truth Recovery

## What changed
1. Added the Phase 709 prompt set for grouped CPRS dialog draft truth recovery:
- `prompts/709-PHASE-709-CPRS-DIALOG-DRAFT-TRUTH-RECOVERY/709-01-IMPLEMENT.md`
- `prompts/709-PHASE-709-CPRS-DIALOG-DRAFT-TRUTH-RECOVERY/709-99-VERIFY.md`

2. Updated standalone CPRS write dialogs:
- `apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx`
- `apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx`
- Replaced stale local-only draft wording with server-side draft wording that matches the current route contracts.
- Renamed local draft status flags in the dialogs so the client state no longer encodes the wrong storage model.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added a cross-dialog truth contract for standalone CPRS write modal draft behavior.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Reconfirm the current route contracts in `apps/api/src/routes/cprs/wave2-routes.ts` for:
	- `POST /vista/cprs/allergies/add`
	- `POST /vista/cprs/problems/add`
	- `POST /vista/cprs/problems/edit`
	- `POST /vista/cprs/vitals/add`
	- `POST /vista/cprs/notes/create`
3. Open each standalone dialog and confirm the live-success branch still reports direct VistA success when `mode: "real"` is returned.
4. Inspect each draft-success branch and confirm it now reports server-side draft storage with sync pending instead of local-only save wording.

## Verifier output
- Contract proof: the affected write routes already return explicit server-side draft messages for allergy, problem add/edit, vital, and note-create fallback flows.
- UI proof: the affected standalone dialogs now use server-side draft wording instead of local draft wording.
- Diagnostics proof: touched dialog, prompt, runbook, and ops files reported no editor errors after the patch.

## Current blocker
- A live browser capture of each dialog's draft-success banner still depends on forcing the non-real fallback path for each route, which was not reproduced during this audit slice.

## Follow-ups
1. Continue the clinician-facing CPRS audit and clear the next user-visible truth defect once this grouped dialog drift is closed.

# Phase 708 Update - CPRS Lab Acknowledge Dialog Truth Recovery

## What changed
1. Added the Phase 708 prompt set for CPRS lab acknowledge dialog truth recovery:
- `prompts/708-PHASE-708-CPRS-LAB-ACK-DIALOG-TRUTH-RECOVERY/708-01-IMPLEMENT.md`
- `prompts/708-PHASE-708-CPRS-LAB-ACK-DIALOG-TRUTH-RECOVERY/708-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx`.
- Replaced the stale draft-success wording that claimed acknowledgements were stored locally.
- Aligned the dialog success state with the actual backend contract: real `ORWLRR ACK` success or server-side draft fallback.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added an explicit Labs truth-contract bullet for the standalone acknowledge dialog copy.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Reuse the existing live proof that `POST /vista/cprs/labs/ack` returns `ok: true`, `mode: "real"`, and `status: "acknowledged"` for DFN 46 in the VEHU lane.
3. Open the standalone CPRS lab acknowledge dialog and confirm the success text still reports direct VistA acknowledgement when the route returns `mode: "real"`.
4. Inspect the dialog draft-success branch and confirm it now says the acknowledgement was stored server-side as draft instead of stored locally.

## Verifier output
- Live API proof: `POST /vista/cprs/labs/ack` returned real `ORWLRR ACK` success for DFN 46 during this clinician audit slice.
- Contract proof: the dialog draft branch now matches the route contract described in code comments and the Labs panel copy.
- Diagnostics proof: touched UI and runbook files reported no editor errors after the patch.

## Current blocker
- A live browser capture of the draft-success banner depends on forcing the non-real fallback path, which was not reproduced in the current sandbox because the acknowledge route succeeded live.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect once the remaining copy-level truth drifts are cleared.

# Phase 707 Update - Nursing Note Signing Completion

## What changed
1. Added the Phase 707 prompt set for standalone nursing note signing completion:
- `prompts/707-PHASE-707-NURSING-NOTE-SIGNING-COMPLETION/707-01-IMPLEMENT.md`
- `prompts/707-PHASE-707-NURSING-NOTE-SIGNING-COMPLETION/707-99-VERIFY.md`

2. Updated `apps/api/src/routes/nursing/index.ts`.
- Replaced the drifted standalone TIU create contract with the known-good chart note TIU contract.
- Added optional `TIU LOCK RECORD` + `TIU SIGN RECORD` + `TIU UNLOCK RECORD` during nursing note creation when an `esCode` is supplied.
- Returned truthful partial-success responses when creation succeeds but signing is blocked by an invalid e-signature code.
- Merged signed and unsigned `TIU DOCUMENTS BY CONTEXT` results so newly created unsigned nursing notes appear immediately in the standalone list.
- Corrected an accidental vitals-range regression so `/vista/nursing/vitals-range` again reads query parameters instead of request body fields.

3. Updated `apps/web/src/app/cprs/nursing/page.tsx`.
- Added an optional electronic signature code input to the nursing note modal.
- Updated the modal success messaging to distinguish unsigned creation, sign-blocked creation, and draft fallback.

4. Updated nursing runbooks.
- Documented the standalone nursing notes truth contract and the new optional sign-on-create flow in `docs/runbooks/nursing-flowsheets.md`.
- Updated `docs/runbooks/nursing-grounding.md` to reflect the live TIU sign path and the remaining need for a known valid e-signature during verification.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `POST /vista/nursing/notes/create` without `esCode` and confirm it returns `ok: true`, `status: created`, and `noteStatus: UNSIGNED`.
3. Call `GET /vista/nursing/notes?dfn=46` and confirm the newly created unsigned TIU note appears in the standalone nursing feed.
4. Call `POST /vista/nursing/notes/create` with an invalid `esCode` and confirm the note is still created while `signStatus: sign-blocked` explains the failure.
5. Open `/cprs/nursing?dfn=46`, create a note through the modal, and confirm the success banner and refreshed table match the live API response.

## Verifier output
- Live API proof: standalone nursing note creation now returns a live TIU note for DFN 46 instead of always falling back to local draft.
- Live API proof: `/vista/nursing/notes?dfn=46` now returns signed and unsigned nursing notes, including newly created unsigned TIU notes.
- Live API proof: standalone nursing sign attempts invoke the TIU lock/sign/unlock sequence and return a clean `invalid_esCode` blocker when the supplied e-signature is wrong.
- Live browser proof: the standalone nursing modal created a new TIU note and showed `Document IEN: 14378 - Status: UNSIGNED`, after which the table count increased from 35 to 36.
- Diagnostics proof: touched nursing API and UI files reported no editor errors after the patch.

## Current blocker
- End-to-end successful TIU note signing still requires a known valid electronic signature code for the VEHU clinician account; `PRO1234!!` is not accepted as the e-signature value.

## Follow-ups
1. Verify successful standalone nursing note signing with a real clinical e-signature code if one is provisioned for the VEHU user.

# Phase 706 Update - CPRS Reports Selection Truth Recovery

## What changed
1. Added the Phase 706 prompt set for Reports selection truth recovery:
- `prompts/706-PHASE-706-CPRS-REPORTS-SELECTION-TRUTH-RECOVERY/706-01-IMPLEMENT.md`
- `prompts/706-PHASE-706-CPRS-REPORTS-SELECTION-TRUTH-RECOVERY/706-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/ReportsPanel.tsx`.
- Added live catalog reconciliation for the selected report.
- Added qualifier reconciliation for Health Summary and date-range report selections.
- Cleared stale report text and qualifier state when the selected report or qualifier is no longer valid in the refreshed live catalog.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Reports selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/reports?dfn=46` and confirm the current live report catalog payload for the patient.
3. Open `/cprs/chart/46/reports` and confirm the catalog renders from the live route.
4. Select a report and qualifier, then refresh the catalog or switch patients and confirm stale report text does not survive if the selected report or qualifier is no longer present.

## Verifier output
- Live API proof: `/vista/reports?dfn=46` returned the current live report catalog for DFN 46.
- Static code proof: the Reports panel now clears stale report and qualifier state when the live catalog changes.
- Diagnostics proof: `apps/web/src/components/cprs/panels/ReportsPanel.tsx` reported no editor errors after the patch.

## Current blocker
- Live browser proof of a disappearing selected report still depends on a catalog change or patient-specific catalog difference at runtime.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 705 Update - CPRS D/C Summary Selection Truth Recovery

## What changed
1. Added the Phase 705 prompt set for D/C Summary selection truth recovery:
- `prompts/705-PHASE-705-CPRS-DC-SUMMARY-SELECTION-TRUTH-RECOVERY/705-01-IMPLEMENT.md`
- `prompts/705-PHASE-705-CPRS-DC-SUMMARY-SELECTION-TRUTH-RECOVERY/705-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/DCSummPanel.tsx`.
- Added patient-change reset for selected discharge summary, loaded text, and loading state.
- Added selection reconciliation so stale summary text is cleared when the selected summary no longer exists in the latest live TIU list.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the D/C Summary selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/dc-summaries?dfn=46` and confirm the current live discharge summary payload for the patient.
3. Open `/cprs/chart/46/dcsumm` and confirm the empty state matches the live route.
4. For a patient with D/C summary rows, select a summary, refresh the list or switch patients, and confirm the text pane clears if the selected summary is no longer present.

## Verifier output
- Live API proof: `/vista/dc-summaries?dfn=46` returned the current live D/C summary payload for DFN 46.
- Static code proof: the D/C Summary panel now clears stale selected-summary state when the live TIU list changes or the patient changes.
- Diagnostics proof: `apps/web/src/components/cprs/panels/DCSummPanel.tsx` reported no editor errors after the patch.

## Current blocker
- Live browser proof of the stale-selection path still depends on a patient or refresh path where discharge summaries are present and then disappear.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 704 Update - CPRS Surgery Selection Truth Recovery

## What changed
1. Added the Phase 704 prompt set for Surgery selection truth recovery:
- `prompts/704-PHASE-704-CPRS-SURGERY-SELECTION-TRUTH-RECOVERY/704-01-IMPLEMENT.md`
- `prompts/704-PHASE-704-CPRS-SURGERY-SELECTION-TRUTH-RECOVERY/704-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`.
- Removed the stale `stableCases` fallback that could preserve old surgery rows while the live VistA case list had already gone empty.
- Added selection reconciliation so the surgery detail pane clears when the selected case is no longer present in the latest live list.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Surgery selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/surgery?dfn=46` and confirm the current live surgery payload for the patient.
3. Open `/cprs/chart/46/surgery` and confirm the empty state matches the live route.
4. For a patient with surgery rows, select a case, refresh the list or switch patients, and confirm the case list and detail pane clear if the selected case is no longer present.

## Verifier output
- Live API proof: `/vista/surgery?dfn=46` returned the current live surgery payload for DFN 46.
- Static code proof: the Surgery panel no longer preserves stale surgery rows through a local `stableCases` fallback.
- Diagnostics proof: `apps/web/src/components/cprs/panels/SurgeryPanel.tsx` reported no editor errors after the patch.

## Current blocker
- Live browser cross-patient switching proof is still needed to capture the stale-selection path directly.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 703 Update - CPRS Notes Selection Truth Recovery

## What changed
1. Added the Phase 703 prompt set for Notes selection truth recovery:
- `prompts/703-PHASE-703-CPRS-NOTES-SELECTION-TRUTH-RECOVERY/703-01-IMPLEMENT.md`
- `prompts/703-PHASE-703-CPRS-NOTES-SELECTION-TRUTH-RECOVERY/703-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/NotesPanel.tsx`.
- Added selection reconciliation so the Notes detail pane cannot preserve stale note state after patient changes or live list refreshes.
- Clears note text, sign dialog state, addendum state, and related transient note actions when the selected note is no longer present in the live list.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Notes selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/notes?dfn=46` and confirm the current live notes payload for the patient.
3. Open `/cprs/chart/46/notes`, select a note, then refresh the list or switch patients.
4. Confirm the note detail pane and sign/addendum context clear if the prior selected note is no longer present in the live TIU list.

## Verifier output
- Live API proof: `/vista/notes?dfn=46` returned the current live TIU note payload for DFN 46.
- Static code proof: the Notes panel now reconciles selected note state against the latest live list.
- Diagnostics proof: `apps/web/src/components/cprs/panels/NotesPanel.tsx` reported no editor errors after the patch.

## Current blocker
- Live browser cross-patient switching proof is still needed to capture the stale-selection path directly.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 702 Update - CPRS Medications Selection Truth Recovery

## What changed
1. Added the Phase 702 prompt set for Medications selection truth recovery:
- `prompts/702-PHASE-702-CPRS-MEDICATIONS-SELECTION-TRUTH-RECOVERY/702-01-IMPLEMENT.md`
- `prompts/702-PHASE-702-CPRS-MEDICATIONS-SELECTION-TRUTH-RECOVERY/702-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/MedsPanel.tsx`.
- Added selection reconciliation so the medication detail pane cannot preserve stale medication state after patient changes or live list refreshes.
- Clears stale selection when the currently selected medication is no longer present in the live list.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Medications selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/medications?dfn=46` and `/vista/medications?dfn=47` to confirm the current live medication payloads differ across patients.
3. Open `/cprs/chart/46/meds`, select a medication, then switch to a patient with a different medication list.
4. Confirm the medication detail pane clears if the prior selected medication is not present for the new patient.

## Verifier output
- Live API proof: `/vista/medications?dfn=46` and `/vista/medications?dfn=47` returned different live medication lists.
- Static code proof: the Meds panel now reconciles selected medication state against the latest live list.
- Diagnostics proof: `apps/web/src/components/cprs/panels/MedsPanel.tsx` reported no editor errors after the patch.

## Current blocker
- Live browser cross-patient switching proof is still needed to capture the stale-selection path directly.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 701 Update - CPRS Consults Selection Truth Recovery

## What changed
1. Added the Phase 701 prompt set for Consults selection truth recovery:
- `prompts/701-PHASE-701-CPRS-CONSULTS-SELECTION-TRUTH-RECOVERY/701-01-IMPLEMENT.md`
- `prompts/701-PHASE-701-CPRS-CONSULTS-SELECTION-TRUTH-RECOVERY/701-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`.
- Added selection reconciliation so the Consults detail pane cannot preserve stale consult state after live refreshes or patient changes.
- Clears stale detail text and loading state when the selected consult is no longer present in the live list.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Consults selection truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/consults?dfn=46` and confirm the current live consult payload for the patient.
3. Open `/cprs/chart/46/consults` and confirm the empty state matches the live route.
4. For a patient with consult rows, select a consult, refresh the list or switch patients, and confirm the detail pane clears if the selected consult no longer exists.

## Verifier output
- Live API proof: `/vista/consults?dfn=46` returned the current live consult payload for DFN 46.
- Live browser proof: `/cprs/chart/46/consults` truthfully showed `0 consult(s)` with no stale detail selection.
- Diagnostics proof: `apps/web/src/components/cprs/panels/ConsultsPanel.tsx` reported no editor errors after the patch.

## Current blocker
- No blocker remains for the Phase 701 consults selection truth-recovery change.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 700 Update - Nursing Patient Banner Truth Recovery

## What changed
1. Added the Phase 700 prompt set for nursing patient banner truth recovery:
- `prompts/700-PHASE-700-NURSING-PATIENT-BANNER-TRUTH-RECOVERY/700-01-IMPLEMENT.md`
- `prompts/700-PHASE-700-NURSING-PATIENT-BANNER-TRUTH-RECOVERY/700-99-VERIFY.md`

2. Updated `apps/api/src/routes/nursing/index.ts`.
- Corrected the `/vista/nursing/patient-context` ORWPT16 parser so it derives the patient name from the actual VEHU positional output instead of treating the SSN field as the patient name.

3. Updated nursing runbooks.
- Documented the VEHU ORWPT16 positional field order in `docs/runbooks/nursing-flowsheets.md` and `docs/runbooks/nursing-grounding.md`.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/nursing/patient-context?dfn=46` and confirm `patient.name` is the live patient name rather than the SSN.
3. Open `/cprs/nursing?dfn=46` and confirm the patient banner shows the live patient name with DFN 46.

## Verifier output
- Raw RPC proof: `ORWPT16 ID INFO` for DFN 46 returned `666-67-8888^2350407^90^M^^NSC VETERAN^^^ZZZRETFOURNINETYFOUR,PATIENT`.
- Live API proof: `/vista/nursing/patient-context?dfn=46` should now map `patient.name` to `ZZZRETFOURNINETYFOUR,PATIENT`.

## Current blocker
- API restart and live browser banner verification are still required after the parser change.

## Follow-ups
1. Restart the API and re-run the standalone Nursing banner verification live.

# Phase 699 Update - Nursing Tasks Truth Recovery

## What changed
1. Added the Phase 699 prompt set for standalone nursing task truth recovery:
- `prompts/699-PHASE-699-NURSING-TASKS-TRUTH-RECOVERY/699-01-IMPLEMENT.md`
- `prompts/699-PHASE-699-NURSING-TASKS-TRUTH-RECOVERY/699-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/nursing/page.tsx`.
- Replaced the fabricated patient task table in the standalone Nursing workspace with the live `/vista/nursing/tasks` feed.
- Kept shift safety reminders on the page, but relabeled them as local checklist guidance instead of live patient task rows.
- Added partial-load truth guards so task or flowsheet failures no longer masquerade as `no tasks` or `vitals current` states.

3. Updated `docs/runbooks/nursing-flowsheets.md`.
- Corrected the standalone nursing Tasks contract to reflect the current live `ORWPS ACTIVE` fallback.
- Added the Nursing Tasks truth contract and live verification guidance.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/nursing/tasks?dfn=46` and confirm the current live VEHU task payload for the patient.
3. Open `/cprs/nursing?dfn=46`, switch to `Tasks & Reminders`, and confirm the primary task table mirrors the live route instead of showing fabricated checklist rows.
4. Confirm the shift safety checklist remains visible only as local guidance, distinct from the live task feed.

## Verifier output
- Live API proof: `/vista/nursing/tasks?dfn=46` remained the governing live task feed.
- Static code proof: the standalone Nursing workspace no longer builds a patient task table from local heuristics.
- Diagnostics proof: `apps/web/src/app/cprs/nursing/page.tsx` reported no editor errors after the patch.

## Current blocker
- Browser verification of the standalone `/cprs/nursing` page still requires an authenticated browser session in the verification context.

## Follow-ups
1. Re-run the standalone Nursing workspace in an authenticated browser session and capture live UI proof.

# Phase 698 Update - CPRS Orders Draft Cache Truth Recovery

## What changed
1. Added the Phase 698 prompt set for Orders draft-cache truth recovery:
- `prompts/698-PHASE-698-CPRS-ORDERS-DRAFT-CACHE-TRUTH-RECOVERY/698-01-IMPLEMENT.md`
- `prompts/698-PHASE-698-CPRS-ORDERS-DRAFT-CACHE-TRUTH-RECOVERY/698-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/OrdersPanel.tsx`.
- Clarified the lower split-pane empty state so it refers to draft orders in local cache rather than implying that no orders exist.
- When live VistA orders are present for the active type, the empty-state text now explicitly points clinicians to the live list above.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Orders draft-cache truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/cprs/orders?dfn=46` and confirm live VistA orders are returned.
3. Open `/cprs/chart/46/orders` and confirm the lower empty-state text distinguishes draft-cache state from the live VistA orders shown above.

## Verifier output
- Live API proof: `/vista/cprs/orders?dfn=46` returned live VistA orders for the active patient.
- Live browser proof: `/cprs/chart/46/orders` now distinguishes empty draft-cache state from the visible live VistA orders.
- Diagnostics proof: `apps/web/src/components/cprs/panels/OrdersPanel.tsx` reported no editor errors after the patch.

## Current blocker
- No blocker remains for the Phase 698 orders draft-cache truth-recovery change.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 697 Update - CPRS Labs Selection Truth Recovery

## What changed
1. Added the Phase 697 prompt set for labs selection truth recovery:
- `prompts/697-PHASE-697-CPRS-LABS-SELECTION-TRUTH-RECOVERY/697-01-IMPLEMENT.md`
- `prompts/697-PHASE-697-CPRS-LABS-SELECTION-TRUTH-RECOVERY/697-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- Reconciled the selected lab result against the latest live result set after each refresh.
- Reconciled selected acknowledgement ids against the latest live result set so the panel cannot keep stale ack targets.
- Cleared stale selection automatically when the live VEHU result set is empty.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Labs selection truth contract for live refresh behavior.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `/vista/labs?dfn=46` and confirm the live route returns the current VEHU result count.
3. Open `/cprs/chart/46/labs` and confirm the Results tab truthfully shows `0 live result(s)` with no stale detail selection.
4. Confirm the acknowledge action remains disabled while there are no live result rows to select.

## Verifier output
- Live API proof: `/vista/labs?dfn=46` returned the current live VEHU lab payload for DFN 46.
- Live browser proof: `/cprs/chart/46/labs` continued to show `0 live result(s)` without a stale detail selection after refresh.
- Diagnostics proof: `apps/web/src/components/cprs/panels/LabsPanel.tsx` reported no editor errors after the patch.

## Current blocker
- No blocker remains for the Phase 697 labs selection truth-recovery change.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 696 Update - Problem Onset Date Truth Recovery

## What changed
1. Added the Phase 696 prompt set for problem onset date truth recovery:
- `prompts/696-PHASE-696-PROBLEM-ONSET-DATE-TRUTH-RECOVERY/696-01-IMPLEMENT.md`
- `prompts/696-PHASE-696-PROBLEM-ONSET-DATE-TRUTH-RECOVERY/696-99-VERIFY.md`

2. Updated `apps/api/src/server/inline-routes.ts`.
- Added precision-preserving FileMan onset normalization for the active `/vista/problems` route.
- Stopped fabricating impossible dates such as `1975-04-00` when VistA only provides year-month precision.

3. Updated `apps/api/src/routes/portal-auth.ts`.
- Applied the same onset normalization contract to the portal problems mapper so clinician and portal problem surfaces stay aligned.

4. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added the Problems onset truth contract for partial FileMan dates.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Open `/cprs/chart/46/cover` and confirm the PTSD problem onset renders as `1975-04` rather than `1975-04-00`.
3. Open `/cprs/chart/46/problems` and confirm the same onset value is shown in the problem detail surface.
4. Call `/vista/problems?dfn=46` and confirm the PTSD problem returns `"onset":"1975-04"`.

## Verifier output
- Live browser proof: `/cprs/chart/46/cover` now renders `Posttraumatic stress disorder (SCT 47505003)` with onset `1975-04` in the Active Problems table.
- Live browser proof: `/cprs/chart/46/problems` renders the same problem data against the corrected API contract.
- Live API proof after restart: `/vista/problems?dfn=46` returned `ok:true`, `count:6`, and the PTSD record with `"onset":"1975-04"` instead of `"1975-04-00"`.
- Diagnostics proof: `apps/api/src/server/inline-routes.ts` and `apps/api/src/routes/portal-auth.ts` reported no editor errors after the patch.

## Current blocker
- No blocker remains for the Phase 696 problem onset date truth recovery.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 695 Update - CPRS MailMan Truth Recovery

## What changed
1. Added the Phase 695 prompt set for clinician messaging truth recovery:
- `prompts/695-PHASE-695-CPRS-MAILMAN-TRUTH-RECOVERY/695-01-IMPLEMENT.md`
- `prompts/695-PHASE-695-CPRS-MAILMAN-TRUTH-RECOVERY/695-99-VERIFY.md`

2. Updated `apps/web/src/app/cprs/messages/page.tsx`.
- Removed the clinician page's visible local inbox and sent-cache fallback posture.
- Switched clinician compose/send to the direct `/vista/mailman/send` route.
- Kept the screen explicitly VistA MailMan only, with basket browsing and VistA detail reads.

3. Updated `apps/web/src/components/cprs/CPRSMenuBar.tsx`.
- Added a direct `Messages / MailMan` entry under the File menu.

4. Updated `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`.
- Relabeled the message subtab as `Staff Queue`.
- Added explicit guidance that this view is the patient portal staff queue and not the clinician MailMan inbox.

5. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- Added MailMan truth contract language and tightened the Tasks queue truth contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Open `/cprs/messages`.
3. Confirm the page identifies itself as `VistA MailMan` and does not advertise local fallback mode.
4. Open File and confirm `Messages / MailMan` navigates to `/cprs/messages`.
5. Open `/cprs/chart/46/tasks` and confirm the `Staff Queue` tab explains that it is the patient portal queue and points clinicians to File > Messages / MailMan for direct MailMan access.

## Verifier output
- Browser proof: `/cprs/messages` now renders the `Secure Messages` heading with the `VistA MailMan` badge and the explicit note that no local fallback is used on this clinician screen.
- Browser proof: the File menu now includes `Messages / MailMan`, and selecting it routes to `/cprs/messages`.
- Browser proof: `/cprs/chart/46/tasks` now labels the first subtab as `Staff Queue` and shows guidance that it is the patient portal staff queue rather than the clinician MailMan inbox.
- Live API proof from the authenticated clinician session: `/vista/mailman/folders`, `/vista/mailman/inbox?limit=5`, and `/messaging/mail-list?folderId=1&limit=5` all returned `source:"vista"` with real MailMan data.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` returned `EXIT:0`.

## Current blocker
- No blocker remains for the Phase 695 UI truth-recovery changes.

## Follow-ups
1. Complete live browser verification on `/cprs/messages` and `/cprs/chart/46/tasks`.
2. Keep auditing remaining clinician fallback surfaces against the original VistA-first prompts.

# Phase 694 Update - CPRS Tasks Reply Action Truth Recovery

## What changed
1. Added the Phase 694 prompt set for CPRS Tasks reply action truthfulness:
- `prompts/694-PHASE-694-CPRS-TASKS-REPLY-ACTION-TRUTH-RECOVERY/694-01-IMPLEMENT.md`
- `prompts/694-PHASE-694-CPRS-TASKS-REPLY-ACTION-TRUTH-RECOVERY/694-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`.
- The inline `Send Reply` action now stays disabled until the reply textarea contains non-whitespace content.
- The existing handler guard remains intact as a defensive fallback.
- The reply composer now explains that reply text is required before the action enables.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the Tasks reply gating contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Open `/cprs/chart/46/tasks`.
3. Open `Reply` for an existing patient message.
4. Confirm `Send Reply` is disabled while the reply textarea is blank or whitespace-only.
5. Enter non-whitespace reply text and confirm `Send Reply` becomes enabled.

## Verifier output
- Live browser proof before the UI fix: `/cprs/chart/46/tasks` rendered an enabled `Send Reply` button in the inline reply composer while the textarea was blank; clicking it only surfaced `Reply text is required` after the click.
- Post-fix browser proof: the same Tasks workflow now keeps `Send Reply` disabled until the reply textarea contains non-whitespace text.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the Tasks reply dead action reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 693 Update - CPRS Reports Date-Range Action Truth Recovery

## What changed
1. Added the Phase 693 prompt set for CPRS Reports date-range action truthfulness:
- `prompts/693-PHASE-693-CPRS-REPORTS-DATE-RANGE-ACTION-TRUTH-RECOVERY/693-01-IMPLEMENT.md`
- `prompts/693-PHASE-693-CPRS-REPORTS-DATE-RANGE-ACTION-TRUTH-RECOVERY/693-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/ReportsPanel.tsx`.
- The `Load Custom Range` action now stays disabled until both Start Date and End Date are populated.
- The existing handler guard remains intact as a defensive fallback.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the Reports custom date-range gating contract.

## Manual test steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Open `/cprs/chart/46/reports`.
3. Select a date-range report such as `Lab Status`.
4. Choose `Date Range...` from the range selector.
5. Confirm `Load Custom Range` is disabled while either date is blank.
6. Enter both dates and confirm `Load Custom Range` becomes enabled.

## Verifier output
- Live browser proof before the UI fix: `/cprs/chart/46/reports` -> `Lab Status` -> `Date Range...` rendered an enabled `Load Custom Range` button on blank dates; clicking it only surfaced `Enter both a start date and an end date.` after the click.
- Post-fix browser proof: the same Reports workflow now keeps `Load Custom Range` disabled until both dates are present.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the Reports custom date-range dead action reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 692 Update - CPRS Imaging Order Action Truth Recovery

## What changed
1. Added the Phase 692 prompt set for CPRS Imaging order-action truthfulness:
- `prompts/692-PHASE-692-CPRS-IMAGING-ORDER-ACTION-TRUTH-RECOVERY/692-01-IMPLEMENT.md`
- `prompts/692-PHASE-692-CPRS-IMAGING-ORDER-ACTION-TRUTH-RECOVERY/692-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/ImagingPanel.tsx`.
- The `Create Order` action in the Imaging `New Order` form now stays disabled until both required fields are populated.
- The form now shows truthful helper text explaining that `Procedure` and `Clinical Indication` are required before the action enables.
- The existing submit-time guard remains in place as a defensive fallback.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the Imaging New Order gating contract for blank required fields.

## Manual test steps
1. Confirm the API is running and the web app is reachable.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Open `/cprs/chart/46/imaging` and switch to `New Order`.
4. Confirm `Create Order` is disabled while `Procedure` and `Clinical Indication` are blank.
5. Enter only one required field and confirm `Create Order` remains disabled.
6. Enter both required fields and confirm `Create Order` becomes enabled.

## Verifier output
- Live browser proof before the UI fix: `/cprs/chart/46/imaging` rendered an enabled `Create Order` button on a blank `New Order` form; clicking it only surfaced `Procedure is required` after the click.
- Post-fix browser proof: the Imaging `New Order` form now keeps `Create Order` disabled until both required fields are present and shows helper text explaining the requirement before any click.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the Imaging New Order dead action reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 691 Update - CPRS AI Intake Action Truth Recovery

## What changed
1. Added the Phase 691 prompt set for CPRS AI Assist intake-action truthfulness:
- `prompts/691-PHASE-691-CPRS-AI-INTAKE-ACTION-TRUTH-RECOVERY/691-01-IMPLEMENT.md`
- `prompts/691-PHASE-691-CPRS-AI-INTAKE-ACTION-TRUTH-RECOVERY/691-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`.
- The `Generate Intake Summary` action now preflights intake availability for the current patient.
- The button stays disabled when no intake session exists.
- The tab now shows truthful helper text explaining that a real intake session is required.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the AI Assist intake-summary gating contract for zero-session patients.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /intake/by-patient/46` and confirm the response is `{"ok":true,"sessions":[]}`.
4. Open `/cprs/chart/46/aiassist`.
5. Confirm `Generate Intake Summary` is disabled before any click and the panel explains that a real intake session is required.

## Verifier output
- Live route proof before the UI fix: `GET /intake/by-patient/46` returned `{"ok":true,"sessions":[]}`.
- Live browser proof before the UI fix: `/cprs/chart/46/aiassist` rendered an enabled `Generate Intake Summary` button and only showed `No intake sessions are available for this patient. Intake Summary requires a real intake session.` after the click.
- Post-fix browser proof: the same AI Assist view keeps the action disabled up front and shows the same blocking explanation before any click.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the AI Assist intake-summary dead action reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 690 Update - CPRS Labs Specimen/Result Action Truth Recovery

## What changed
1. Added the Phase 690 prompt set for the remaining Labs create-action truthfulness fixes:
- `prompts/690-PHASE-690-CPRS-LABS-SPECIMEN-RESULT-ACTION-TRUTH-RECOVERY/690-01-IMPLEMENT.md`
- `prompts/690-PHASE-690-CPRS-LABS-SPECIMEN-RESULT-ACTION-TRUTH-RECOVERY/690-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- `Create Specimen` is now disabled until Order and Accession Number are populated.
- `Record Result` is now disabled until Order, Analyte, and Value are populated.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the required-field gating contract for the Labs Specimens and Result entry actions.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Open `/cprs/chart/46/labs`, switch to `Specimens`, and leave Order and Accession Number blank.
3. Confirm `Create Specimen` is disabled.
4. Switch to `Critical Alerts`, leave Order, Analyte, and Value blank, and confirm `Record Result` is disabled.
5. Populate the minimum required fields and confirm each corresponding action enables.

## Verifier output
- Live browser proof before the UI fix: `/cprs/chart/46/labs` rendered enabled `Create Specimen` and `Record Result` buttons even though the required inputs were blank.
- Post-fix browser proof: both views keep their primary actions disabled until the minimum required fields are present.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the remaining Labs dead actions reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 689 Update - CPRS Labs Order Action Truth Recovery

## What changed
1. Added the Phase 689 prompt set for Labs Orders view action truthfulness:
- `prompts/689-PHASE-689-CPRS-LABS-ORDER-ACTION-TRUTH-RECOVERY/689-01-IMPLEMENT.md`
- `prompts/689-PHASE-689-CPRS-LABS-ORDER-ACTION-TRUTH-RECOVERY/689-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- `Submit VistA Request` is now disabled until the VistA lab test request field has content.
- `Create Workflow Order` is now disabled until Test Name has content.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the empty-input gating contract for both Labs Orders view actions.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Open `/cprs/chart/46/labs`, switch to `Orders`, and leave both required fields blank.
3. Confirm `Submit VistA Request` is disabled while the VistA Lab Test Request field is empty.
4. Confirm `Create Workflow Order` is disabled while Test Name is empty.
5. Enter text into each field and confirm the corresponding action enables.

## Verifier output
- Live browser proof before the UI fix: the Labs Orders view rendered both `Submit VistA Request` and `Create Workflow Order` as enabled on empty inputs, and clicking them silently no-oped.
- Post-fix browser proof: `/cprs/chart/46/labs` → `Orders` keeps both primary actions disabled until their required text inputs are populated.
- Compile proof: `pnpm -C apps/web exec tsc --noEmit` completed without TypeScript errors after the panel update.

## Current blocker
- No blocker remains for the Labs Orders view dead actions reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 688 Update - CPRS Labs Acknowledge Action Truth Recovery

## What changed
1. Added the Phase 688 prompt set for the Labs acknowledge-action truthfulness fix:
- `prompts/688-PHASE-688-CPRS-LABS-ACK-ACTION-TRUTH-RECOVERY/688-01-IMPLEMENT.md`
- `prompts/688-PHASE-688-CPRS-LABS-ACK-ACTION-TRUTH-RECOVERY/688-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- The primary `Acknowledge` button is now disabled until at least one lab result is selected.
- Clearing or changing acknowledgement selection also clears the stale warning message from prior dead-click attempts.

3. Updated `docs/runbooks/cprs-parity-closure-phase14.md`.
- The runbook now records the Labs Results view contract: no enabled acknowledge action without a selectable result.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/labs?dfn=46` and confirm the route returns `ok:true`, `count:0`, `results:[]`, and `rpcUsed:"ORWLRR INTERIM"`.
4. Open `/cprs/chart/46/labs` and confirm the Results view shows `0 live result(s)`.
5. Confirm the `Acknowledge` button is disabled and no longer advertises an actionable write when nothing is selectable.

## Verifier output
- Live route proof before the UI fix: `GET /vista/labs?dfn=46` returned `{"ok":true,"count":0,"results":[],"rawText":"No Data Found","rpcUsed":"ORWLRR INTERIM"}`.
- Live browser proof before the UI fix: `/cprs/chart/46/labs` rendered `0 live result(s)` but still showed an enabled `Acknowledge` button; clicking it only produced `Select one or more results to acknowledge.`.
- Post-fix browser proof: `/cprs/chart/46/labs` renders the same truthful empty-state but keeps the `Acknowledge` button disabled until a result is selected.

## Current blocker
- No blocker remains for the Labs empty-state dead action reproduced on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 687 Update - CPRS Cover Sheet Appointments Truth Recovery

## What changed
1. Added the Phase 687 prompt set for CPRS Cover Sheet appointments truth recovery:
- `prompts/687-PHASE-687-CPRS-COVERSHEET-APPOINTMENTS-TRUTH-RECOVERY/687-01-IMPLEMENT.md`
- `prompts/687-PHASE-687-CPRS-COVERSHEET-APPOINTMENTS-TRUTH-RECOVERY/687-99-VERIFY.md`

2. Corrected `apps/api/src/routes/cprs/wave1-routes.ts` so `GET /vista/cprs/appointments?dfn=` now uses the scheduling adapter's CPRS-specific `ORWPT APPTLST` path instead of the merged encounter/request feed.
- Before the fix, the Cover Sheet appointments card could show local request-store workflow rows such as `request pending` and `request approved` as if they were chart appointments.
- The route now returns appointment-only rows grounded to `rpcUsed:["ORWPT APPTLST"]` and no longer imports request-store entries into the cover-sheet summary.

3. Updated `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`.
- The Appointments card now cites `ORWPT APPTLST` as its target RPC.
- The empty state now reflects appointment truth with `No upcoming appointments` instead of `appointments or requests` wording.

4. Updated `docs/runbooks/scheduling-vista-sd.md`.
- The runbook now documents that the CPRS Cover Sheet appointments summary is grounded to `ORWPT APPTLST`, not the merged request workflow feed.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/cprs/appointments?dfn=46` and confirm the response is grounded to `ORWPT APPTLST` and no longer returns request-store rows.
4. Open `/cprs/chart/46/cover` and confirm the Appointments card no longer renders `request pending` or `request approved` rows as chart appointments.

## Verifier output
- Live health proof: `/health` returned `ok:true`, `circuitBreaker:"closed"`, and `/vista/ping` returned `{"ok":true,"vista":"reachable","port":9431}` after the API restart.
- Live route proof: `GET /vista/cprs/appointments?dfn=46` returned `{"ok":true,"status":"ok","results":[],"rpcUsed":["ORWPT APPTLST"],"pendingTargets":[]}`.
- Adapter proof: `GET /scheduling/appointments/cprs?dfn=46` returned `ok:true`, `count:0`, and `vistaGrounding.rpc:"ORWPT APPTLST"`.
- Browser proof: `/cprs/chart/46/cover` rendered the Appointments card as `No upcoming appointments` with the footer/source text `ORWPT APPTLST`; the prior `request pending` and `request approved` rows were gone.

## Current blocker
- No blocker remains for the Cover Sheet appointments truthfulness defect on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 686 Update - eMAR Allergy PSB Grounding

## What changed
1. Added the Phase 686 prompt set for standalone eMAR allergy grounding:
- `prompts/686-PHASE-686-EMAR-ALLERGY-PSB-GROUNDING/686-01-IMPLEMENT.md`
- `prompts/686-PHASE-686-EMAR-ALLERGY-PSB-GROUNDING/686-99-VERIFY.md`

2. Corrected `apps/api/src/routes/emar/index.ts` so `/emar/allergies` now uses live `PSB ALLERGY` output alongside `ORQQAL LIST` instead of hardcoding `PSB ALLERGY` as integration-pending.
- Before the fix, the standalone eMAR allergy route returned documented allergies from `ORQQAL LIST` but still claimed scan-time BCMA allergy checking was pending even though the chart nursing MAR route was already calling `PSB ALLERGY` successfully in VEHU.
- The route now returns `rpcUsed:["ORQQAL LIST","PSB ALLERGY"]`, removes the stale pending target, and normalizes the raw `PSB ALLERGY` count line out of `interactionWarnings`.

3. Updated `apps/web/src/app/cprs/emar/page.tsx`.
- The standalone Allergy Warnings tab now parses the live `PSB ALLERGY` warning rows into clinician-readable allergy/reaction entries instead of rendering stale pending copy or leaking raw count/header lines.

4. Updated `docs/runbooks/emar-bcma.md`.
- The runbook now documents that standalone eMAR allergies are VistA-backed through `ORQQAL LIST` plus `PSB ALLERGY`, while only broader BCMA history/writeback targets remain pending.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /emar/allergies?dfn=46` and confirm the route returns `rpcUsed:["ORQQAL LIST","PSB ALLERGY"]`, `pendingTargets:[]`, and live `interactionWarnings` rows for CODEINE, PEANUTS, PENICILLIN, and SULFONAMIDE/RELATED ANTIMICROBIALS.
4. Call `GET /vista/nursing/mar?dfn=46` and confirm the returned `allergyWarnings` are consistent with the standalone eMAR route.
5. Open `/cprs/emar?dfn=46`, switch to `Allergy Warnings`, and confirm the footer now cites `PSB ALLERGY` as the live BCMA warning source rather than calling it integration-pending.

## Verifier output
- Workspace diagnostics proof: `apps/api/src/routes/emar/index.ts` and `apps/web/src/app/cprs/emar/page.tsx` reported no new errors.
- Live health proof: `/health` returned `ok:true` and `circuitBreaker:"closed"` after the restart.
- Live route proof: `GET /emar/allergies?dfn=46` returned `ok:true`, `count:4`, `rpcUsed:["ORQQAL LIST","PSB ALLERGY"]`, `pendingTargets:[]`, and cleaned `interactionWarnings` rows without the raw numeric count line.
- Live parity proof: `GET /vista/nursing/mar?dfn=46` returned `rpcUsed:["ORWPS ACTIVE","PSB ALLERGY"]` with the same live allergy warning posture from `PSB ALLERGY`.
- Browser proof: the standalone eMAR `Allergy Warnings` tab displayed the documented allergy table, BCMA allergy/reaction warning entries, and truthful source text naming `ORQQAL LIST` plus `PSB ALLERGY`.

## Current blocker
- No blocker remains for the stale standalone eMAR allergy posture on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 685 Update - eMAR Barcode Scan Order Fallback

## What changed
1. Added the Phase 685 prompt set for eMAR barcode-scan order fallback:
- `prompts/685-PHASE-685-EMAR-BARCODE-SCAN-ORDER-FALLBACK/685-01-IMPLEMENT.md`
- `prompts/685-PHASE-685-EMAR-BARCODE-SCAN-ORDER-FALLBACK/685-99-VERIFY.md`

2. Corrected `apps/api/src/routes/emar/index.ts` so `/emar/barcode-scan` now reuses the same active-medication fallback hierarchy as `/emar/schedule`.
- Before the fix, barcode scan only searched raw `ORWPS ACTIVE`, so DFN 46 incorrectly returned `activeMedCount:0` and `matched:false` even though the schedule view was already showing the active medication through the CPRS order fallback.
- The route now falls back to live active CPRS medication orders from `ORWORR AGET`, enriched with `ORWORR GETBYIFN` and `ORWORR GETTXT`, before barcode matching.
- The response now reports `fallbackUsed` and a truthful fallback note when the order-derived medication set is what enabled the scan match.

3. Updated `docs/runbooks/emar-bcma.md`.
- The runbook now documents that both schedule and barcode-scan share the same fallback candidate hierarchy when `ORWPS ACTIVE` is empty for a med-bearing VEHU patient.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /emar/schedule?dfn=46` and confirm the active oxycodone medication is returned with fallback RPCs in `rpcUsed`.
4. Call `POST /emar/barcode-scan` with `{"dfn":"46","barcode":"OXYCODONE"}` and confirm the route returns `matched:true`, `activeMedCount:1`, `orderIEN:"8207"`, and `fallbackUsed:true`.
5. Repeat the barcode-scan request in the same authenticated session and confirm it still resolves to order `8207` even when the response has to fall back to the `PSB VALIDATE ORDER` order hint path.
6. Open `/cprs/emar?dfn=46`, switch to `BCMA Scanner`, submit `OXYCODONE`, and confirm the UI reports the matched medication and order IEN instead of a false no-match posture.

## Verifier output
- Workspace diagnostics proof: `apps/api/src/routes/emar/index.ts` and the Phase 685 prompt files reported no new errors.
- Live health proof: `/health` returned `ok:true` and `circuitBreaker:"closed"` before verification.
- Live schedule proof: `GET /emar/schedule?dfn=46` returned `count:1` with the active oxycodone order and `rpcUsed:["ORWPS ACTIVE","ORWORR AGET","ORWORR GETBYIFN","ORWORR GETTXT"]`.
- Live barcode proof: `POST /emar/barcode-scan` with `dfn=46` and barcode `OXYCODONE` returned `ok:true`, `matched:true`, `activeMedCount:1`, `fallbackUsed:true`, `orderIEN:"8207"`, and `rpcUsed:["ORWPS ACTIVE","ORWORR AGET","ORWORR GETBYIFN","ORWORR GETTXT","PSB VALIDATE ORDER"]`.
- Same-session stability proof: a second authenticated `POST /emar/barcode-scan` call still returned `matched:true` for order `8207`; when order-text enrichment was absent, the route recovered through semicolon-qualified `PSB VALIDATE ORDER` order hints instead of regressing to a false no-match.
- Browser proof: the standalone eMAR `BCMA Scanner` tab displayed `VistA verification completed`, the matched oxycodone medication, `Order IEN: 8207`, and the truthful fallback note about CPRS-order-derived candidates.

## Current blocker
- No blocker remains for the eMAR schedule-versus-scanner medication mismatch on DFN 46.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 684 Update - CPRS RPC Pool Partial Read Recovery

## What changed
1. Added the Phase 684 prompt set for pooled RPC partial-read recovery:
- `prompts/684-PHASE-684-CPRS-RPC-POOL-PARTIAL-READ-RECOVERY/684-01-IMPLEMENT.md`
- `prompts/684-PHASE-684-CPRS-RPC-POOL-PARTIAL-READ-RECOVERY/684-99-VERIFY.md`

2. Hardened `apps/api/src/vista/rpcConnectionPool.ts`.
- The DUZ-scoped pooled broker path now rejects stale buffered bytes when no XWB EOT terminator is present.
- Mid-read socket close and timeout paths now taint and destroy the pooled connection instead of allowing partial payloads to masquerade as valid RPC responses.
- Pooled read/list call failures now explicitly taint the connection before retry/reacquire.

3. Added `apps/api/tests/rpc-connection-pool.test.ts`.
- The regression suite proves three cases: valid EOT-buffered response, stale unterminated bytes, and partial close before EOT.

4. Updated `docs/runbooks/vista-rpc-phase12-parity.md`.
- The parity runbook now records the pooled transport guardrail so future chart-read investigations start at the correct fault domain.

## Manual test steps
1. Confirm the API is running against VEHU and `/health` reports `circuitBreaker:"closed"`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/immunizations?dfn=46` and confirm `{ ok:true, count:0, results:[] }`.
4. Call `GET /vista/immunizations?dfn=84` and confirm the two real VEHU immunization rows: `HEP B` and `INFLUENZA`.
5. Repeat the DFN 84 request multiple times on the same authenticated session and confirm the payload stays identical.

## Verifier output
- Targeted regression proof: `pnpm exec vitest run tests/rpc-connection-pool.test.ts` passed with 3/3 tests.
- Live API proof before repeated reads: `/health` returned `ok:true` and `circuitBreaker:"closed"`.
- Live API proof: `GET /vista/immunizations?dfn=46` returned `ok:true`, `count:0`, and an empty `results` array.
- Live API proof: `GET /vista/immunizations?dfn=84` returned `ok:true`, `count:2`, with `HEP B` (`2980717`) and `INFLUENZA` (`2980617`).
- Stability proof: 8 repeated authenticated calls to `GET /vista/immunizations?dfn=84` all returned the same two-row payload with no malformed cross-RPC data.
- Live API proof after repeated reads: `/health` still returned `circuitBreaker:"closed"`.

## Current blocker
- No blocker remains for the pooled partial-read corruption reproduced during the clinician immunizations audit.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 683 Update - CPRS Problem Write Contract Recovery

## What changed
1. Added the Phase 683 prompt set for CPRS problem-write contract recovery:
- `prompts/683-PHASE-683-CPRS-PROBLEM-WRITE-CONTRACT-RECOVERY/683-01-IMPLEMENT.md`
- `prompts/683-PHASE-683-CPRS-PROBLEM-WRITE-CONTRACT-RECOVERY/683-99-VERIFY.md`

2. Replaced the broken app-side `ORQQPL ADD SAVE` positional call with a live VistA-first wrapper path.
- Added `services/vista/ZVEPROBADD.m` as `VE PROBLEM ADD`.
- The wrapper resolves provider narrative with `PROVNARR^GMPLX`, diagnosis coding with `NOS^GMPLX`, patient flags with `INITPT^ORQQPL1`, and files through `NEW^GMPLSAVE`.
- Wired the wrapper into `scripts/install-vista-routines.ps1`, `services/vista/VEMCTX3.m`, `apps/api/src/vista/rpcRegistry.ts`, and `apps/api/src/vista/rpcCapabilities.ts`.

3. Updated `apps/api/src/routes/cprs/wave2-routes.ts`.
- `POST /vista/cprs/problems/add` now calls `VE PROBLEM ADD` and truthfully reports real VistA success only when the wrapper returns `1^<problemIen>^Problem added`.
- The route accepts `lexIen` from the CPRS dialog and falls back to `ORQQPL4 LEX` server-side resolution for older callers such as patient search.
- Draft fallback remains truthful and is now reserved for genuine wrapper unavailability or live write failure.

4. Updated `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx`.
- The dialog now posts the selected lexicon IEN.
- After a real save, it refreshes the cached Problems domain before closing so the Problems tab shows the new row immediately.

5. Updated `docs/runbooks/vista-rpc-add-problem.md` to document the real write contract and the live verification path.

## Manual test steps
1. Run `.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu`.
2. Start the API with `Set-Location .\apps\api; npx tsx --env-file=.env.local src/index.ts`.
3. Authenticate with `PRO1234 / PRO1234!!` and POST:
`/vista/cprs/problems/add` with `{"dfn":"46","problemText":"Essential hypertension","icdCode":"I10.","lexIen":"7106455","onset":"2026-03-08","status":"active"}`.
4. Confirm the response returns `ok:true`, `mode:"real"`, and a real `problemIen`.
5. Confirm `GET /vista/problems?dfn=46` includes the newly filed row.
6. Open `http://127.0.0.1:3000/cprs/chart/46/problems`, add a lexicon-grounded problem from `+ New Problem`, and confirm the table refreshes to include the new row without a manual reload.

## Verifier output
- Live API proof: `POST /vista/cprs/problems/add` returned `{"ok":true,"mode":"real","status":"saved","problemIen":"1881","lexIen":"7106455",...}`.
- Live readback proof: `GET /vista/problems?dfn=46` returned the newly filed VistA rows, including `Asthma` and `Wheezing` during browser verification.
- Live browser proof: the Problems modal showed a real success message and the Problems table refreshed immediately after save.
- `pnpm -C .\apps\api exec tsc --noEmit` passed after restoring the shared `getDuz` import.
- `.\scripts\verify-latest.ps1` still reports unrelated pre-existing failures in G02 phase-index freshness/duplicate phases. The temporary G07a compile regression caused by the missing `getDuz` import was fixed.

## Current blocker
- No blocker remains for the clinician-visible CPRS problem-add workflow reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 682 Update - CPRS Notes Refresh Continuity Recovery

## What changed
1. Added the Phase 682 prompt set for Notes refresh continuity recovery:
- `prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-01-IMPLEMENT.md`
- `prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-99-VERIFY.md`

2. Updated `apps/web/src/components/cprs/panels/NotesPanel.tsx`.
- The panel no longer hides an already-loaded note list during post-create, post-sign, post-addendum, or manual refresh cycles.
- When cached note rows exist, the panel now keeps the table visible and shows a secondary `Refreshing notes...` indicator instead of collapsing to a blank loading-only pane.
- Blocking `Loading notes...` remains only for the first-load case where no trustworthy note rows exist yet.

3. Updated `docs/runbooks/vista-rpc-notes.md` so the documented Notes panel contract includes refresh continuity during live TIU-backed refetches.

## Manual test steps
1. Open `http://127.0.0.1:3000/cprs/chart/46/notes` with a live clinician session using `PRO1234 / PRO1234!!`.
2. Create a note from `+ New Note`.
3. Confirm the success message includes the created note ID.
4. Confirm the existing note list remains visible while the live refresh is in flight.
5. Confirm the list converges to the refreshed live note set after the request settles.

## Verifier output
- Target verification: after a successful TIU-backed note create, the Notes panel keeps the current list visible and does not regress to a blank `Loading notes...` pane.

## Current blocker
- None for the Notes refresh continuity defect reproduced in this audit slice once the live browser verification is re-run.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 681 Update - CPRS Cover Sheet Allergies Broker Error Recovery

## What changed
1. Added the Phase 681 prompt set for allergies broker-error recovery:
- `prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-01-IMPLEMENT.md`
- `prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-99-VERIFY.md`

2. Hardened `GET /vista/allergies?dfn=` in `apps/api/src/server/inline-routes.ts`.
- The route no longer uses the legacy singleton broker lifecycle for this Cover Sheet read.
- The route now requires an authenticated session, runs through `safeCallRpc(...)`, and retries once if `ORQQAL LIST` returns broker/runtime contamination.
- If the retry still is not trustworthy, the route returns truthful integration-pending posture instead of manufacturing an allergy row from foreign broker text.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the parity runbook records the allergies broker-error guardrail.

## Manual test steps (validated)
1. Open `http://127.0.0.1:3000/cprs/chart/46/cover` with a live clinician session using `PRO1234 / PRO1234!!`.
2. Call `GET /vista/allergies?dfn=46` in the same authenticated session.
3. Confirm the route returns real allergy rows from `ORQQAL LIST` and no longer returns a fake row built from `Remote Procedure '...' doesn't exist on the server.`.
4. Reload the Cover Sheet and confirm the allergies card shows real allergy rows without false pending posture or leaked broker text.

## Verifier output
- Live API proof after the fix: `GET /vista/allergies?dfn=46` returned four real allergy rows for DFN 46 with `rpcUsed:"ORQQAL LIST"`.
- Live browser proof after reload: the Cover Sheet allergies card rendered `SULFONAMIDE/RELATED ANTIMICROBIALS`, `PEANUTS`, `PENICILLIN`, and `CODEINE`, and no leaked RPC error text remained in the page.
- Targeted diagnostics proof: `apps/api/src/server/inline-routes.ts` reported no errors after the route hardening.

## Current blocker
- None for the allergies broker-error rendering defect reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 680 Update - CPRS Cover Sheet Reminders Broker Error Recovery

## What changed
1. Added the Phase 680 prompt set for reminders broker-error recovery:
- `prompts/680-PHASE-680-CPRS-COVERSHEET-REMINDERS-BROKER-ERROR-RECOVERY/680-01-IMPLEMENT.md`
- `prompts/680-PHASE-680-CPRS-COVERSHEET-REMINDERS-BROKER-ERROR-RECOVERY/680-99-VERIFY.md`

2. Hardened `GET /vista/cprs/reminders?dfn=` in `apps/api/src/routes/cprs/wave1-routes.ts`.
- The route no longer maps arbitrary non-empty broker payload lines into reminder rows.
- Broker/runtime error payloads are detected, retried once, and then surfaced as truthful integration-pending posture instead of fake chart data.
- This prevents leaked strings such as `Remote Procedure 'ORWORB UNSIG ORDERS' doesn't exist on the server.` from appearing inside the clinician reminders table.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the parity runbook records the reminders broker-error guardrail.

## Manual test steps
1. Open `http://127.0.0.1:3000/cprs/chart/46/cover` with a live clinician session using `PRO1234 / PRO1234!!`.
2. Confirm the reminders card either shows real reminders, `No clinical reminders due`, or pending posture.
3. Confirm the reminders card no longer renders leaked broker error text as a reminder row.

## Verifier output
- Targeted API/browser verification after the fix should show truthful reminders posture only and no broker-error row in the Cover Sheet reminders card.

## Current blocker
- None for the reminders broker-error rendering defect once the live route/browser proof is re-run.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 679 Update - CPRS Cover Sheet Medication Truthfulness Recovery

## What changed
1. Added the Phase 679 prompt set for Cover Sheet medication truthfulness recovery:
- `prompts/679-PHASE-679-CPRS-COVERSHEET-MEDICATION-TRUTHFULNESS-RECOVERY/679-01-IMPLEMENT.md`
- `prompts/679-PHASE-679-CPRS-COVERSHEET-MEDICATION-TRUTHFULNESS-RECOVERY/679-99-VERIFY.md`

2. Corrected the initial Cover Sheet domain load in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`.
- Fresh browser instrumentation proved the first `GET /vista/medications?dfn=46` during the Cover Sheet burst could return a raw ORWPS-style medication row, while a later solitary refetch returned normalized medication data.
- The Cover Sheet now fetches its core cache-backed domains sequentially instead of firing them all concurrently on first load.
- This keeps the first medications request aligned with the normalized shared route truth and removes the need for a manual second fetch to converge the card.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the browser truthfulness contract records the sequential Cover Sheet prefetch requirement for medication stability.

## Manual test steps (validated)
1. Open `http://127.0.0.1:3000/cprs/chart/46/cover` in a fresh clinician session using `PRO1234 / PRO1234!!`.
2. Capture the first `GET /vista/medications?dfn=46` request during page load.
3. Confirm the first response already returns the normalized medication row.
4. Confirm the Active Medications card renders the same normalized medication name and sig without a manual refetch.

## Verifier output
- Fresh browser instrumentation before the fix captured a first-load `/vista/medications?dfn=46` response with a raw ORWPS-style row even though a second fetch in the same session returned normalized medication data.
- After the sequential prefetch fix, the Cover Sheet should converge on the normalized row on its initial live load.

## Current blocker
- None for the Cover Sheet medication truthfulness defect once the first-load live proof is re-run.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 678 Update - CPRS Cover Sheet Duplicate Key Recovery

## What changed
1. Added the Phase 678 prompt set for chart-shell duplicate key recovery:
- `prompts/678-PHASE-678-CPRS-COVER-SHEET-DUPLICATE-KEY-RECOVERY/678-01-IMPLEMENT.md`
- `prompts/678-PHASE-678-CPRS-COVER-SHEET-DUPLICATE-KEY-RECOVERY/678-99-VERIFY.md`

2. Corrected row key generation in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` and `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx`.
- Live browser verification on `/cprs/chart/46/cover` raised a Next.js runtime overlay reporting duplicate React keys such as `CDC` from chart-shell list rendering.
- The chart now derives composite row keys from row content plus fallback index instead of relying on weak raw identifiers or unstable generic keys.
- This keeps the rendered clinician content unchanged while preventing row duplication or omission during live updates.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the browser truthfulness contract records the stable-key requirement for Cover Sheet and immunization-derived rows.

## Manual test steps (validated)
1. Open `http://127.0.0.1:3000/cprs/chart/46/cover` with a live clinician session using `PRO1234 / PRO1234!!`.
2. Allow the Cover Sheet loaders to settle and confirm the runtime overlay no longer reports `Encountered two children with the same key`.
3. Open `http://127.0.0.1:3000/cprs/chart/46/immunizations` and confirm the page loads without the same duplicate-key runtime error.
4. Confirm the clinical content still renders truthfully after the key change.

## Verifier output
- Fresh immunizations page proof after the fix: the page loaded normally and browser inspection found no duplicate-key overlay text.
- Fresh cover tab proof after the fix: browser inspection after a settle delay found no duplicate-key overlay text and no `same key, \`CDC\`` runtime message.
- Targeted diagnostics proof: `CoverSheetPanel.tsx` and `ImmunizationsPanel.tsx` reported no new errors.

## Current blocker
- None for the duplicate-key runtime defect reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 677 Update - CPRS Reports Progress Notes Section Parity

## What changed
1. Added the Phase 677 prompt set for Reports Progress Notes section parity:
- `prompts/677-PHASE-677-CPRS-REPORTS-PROGRESS-NOTES-SECTION-PARITY/677-01-IMPLEMENT.md`
- `prompts/677-PHASE-677-CPRS-REPORTS-PROGRESS-NOTES-SECTION-PARITY/677-99-VERIFY.md`

2. Corrected the Reports catalog parser in `apps/api/src/server/inline-routes.ts`.
- Live verification showed `ORWRP REPORT LISTS` returns the `OR_PN` report row before the later `OR_PNMN` section heading, so the parser incorrectly left `Progress Notes` grouped under `Graphing (local only)`.
- The parser now preserves the raw VistA payload while explicitly remapping `OR_PN` into the dedicated `OR_PNMN` / `Progress Notes` section for the normalized report catalog used by the UI.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the Reports contract records the explicit `OR_PN` section recovery behavior.

## Manual test steps (validated)
1. Log in with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/reports?dfn=46` and confirm the `OR_PN` report row now returns `sectionId:"OR_PNMN"` and `sectionLabel:"Progress Notes"`.
3. Open `http://127.0.0.1:3000/cprs/chart/46/reports` and verify the grouped tree now shows a dedicated `Progress Notes` section.
4. Select `Progress Notes` and confirm the viewer still shows the existing TIU-backed fallback content.
5. Select `Procedures (local only)` and confirm Graphing/local-only behavior remains unchanged.

## Verifier output
- Live API proof after the fix: `GET /vista/reports?dfn=46` returned `OR_PN` with `sectionId:"OR_PNMN"` and `sectionLabel:"Progress Notes"` while preserving `rawReports` evidence showing the original `ORWRP REPORT LISTS` ordering.
- Live browser proof after the fix: the Reports tree now renders a dedicated `Progress Notes` heading and selecting `Progress Notes` shows `Progress Notes` as the viewer subtitle instead of `Graphing (local only)`.
- Regression proof: selecting `Procedures (local only)` still renders `Graphing (local only) • Local only` with the truthful local-only message.

## Current blocker
- None for the Reports tree grouping defect reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician audit on the next remaining chart workflow defect.

# Phase 676 Update - CPRS Cover Sheet Orders Summary Convergence Recovery

## What changed
1. Added the Phase 676 prompt set for Orders Summary convergence recovery:
- `prompts/676-PHASE-676-CPRS-COVERSHEET-ORDERS-SUMMARY-CONVERGENCE-RECOVERY/676-01-IMPLEMENT.md`
- `prompts/676-PHASE-676-CPRS-COVERSHEET-ORDERS-SUMMARY-CONVERGENCE-RECOVERY/676-99-VERIFY.md`

2. Corrected the shared orders recovery path in `apps/api/src/routes/cprs/orders-cpoe.ts`, `apps/api/src/routes/cprs/wave1-routes.ts`, and `apps/api/src/vista/rpcConnectionPool.ts`.
- Live Cover verification after Phase 675 showed Orders Summary still drifted from the Orders tab under real Cover reload load, even when other cards had become browser-truthful.
- `/vista/cprs/orders-summary` no longer uses its own bespoke unsigned-order parser. It now derives unsigned rows from the same normalized active-orders loader used by `/vista/cprs/orders`.
- The active-order enrichment sequence now runs atomically on one pooled DUZ-scoped connection for `ORWORR AGET`, `ORWORR GETBYIFN`, and `ORWORR GETTXT`, which stabilized order ID and text recovery during concurrent Cover bursts.
- Orders Summary now performs a one-shot retry when the normalized unsigned fallback transiently resolves empty during Cover reload pressure.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the parity runbook records the Orders Summary convergence contract and the sequence-locked recovery behavior.

## Manual test steps (validated)
1. Log in with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/cprs/orders?dfn=46&filter=active` and confirm the recovered active order set includes the unsigned discontinue order.
3. Call `GET /vista/cprs/orders-summary?dfn=46` and confirm it returns `source:"active-orders-fallback"`, `unsigned:1`, and the same truthful row with `id:"8207;8"`.
4. Open `http://127.0.0.1:3000/cprs/chart/46/cover` in a fresh browser session and reload the Cover Sheet.
5. Confirm the actual `/vista/cprs/orders-summary?dfn=46` network response matches the direct API truth and the Orders Summary card renders `1 unsigned order(s)` with the discontinue oxycodone row dated `2026-03-08`.

## Verifier output
- Live API proof after the final recovery: `GET /vista/cprs/orders-summary?dfn=46` returned `ok:true`, `status:"ok"`, `source:"active-orders-fallback"`, `unsigned:1`, and `recent:[{ id:"8207;8", ... date:"2026-03-08" }]`.
- Live browser proof after the fix: a fresh Cover reload produced the same `orders-summary` payload and the Cover DOM rendered `1 unsigned order(s)` with the same discontinue order row.
- Repo verifier check after implementation: API TypeScript compile passed, but the repo still has unrelated pre-existing failures in the phase index freshness gate and web compile (`apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` `TS18046: 'd' is of type 'unknown'`). Those verifier failures were not introduced by this API-side recovery.

## Current blocker
- None for the clinician-visible Orders Summary drift reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician chart audit on the next unresolved workflow after the shared Orders/Cover path.

# Phase 675 Update - CPRS Live Read Cache Truthfulness Recovery

## What changed
1. Added the Phase 675 prompt set for browser live-read cache truthfulness recovery:
- `prompts/675-PHASE-675-CPRS-LIVE-READ-CACHE-TRUTHFULNESS-RECOVERY/675-01-IMPLEMENT.md`
- `prompts/675-PHASE-675-CPRS-LIVE-READ-CACHE-TRUTHFULNESS-RECOVERY/675-99-VERIFY.md`

2. Corrected the browser live-read path in `apps/web/src/lib/fetch-with-correlation.ts`, `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`, and `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx`.
- Live Cover Sheet verification showed the browser could render older medication, notes, labs, immunization, and reminder payloads than the live API returned in the same authenticated session.
- The shared correlated fetch helper now defaults to `cache: 'no-store'`, and the Cover Sheet custom readers plus the standalone Immunizations panel now use that uncached path.

3. Tightened the shared medications backend in `apps/api/src/server/inline-routes.ts`.
- After the frontend no-store recovery, the Cover Sheet medication card still intermittently received an empty first-burst medications response while the next direct call returned the recovered medication row.
- The medications route now retries the order-derived fallback once before settling on an empty result, which keeps the Cover Sheet medication card aligned with the standalone Meds tab during concurrent chart loads.

4. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the parity runbook records the uncached browser read contract and the medications retry behavior.

## Manual test steps (validated)
1. Open a fresh authenticated session to `http://127.0.0.1:3000/cprs/chart/46/cover`.
2. Confirm the Cover Sheet now stabilizes to the current live chart truth:
	- Active Medications shows the recovered oxycodone row.
	- Recent Notes shows recent TIU notes.
	- Recent Labs remains truthfully empty.
	- Immunizations remains truthfully empty.
	- Clinical Reminders no longer bleed into Labs or other cards.
	- Orders Summary shows the live unsigned orders.
3. Call the live API routes in the same session and confirm they match the rendered cards:
	- `GET /vista/medications?dfn=46`
	- `GET /vista/notes?dfn=46`
	- `GET /vista/labs?dfn=46`
	- `GET /vista/immunizations?dfn=46`
	- `GET /vista/cprs/reminders?dfn=46`

## Verifier output
- Live browser proof before the fix: Cover Sheet reloads could show stale or mismatched card content, including false-empty medications and cross-card drift from older payloads.
- Live API proof during diagnosis: the same authenticated session returned newer truthful payloads directly from the API than the Cover Sheet initially rendered.
- Live browser proof after the fix: a fresh Cover Sheet reload now converges to the same truth as the live API, including the recovered medication row, TIU notes, truthful lab/immunization empties, grounded reminders, and live unsigned orders.

## Current blocker
- None for the Cover Sheet live-read truthfulness drift reproduced in this audit slice.

## Follow-ups
1. Continue the live clinician chart audit on the next unresolved chart workflow.

# Phase 674 Update - CPRS Reports Progress Notes Fallback

## What changed
1. Added the Phase 674 prompt set for the Reports Progress Notes recovery:
- `prompts/674-PHASE-674-CPRS-REPORTS-PROGRESS-NOTES-FALLBACK/674-01-IMPLEMENT.md`
- `prompts/674-PHASE-674-CPRS-REPORTS-PROGRESS-NOTES-FALLBACK/674-99-VERIFY.md`

2. Corrected the `Progress Notes` report read path in `apps/api/src/server/inline-routes.ts`.
- Live verification showed the Reports tree exposed `Progress Notes` as a normal live `ORWRP REPORT TEXT` entry (`id=OR_PN`), but `GET /vista/reports/text?dfn=46&id=OR_PN` returned `ok:true` with an empty string body.
- The same patient still had live TIU note documents and readable TIU note text.
- The reports text route now preserves `ORWRP REPORT TEXT` as the primary source, but when `OR_PN` returns blank content it falls back to live TIU data via `TIU DOCUMENTS BY CONTEXT` and `TIU GET RECORD TEXT` and returns explicit fallback provenance.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the Reports contract reflects the new live Progress Notes fallback behavior.

## Manual test steps (validated)
1. Log in with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/reports?dfn=46` and confirm the live catalog still includes `Progress Notes`.
3. Call `GET /vista/reports/text?dfn=46&id=OR_PN` and confirm it returns non-empty text with fallback provenance instead of an empty body.
4. Open `http://127.0.0.1:3000/cprs/chart/46/reports`, select `Progress Notes`, and confirm the viewer shows note content.

## Verifier output
- Live proof before the fix: `GET /vista/reports/text?dfn=46&id=OR_PN` returned `ok:true` with `text:""` and `rpcUsed:"ORWRP REPORT TEXT"`.
- Live TIU grounding proof before the fix: `GET /vista/notes?dfn=46` returned 25 note entries and `GET /vista/tiu-text?id=727` returned readable completed note text.

## Current blocker
- None for the blank Progress Notes report defect once the route is reloaded and re-verified.

## Follow-ups
1. Re-check whether any other `ORWRP REPORT TEXT` catalog entries consistently return blank content while equivalent chart data exists elsewhere.
2. Keep the Reports tree truthful by preferring explicit fallback provenance over empty `ok:true` report bodies.

# Phase 673 Update - CPRS Medications Route Orders Fallback

## What changed
1. Added the Phase 673 prompt set for the CPRS Medications route recovery:
- `prompts/673-PHASE-673-CPRS-MEDS-ROUTE-ORDERS-FALLBACK/673-01-IMPLEMENT.md`
- `prompts/673-PHASE-673-CPRS-MEDS-ROUTE-ORDERS-FALLBACK/673-99-VERIFY.md`

2. Corrected the shared medications read path in `apps/api/src/server/inline-routes.ts`.
- Live verification showed `GET /vista/medications?dfn=46` returned `count:0` from `ORWPS ACTIVE`, which caused the Meds tab to render `All (0)` and `No medications`.
- The same patient still had a live active medication order in CPRS Orders and a live recovered medication row in Nursing MAR.
- The medications route now preserves `ORWPS ACTIVE` as the primary path, but when that RPC returns no rows it falls back to live active CPRS medication orders from `ORWORR AGET`, enriched with `ORWORR GETBYIFN` and `ORWORR GETTXT`, and only includes rows that classify as medication orders.
- The route now returns explicit fallback provenance instead of silently reporting a false empty medication list.

3. Updated `docs/runbooks/vista-rpc-medications.md` so the documented route contract matches the live VEHU lane behavior.

## Manual test steps (validated)
1. Log in with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/medications?dfn=46` and confirm the response now returns the active medication instead of an empty list.
3. Open `http://127.0.0.1:3000/cprs/chart/46/meds`.
4. Confirm the Meds tab shows `All (1)` and renders the active medication row instead of `No medications`.

## Verifier output
- Live API proof before the fix: `GET /vista/medications?dfn=46` returned `count:0` with `rpcUsed:"ORWPS ACTIVE"`.
- Live Orders proof before the fix: `GET /vista/cprs/orders?dfn=46` still surfaced the active medication order `8207;1`.
- Live API proof after the fix: `GET /vista/medications?dfn=46` returned `count:1` with the active medication `XXX TAB OXYCODONE & ACETAMINOPHEN S.T. Quantity: 20 0 refills 1 AT BEDTIME` and `rpcUsed:["ORWPS ACTIVE","ORWORR AGET","ORWORR GETBYIFN","ORWORR GETTXT"]`.
- Live browser proof after the fix: `/cprs/chart/46/meds` now renders `All (1)` and shows the same active medication row instead of `No medications`.

## Current blocker
- None for the standalone Meds false-empty read-path defect.

## Follow-ups
1. Re-check Cover Sheet medication consumers after future medication-route changes because `/vista/medications` is a shared chart read path.
2. Continue the live clinician chart audit on the next unresolved tab workflow.

# Phase 672 Update - eMAR Nursing Schedule Orders Fallback

## What changed
1. Added the Phase 672 prompt set for the Nursing/eMAR schedule fallback defect:
- `prompts/672-PHASE-672-EMAR-NURSING-SCHEDULE-ORDERS-FALLBACK/672-01-IMPLEMENT.md`
- `prompts/672-PHASE-672-EMAR-NURSING-SCHEDULE-ORDERS-FALLBACK/672-99-VERIFY.md`

2. Corrected the eMAR read path in `apps/api/src/routes/emar/index.ts`.
- Live verification showed `GET /emar/schedule?dfn=46` returned an empty schedule because `ORWPS ACTIVE` produced no rows in this VEHU lane context.
- The CPRS Orders tab still showed a live active medication order for the same patient through the `ORWORR AGET` orders feed.
- The eMAR schedule route now preserves `ORWPS ACTIVE` as the primary path, but when that RPC returns no rows it falls back to live active medication orders from `ORWORR AGET`, enriched with `ORWORR GETBYIFN` and `ORWORR GETTXT`, and only includes rows that classify as medication orders.
- Schedule frequency and route remain heuristic and explicitly labeled as such because PSB timing RPCs are still unavailable in the sandbox.

## Manual test steps (validated)
1. Log in with `PRO1234 / PRO1234!!`.
2. Call `GET /emar/schedule?dfn=46` and confirm the response now includes the known active medication instead of an empty schedule.
3. Open `http://127.0.0.1:3000/cprs/chart/46/nursing` and switch to `MAR`.
4. Confirm the active medication row renders instead of `No active medications found for this patient.`

## Verifier output
- Live API proof before the fix: `GET /emar/schedule?dfn=46` returned `count:0` with `rpcUsed:["ORWPS ACTIVE"]`.
- Live VistA proof before the fix: a direct `ORWPS ACTIVE` probe for DFN `46` returned no active rows in this lane context.
- Live Orders proof before the fix: `GET /vista/cprs/orders?dfn=46` still surfaced an active medication order through the CPRS order feed.
- Live API proof after the fix: `GET /emar/schedule?dfn=46` returned `count:1` with the active medication `XXX TAB OXYCODONE & ACETAMINOPHEN S.T.` and `rpcUsed:["ORWPS ACTIVE","ORWORR AGET","ORWORR GETBYIFN","ORWORR GETTXT"]`.
- Live browser proof after the fix: `/cprs/chart/46/nursing` -> `MAR` now renders `Active Medication Schedule (1)` and shows `Order 8207 | Status active` instead of `No active medications found for this patient.`

## Current blocker
- None for the Nursing/eMAR empty-MAR read-path defect.

## Follow-ups
1. Re-run the live Nursing MAR UI and standalone eMAR read path after each future medication-route change so Orders and MAR stay aligned.

# Phase 671 Update - CPRS Reports Health Summary Disambiguation

## What changed
1. Added the Phase 671 prompt set for CPRS Reports Health Summary disambiguation:
- `prompts/671-PHASE-671-CPRS-REPORTS-HEALTH-SUMMARY-DISAMBIGUATION/671-01-IMPLEMENT.md`
- `prompts/671-PHASE-671-CPRS-REPORTS-HEALTH-SUMMARY-DISAMBIGUATION/671-99-VERIFY.md`

2. Corrected duplicate Health Summary label rendering in `apps/web/src/components/cprs/panels/ReportsPanel.tsx`.
- Live `GET /vista/reports?dfn=46` verification showed the two apparent duplicate `MED LIST` entries are actually distinct VistA Health Summary types: `h67` and `h66`.
- The panel previously rendered both as the same visible label, leaving clinicians with no way to distinguish which report subtype they were selecting.
- The qualifier normalization now preserves the live VistA label while appending the Health Summary token for duplicate labels, producing explicit choices such as `MED LIST (H67)` and `MED LIST (H66)`.

## Manual test steps (validated)
1. Open `http://127.0.0.1:3000/cprs/chart/46/reports` and sign in with `PRO1234 / PRO1234!!`.
2. Expand `Health Summary`.
3. Confirm the two live `MED LIST` options render as `MED LIST (H67)` and `MED LIST (H66)`.
4. Select each option and verify the viewer header remains explicit about the chosen subtype.

## Verifier output
- Live API proof: `GET /vista/reports?dfn=46` returned both `h67^MED LIST^^^^^1` and `h66^MED LIST^^^^^1` in the Health Summary type list.
- Browser proof after the fix: the Reports tree now renders `MED LIST (H67)` and `MED LIST (H66)` as separate visible choices.
- Browser proof after selection: the viewer header updated to `Health Summary — MED LIST (H67)` and `Health Summary — MED LIST (H66)` respectively, while loading live report text for each choice.

## Current blocker
- None for this Reports tree disambiguation defect.

## Follow-ups
1. Continue the live clinician chart audit on the next ambiguous or incomplete tab workflow.

# Phase 670 Update - CPRS Cover Sheet Problem Dedup Recovered

## What changed
1. Added the Phase 670 prompt set for CPRS Cover Sheet problem-dedup recovery:
- `prompts/670-PHASE-670-CPRS-COVERSHEET-PROBLEM-DEDUP-RECOVERY/670-01-IMPLEMENT.md`
- `prompts/670-PHASE-670-CPRS-COVERSHEET-PROBLEM-DEDUP-RECOVERY/670-99-VERIFY.md`

2. Corrected the shared problems fetch normalization in `apps/web/src/stores/data-cache.tsx`.
- Live API verification showed `/vista/problems?dfn=46` already returned unique problem IDs (`1787`, `1788`).
- The duplicate React key warning therefore came from the client-side data path, not the backend route contract.
- The shared problem fetcher now deduplicates records by `id` before storing them in the CPRS cache, so the Cover Sheet receives stable unique problem rows.

## Manual test steps (validated)
1. Log into the chart with `PRO1234 / PRO1234!!`.
2. Verify `GET /vista/problems?dfn=46` returns unique IDs.
3. Open `http://127.0.0.1:3000/cprs/chart/46/cover`.
4. Confirm the Active Problems section shows each problem once and the duplicate key warning is gone.

## Verifier output
- Live API proof: `GET /vista/problems?dfn=46` returned exactly two unique rows, `1787` and `1788`.
- Browser proof before the fix: `/cprs/chart/46/cover` logged duplicate React key `1787` and rendered repeated Sleep apnea rows.
- Browser proof after the fix: the Cover Sheet shows one `Sleep apnea` row and one `Posttraumatic stress disorder` row with no duplicate key warning.

## Current blocker
- None for this Cover Sheet problems duplication defect.

## Follow-ups
1. Continue the live clinician chart audit on the next post-login workflow defect instead of treating the login or Cover Sheet path as fully complete.

# Phase 669 Update - CPRS Login Lane Truthfulness Recovered

## What changed
1. Added the Phase 669 prompt set for CPRS login lane-truthfulness recovery:
- `prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-01-IMPLEMENT.md`
- `prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-99-VERIFY.md`

2. Corrected the CPRS login guidance in `apps/web/src/app/cprs/login/page.tsx`.
- Live browser verification showed the page still advertised legacy `PROV123 / PROV123!!` credentials even though the active VEHU lane only accepted `PRO1234 / PRO1234!!`.
- The development-mode placeholders now align with the verified VEHU clinician account.
- The helper panel now shows only the live-proven VEHU account and explicitly warns that legacy WorldVistA guidance may fail on this lane.

## Manual test steps (validated)
1. Open `http://127.0.0.1:3000/cprs/login` in an unauthenticated browser session.
2. Confirm the login form shows `PRO1234` and `PRO1234!!` instead of `PROV123` and `PROV123!!`.
3. Use the displayed credentials to sign in.
4. Verify the browser reaches the requested CPRS chart route.

## Verifier output
- Browser proof before the fix: the login page displayed `PROV123 / PROV123!!`, and sign-on with those credentials failed with `Authentication failed`.
- Browser proof after the fix: the login page displays the verified VEHU clinician account `PRO1234 / PRO1234!!` in development mode.
- Live sign-on proof: using the displayed VEHU account reaches `/cprs/chart/46/cover` successfully.

## Current blocker
- None for the login-lane truthfulness defect.

## Follow-ups
1. Continue the clinician chart audit on the next post-login workflow defect.

# Phase 668 Update - Nursing and eMAR TIU Fallback Writeback Verified

## What changed
1. Added the Phase 668 prompt set for nursing and eMAR TIU fallback verification:
- `prompts/668-PHASE-668-NURSING-EMAR-TIU-WRITEBACK-VERIFICATION/668-01-IMPLEMENT.md`
- `prompts/668-PHASE-668-NURSING-EMAR-TIU-WRITEBACK-VERIFICATION/668-99-VERIFY.md`

2. Corrected the TIU fallback writeback contract in `apps/api/src/routes/nursing/index.ts` and `apps/api/src/routes/emar/index.ts`.
- Both routes now write TIU text with the proven buffer shape `HDR: '1^1'` plus `TEXT,n,0` nodes and pass the trailing literal `0` expected by `TIU SET DOCUMENT TEXT`.
- Both routes now call `TIU GET RECORD TEXT` and reject false success if the expected body text does not read back from VEHU.

3. Corrected the nursing frontend-to-backend request contract in `apps/api/src/routes/nursing/index.ts`.
- Live testing showed the web UI sends clinician-entered administration context as `reason`, while the route only consumed `note`.
- The route now accepts `body.note || body.reason`, so the clinician-entered reason is preserved in the fallback TIU note.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c phase668-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = [regex]::Match($login, '"csrfToken":"([^"]+)"').Groups[1].Value
Set-Content -Path phase668-nursing.json -Value '{"dfn":46,"medicationId":8207,"action":"given","reason":"Phase 668 nursing proof"}' -NoNewline -Encoding ASCII
Set-Content -Path phase668-emar.json -Value '{"dfn":46,"orderIEN":"8207","action":"given","reason":"Phase 668 eMAR proof"}' -NoNewline -Encoding ASCII
curl.exe -s -b phase668-cookies.txt -X POST http://127.0.0.1:3001/vista/nursing/mar/administer -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@phase668-nursing.json"
curl.exe -s -b phase668-cookies.txt -X POST http://127.0.0.1:3001/emar/administer -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@phase668-emar.json"
curl.exe -s -b phase668-cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=14366"
curl.exe -s -b phase668-cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=14367"
Remove-Item login-body.json, phase668-nursing.json, phase668-emar.json, phase668-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- API restart proof: `Platform PG init` logged `ok:true`, `errors:[]`, `currentVersion:63`, with no `migration_failed` messages after the route patch.
- Live nursing proof: `POST /vista/nursing/mar/administer` returned `{ok:true, noteIen:"14366"}` with `rpcUsed:["TIU CREATE RECORD","TIU SET DOCUMENT TEXT","TIU GET RECORD TEXT"]`.
- Live nursing readback proof: `GET /vista/cprs/notes/text?ien=14366` returned `Med admin: 8207 - given - PHASE668 nursing reason UI contract ...`.
- Live eMAR proof: `POST /emar/administer` returned `{ok:true, noteIen:"14367"}` with `rpcUsed:["TIU CREATE RECORD","TIU SET DOCUMENT TEXT","TIU GET RECORD TEXT"]`.
- Live eMAR readback proof: `GET /vista/cprs/notes/text?ien=14367` returned `eMAR: given order 8207 - PHASE668 emar reason UI contract ...`.

## Current blocker
- None for TIU fallback body persistence in nursing/eMAR. The remaining production gap is still BCMA-native writeback through `PSB MED LOG`, which is not registered in VEHU.

## Follow-ups
1. Audit any remaining non-CPRS callers of `TIU SET DOCUMENT TEXT` for the old shell-note pattern.
2. Keep the UI messaging explicit that TIU fallback is a documented interim path until BCMA-native writeback is available.

# Phase 667 Update - CPRS Notes Live TIU Persistence Restored

## What changed
1. Fixed the XWB LIST serializer in both `apps/api/src/vista/rpcBrokerClient.ts` and `apps/api/src/vista/rpcConnectionPool.ts`.
- Compound TIU text keys now serialize as valid MUMPS subscripts like `"TEXT",1,0` instead of the broken quoted whole-string form `"TEXT,1,0"`.
- Numeric TIU create fields like `1202` and `1301` now remain numeric instead of being incorrectly quoted as string subscripts.

2. Restored the authoritative `TIU CREATE RECORD` contract in `apps/api/src/routes/cprs/wave2-routes.ts`.
- The route now uses the known-good 9-parameter Phase 7B sequence instead of the drifted 5-parameter variant.
- The route now rejects `documentIen = 0` as a create failure instead of attempting text persistence against a non-note.

3. Corrected the Notes persistence truth gate in `apps/api/src/routes/cprs/wave2-routes.ts` and `apps/api/src/routes/cprs/tiu-notes.ts`.
- Success is now based on real TIU readback content, not only `Line Count`, because VEHU can return `Line Count: None` even when the note body exists.
- Signed-note addendum creation remains live; unsigned-parent addendum requests degrade truthfully to draft.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c notes-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = [regex]::Match($login, '"csrfToken":"([^"]+)"').Groups[1].Value
Set-Content -Path create-body.json -Value '{"dfn":"46","titleIen":"10","noteText":"Broker fix live test line 1\nBroker fix live test line 2"}' -NoNewline -Encoding ASCII
curl.exe -s -b notes-cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/notes/create -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@create-body.json"
curl.exe -s -b notes-cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=14359"
Set-Content -Path addendum-body.json -Value '{"dfn":"46","parentDocIen":"727","noteText":"Signed parent addendum regression line 1\nSigned parent addendum regression line 2"}' -NoNewline -Encoding ASCII
curl.exe -s -b notes-cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/notes/addendum -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@addendum-body.json"
Remove-Item login-body.json, create-body.json, addendum-body.json, notes-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Live create proof: `POST /vista/cprs/notes/create` returned `{ok:true, mode:"real", status:"created", documentIen:"14359"}` for DFN 46 with title IEN `10`.
- Live readback proof: `GET /vista/cprs/notes/text?ien=14359` returned both entered body lines.
- Live addendum proof: `POST /vista/cprs/notes/addendum` against signed parent `727` returned `{ok:true, status:"addendum-created", addendumIen:"14361"}`.
- Live unsigned-parent truthfulness proof: `POST /vista/cprs/notes/addendum` against unsigned parent `14359` now returns truthful draft fallback instead of a false `note_text_write_failed` blocker.

## Current blocker
- Addenda for unsigned parent notes are still not VistA-native in VEHU. The route now reports that state truthfully by saving a draft instead of claiming a live TIU addendum was created.

## Follow-ups
1. Audit the other `TIU SET DOCUMENT TEXT` callers outside CPRS Notes, especially nursing and eMAR note-write paths, because they were exposed to the same broker key-encoding defect.
2. Decide whether unsigned-note addendum requests should remain draft-backed or be explicitly blocked with a signed-parent requirement in the UI.

# Phase 667 Summary - CPRS Notes Body Persistence Recovery

## What changed
1. Added the Phase 667 prompt set for CPRS Notes body-persistence recovery:
- `prompts/667-PHASE-667-CPRS-NOTES-BODY-PERSISTENCE-RECOVERY/667-01-IMPLEMENT.md`
- `prompts/667-PHASE-667-CPRS-NOTES-BODY-PERSISTENCE-RECOVERY/667-99-VERIFY.md`

2. Corrected the Notes-panel success contract in `apps/api/src/routes/cprs/wave2-routes.ts`, `apps/api/src/routes/cprs/tiu-notes.ts`, and `apps/web/src/components/cprs/panels/NotesPanel.tsx`.
- Live browser and API auditing showed `POST /vista/cprs/notes/create` returned real TIU IENs and refreshed the list, but `TIU GET RECORD TEXT` and `TIU DETAILED DISPLAY` still showed header-only shell notes with `Line Count: 0`.
- Direct RPC probing confirmed `TIU SET DOCUMENT TEXT` can return an apparent success payload like `14354^1^1` in VEHU while the note body still is not persisted.
- The Notes create and addendum flows now verify TIU readback before reporting success. If VEHU only creates a shell note/addendum, the backend returns a structured blocked status and the UI surfaces that blocker instead of claiming the note was created.

3. Updated `docs/runbooks/vista-rpc-notes.md` so the Notes truthfulness contract explicitly requires readback-visible body lines after TIU create/addendum flows and forbids treating shell-note creation as success.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c notes-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json" | ConvertFrom-Json
curl.exe -s -b notes-cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/notes/create -H "Content-Type: application/json" -H "X-CSRF-Token: $($login.csrfToken)" -d '{"dfn":"46","titleIen":"10","noteText":"Phase 667 verification note body."}'
curl.exe -s -b notes-cookies.txt "http://127.0.0.1:3001/vista/cprs/notes?dfn=46"
curl.exe -s -b notes-cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=<newIen>"
Remove-Item login-body.json, notes-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Live browser proof before the fix: the Notes panel acknowledged note creation and refreshed new rows (`14352`, `14353`, `14354`), but selecting those notes showed only TIU header metadata with no entered body text.
- Live API proof before the fix: `GET /vista/cprs/notes/text?ien=14352` and `?ien=14354` returned only the TIU header block.
- Direct RPC proof: `TIU DETAILED DISPLAY` for note `14354` showed `Line Count: 0`, and `TIU SET DOCUMENT TEXT` returned `14354^1^1` without persisting body lines.
- Editor validation: the touched backend and frontend files remained free of new workspace diagnostics after the patch.

## Current blocker
- VEHU still appears to accept shell TIU note creation without persisting body text. The patch converts that unsafe false success into an explicit blocker, but the underlying TIU write contract still needs deeper VistA-native remediation.

## Follow-ups
1. Re-run the live create and addendum flows and confirm the UI now blocks shell-note success instead of falsely reporting creation.
2. Continue TIU-native investigation to determine the missing finalization step after `TIU SET DOCUMENT TEXT` in VEHU.

# Phase 666 Summary - CPRS Cover Sheet Sequential Prefetch Truthfulness Recovery

## What changed
1. Added the Phase 666 prompt set for CPRS Cover Sheet sequential-prefetch truthfulness recovery:
- `prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-01-IMPLEMENT.md`
- `prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-99-VERIFY.md`

2. Corrected the Cover Sheet preload path in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`.
- Live chart auditing showed the Cover Sheet fetched its core domains in a strict serial sequence.
- That allowed later sections such as Vitals and Recent Notes to render false empty states simply because their requests had not started yet.
- The same sequencing also let Cover Sheet navigation poison the Notes workflow by forcing Notes to wait behind earlier chart fetches.
- The panel now starts each core Cover Sheet domain independently so each section reports its own truthful loading, empty, or populated state.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cover-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cover-cookies.txt "http://127.0.0.1:3001/vista/medications?dfn=46"
curl.exe -s -b cover-cookies.txt "http://127.0.0.1:3001/vista/vitals?dfn=46"
curl.exe -s -b cover-cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
Remove-Item login-body.json, cover-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker proof: `vehu` and `ve-platform-db` were both healthy during the fix verification run
- API proof: `GET /health` returned `ok:true` with `platformPg.ok:true`
- Endpoint proof: `GET /vista/vitals?dfn=46` returned `ok:true` with 5 live vital rows for DFN 46
- Endpoint proof: `GET /vista/notes?dfn=46` returned `ok:true` with 9 live TIU note rows for DFN 46
- Browser proof: `/cprs/chart/46/cover` now shows `Loading...` for Vitals and Recent Notes immediately after chart load instead of falsely showing `No vitals recorded` or `No notes on record` before those requests start
- Browser proof: navigating from Cover Sheet to Notes now resolves to the live 9-note list instead of remaining stuck on `Loading notes...`
- Repo verifier: `scripts/verify-latest.ps1` still fails only at `G02 Phase Index Freshness` because of the separate duplicate-phase/index debt (`614`), not because of Phase 666

## Current blocker
- None for this Cover Sheet truthfulness defect. The remaining repository verifier failure is unrelated phase-index hygiene debt.

## Follow-ups
1. Continue the clinician chart audit on the next Cover Sheet or Notes workflow that still shows path-dependent latency or truthfulness drift.

# Phase 665 Summary - CPRS Order Discontinue Pending Visibility Recovery

## What changed
1. Added the Phase 665 prompt set for CPRS Order Discontinue pending-visibility recovery:
- `prompts/665-PHASE-665-CPRS-ORDER-DC-PENDING-VISIBILITY-RECOVERY/665-01-IMPLEMENT.md`
- `prompts/665-PHASE-665-CPRS-ORDER-DC-PENDING-VISIBILITY-RECOVERY/665-99-VERIFY.md`

2. Corrected the Orders discontinue `syncPending` branch in `apps/web/src/components/cprs/panels/OrdersPanel.tsx`.
- Live DFN 46 verification showed `POST /vista/cprs/orders/dc` can truthfully return a pending unsigned discontinue outcome.
- Before the fix, the panel showed the pending banner but did not refresh the live VistA orders list, so the new unsigned discontinue request remained invisible until the clinician manually clicked `Refresh`.
- The panel now refreshes the VistA orders list immediately after the pending discontinue response while preserving the truthful warning that the original order may remain active until the discontinue order is signed.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c orders-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b orders-cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46"
Remove-Item login-body.json, orders-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Browser proof: `/cprs/chart/46/orders` still shows the truthful pending banner when ORWDXA DC creates an unsigned discontinue request instead of fully ending the source order
- Browser proof: the active Orders list continues to show unsigned discontinue entries as `unsigned`, not `active`
- Live audit context: the DFN 46 sandbox already contained one unsigned discontinue request from the prior manual replay, so the follow-up replay could not use a fresh count delta as proof of the auto-refresh path; verification therefore relied on the patched branch, clean diagnostics, and the already-confirmed live refreshed list shape
- Editor validation: `OrdersPanel.tsx` and the touched CPRS route files remain free of new workspace diagnostics

## Current blocker
- None for this pending-visibility Orders defect. The remaining clinical truth is that the original order can stay active until the unsigned discontinue order is signed in VistA.

## Follow-ups
1. Continue the clinician chart audit on the next remaining high-value Orders or Notes writeback workflow.

# Phase 664 Summary - CPRS Reports Empty Viewer Truthfulness Recovery

## What changed
1. Added the Phase 664 prompt set for CPRS Reports empty-viewer truthfulness recovery:
- `prompts/664-PHASE-664-CPRS-REPORTS-EMPTY-VIEWER-TRUTHFULNESS-RECOVERY/664-01-IMPLEMENT.md`
- `prompts/664-PHASE-664-CPRS-REPORTS-EMPTY-VIEWER-TRUTHFULNESS-RECOVERY/664-99-VERIFY.md`

2. Corrected the Reports viewer in `apps/web/src/components/cprs/panels/ReportsPanel.tsx`.
- Live validation showed the Dept. of Defense `Imaging` report returned `{"ok":true,"text":""}` from `/vista/reports/text`.
- The panel treated that empty string as valid display content and rendered a silent blank `<pre>` block.
- The viewer now shows an explicit truthful empty-state message when VistA returns no report text for the selected report.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c reports-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b reports-cookies.txt "http://127.0.0.1:3001/vista/reports?dfn=46"
curl.exe -s -b reports-cookies.txt "http://127.0.0.1:3001/vista/reports/text?dfn=46&id=OR_R18"
Remove-Item login-body.json, reports-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Browser proof: `/cprs/chart/46/reports` still loads the live grouped report catalog and still renders populated reports such as `BRIEF CLINICAL`
- Browser proof: selecting `Imaging` no longer leaves a silent blank viewer and now shows an explicit explanation that no report text was returned from VistA in this environment
- Endpoint proof: `GET /vista/reports/text?dfn=46&id=OR_R18` returned `ok:true` with an empty string body, matching the new truthful viewer message
- Editor validation: `ReportsPanel.tsx` remains free of new workspace diagnostics

## Current blocker
- None for this Reports empty-viewer truthfulness defect.

## Follow-ups
1. Continue the clinician chart audit on the next remaining interactive report or order workflow.

# Phase 663 Summary - CPRS Telehealth Ended Room Truthfulness Recovery

## What changed
1. Added the Phase 663 prompt set for CPRS Telehealth ended-room truthfulness recovery:
- `prompts/663-PHASE-663-CPRS-TELEHEALTH-ENDED-ROOM-TRUTHFULNESS-RECOVERY/663-01-IMPLEMENT.md`
- `prompts/663-PHASE-663-CPRS-TELEHEALTH-ENDED-ROOM-TRUTHFULNESS-RECOVERY/663-99-VERIFY.md`

2. Corrected the Telehealth chart status strip in `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`.
- Phase 662 fixed the create-room drift by binding the strip to `/telehealth/rooms` stats.
- Live follow-up verification exposed that ended rooms still contributed to `Total`, while the Active Rooms list intentionally hid ended rooms.
- The panel now shows `Ended` explicitly so the strip truthfully explains why `Total` can remain non-zero when no active rooms are visible.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c telehealth-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b telehealth-cookies.txt http://127.0.0.1:3001/telehealth/rooms
Remove-Item login-body.json, telehealth-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Browser proof: `/cprs/chart/46/telehealth` now shows `Created: 1 | Waiting: 0 | Active: 0 | Ended: 0 | Total: 1` when one created room is visible
- Browser proof: after ending that room, the Active Rooms list becomes empty and the strip now truthfully shows `Created: 0 | Waiting: 0 | Active: 0 | Ended: 1 | Total: 1`
- Endpoint proof: `GET /telehealth/rooms` returned `rooms: []` with `stats.ended: 1`, matching the updated strip after end
- Editor validation: `TelehealthPanel.tsx` remains free of new workspace diagnostics

## Current blocker
- None for this Telehealth ended-room truthfulness defect.

## Follow-ups
1. Continue the clinician chart audit on the next remaining interactive chart workflow.

# Phase 662 Summary - CPRS Telehealth Room Stats Truthfulness Recovery

## What changed
1. Added the Phase 662 prompt set for CPRS Telehealth room stats truthfulness recovery:
- `prompts/662-PHASE-662-CPRS-TELEHEALTH-ROOM-STATS-TRUTHFULNESS-RECOVERY/662-01-IMPLEMENT.md`
- `prompts/662-PHASE-662-CPRS-TELEHEALTH-ROOM-STATS-TRUTHFULNESS-RECOVERY/662-99-VERIFY.md`

2. Corrected the Telehealth chart status strip in `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`.
- Before the fix, the clinician could create a room successfully and see it in Active Rooms, but the status strip could still show contradictory counters such as `Active: 0 | Waiting: 0 | Total: 2` until the tab remounted.
- The panel was treating the provider health payload as the displayed room-counter source even though the rendered room list already had its own authoritative `/telehealth/rooms` payload and stats.
- The panel now stores room stats from `/telehealth/rooms` alongside the rendered list and explicitly shows `Created`, `Waiting`, `Active`, and `Total` counts from that same payload.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c telehealth-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b telehealth-cookies.txt http://127.0.0.1:3001/telehealth/rooms
curl.exe -s -b telehealth-cookies.txt http://127.0.0.1:3001/telehealth/health
Remove-Item login-body.json, telehealth-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Browser proof: `/cprs/chart/46/telehealth` still creates a room from a real selected telehealth appointment and still renders the created room in the Active Rooms list
- Truthfulness proof: the provider status strip now uses the same room-list stats source and explicitly shows `Created` room counts instead of drifting away from the visible room list
- Editor validation: `TelehealthPanel.tsx` remains free of new workspace diagnostics

## Current blocker
- None for this Telehealth room-stats truthfulness defect.

## Follow-ups
1. Continue the clinician chart audit on the next remaining interactive chart workflow.

# Phase 661 Summary - CPRS Labs Transition Selector Truthfulness Recovery

## What changed
1. Added the Phase 661 prompt set for CPRS Labs transition selector truthfulness recovery:
- `prompts/661-PHASE-661-CPRS-LABS-TRANSITION-SELECTOR-TRUTHFULNESS-RECOVERY/661-01-IMPLEMENT.md`
- `prompts/661-PHASE-661-CPRS-LABS-TRANSITION-SELECTOR-TRUTHFULNESS-RECOVERY/661-99-VERIFY.md`

2. Corrected the Labs workflow transition controls in `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- Before the fix, invalid lifecycle transitions such as `pending -> resulted` correctly failed on the backend but left the Orders transition dropdown visually stuck on the attempted target state.
- The transition controls were uncontrolled selects, so the browser retained the invalid selected value even though the order status remained `pending`.
- The panel now uses controlled transition selections for orders and specimens and resets the selector back to `Transition...` in `finally`, preserving truthful UI state on both success and failure.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c reports-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b reports-cookies.txt "http://127.0.0.1:3001/vista/reports/text?dfn=46&id=9&qualifier=d7^One%20Week"
Remove-Item login-body.json, reports-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Browser proof: `/cprs/chart/46/labs` Orders view still creates workflow orders and still shows the backend validation error `Cannot transition from pending to resulted` for invalid transitions
- Truthfulness proof: after the failed transition, the Orders dropdown now resets to `Transition...` while the row status remains `pending`
- Editor validation: `LabsPanel.tsx` remains free of new workspace diagnostics

## Current blocker
- None for this Labs selector-truthfulness defect.

## Follow-ups
1. Continue the clinician chart audit on the remaining interactive write flows.

# Phase 660 Summary - CPRS Nursing Tasks Tab Truthfulness Recovery

## What changed
1. Added the Phase 660 prompt set for CPRS Nursing Tasks tab truthfulness recovery:
- `prompts/660-PHASE-660-CPRS-NURSING-TASKS-TAB-TRUTHFULNESS-RECOVERY/660-01-IMPLEMENT.md`
- `prompts/660-PHASE-660-CPRS-NURSING-TASKS-TAB-TRUTHFULNESS-RECOVERY/660-99-VERIFY.md`

2. Corrected the Nursing chart Task List rendering in `apps/web/src/components/cprs/panels/NursingPanel.tsx`.
- Before the fix, the panel always showed a static placeholder about future BCMA/PSB task derivation even when `/vista/nursing/tasks` had already returned a truthful live response.
- The backend route was already deriving task posture from `ORWPS ACTIVE` and returning a structured `_note`, `rpcUsed`, and `pendingTargets` payload.
- The panel now renders returned task rows when present, shows a truthful live empty state when no tasks exist, and only shows pending messaging when the backend actually reports pending targets.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c nursing-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b nursing-cookies.txt http://127.0.0.1:3001/vista/nursing/tasks?dfn=46
Remove-Item login-body.json, nursing-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Live backend proof: `GET /vista/nursing/tasks?dfn=46` returned `{"ok":true,"source":"vista","items":[],"rpcUsed":["ORWPS ACTIVE"],"pendingTargets":[],"_note":"Tasks derived from ORWPS ACTIVE..."}`
- Browser proof: `/cprs/chart/46/nursing` now shows the live ORWPS-derived note and RPC/source footer instead of the stale generic placeholder
- Editor validation: `NursingPanel.tsx` remains free of new workspace diagnostics

## Current blocker
- None for this Nursing Tasks truthfulness defect. BCMA-specific task depth remains an explicit sandbox limitation, but the clinician UI now reflects the actual live route state.

## Follow-ups
1. Continue the clinician chart audit from the remaining interactive chart panels.

# Phase 659 Summary - CPRS Meds Quick-Order Recovery

## What changed
1. Added the Phase 659 prompt set for CPRS Meds quick-order recovery:
- `prompts/659-PHASE-659-CPRS-MEDS-QUICK-ORDER-RECOVERY/659-01-IMPLEMENT.md`
- `prompts/659-PHASE-659-CPRS-MEDS-QUICK-ORDER-RECOVERY/659-99-VERIFY.md`

2. Corrected the live Meds quick-order contract in `apps/api/src/routes/cprs/wave2-routes.ts`.
- Before the fix, `POST /vista/cprs/meds/quick-order` called `ORWDXM AUTOACK` without the required location IEN.
- That caused VEHU to return raw runtime text like `M ERROR=AUTOACK+4^ORWDXM ... LVUNDEF`, and the route incorrectly treated that payload as a successful order.
- The route now uses the grounded four-argument AUTOACK contract, rejects runtime-text payloads as failures, and only reports success when a real unsigned order IEN is returned.
- If VEHU still does not create a live order, the route now returns a clean blocker response and saves a server-side draft for follow-up instead of leaking raw broker text.

3. Updated `apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx` so the Meds modal shows the backend’s clinician-safe success message for real unsigned orders.

4. Updated `docs/runbooks/vista-rpc-add-medication.md` so the documented AUTOACK contract explicitly requires `LocationIEN` and documents runtime-text rejection.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c meds-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
Set-Content -Path meds-body.json -Value '{"dfn":"46","quickOrderIen":1628}' -NoNewline -Encoding ASCII
curl.exe -s -b meds-cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/meds/quick-order -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d "@meds-body.json"
Remove-Item login-body.json, meds-body.json, meds-cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `{"ok":true,...,"platformPg":{"ok":true}}`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live failure proof before fix: `POST /vista/cprs/meds/quick-order` returned `{"ok":true,"mode":"real",...,"response":"M ERROR=AUTOACK+4^ORWDXM..."}` for DFN `46` quick order `1628`
- Recovery target: after the fix, the same route must either return a truthful unsigned live order or a clean blocker response without raw `AUTOACK+4^ORWDXM` text
- Editor validation: touched backend and frontend files should remain free of new workspace diagnostics

## Current blocker
- Live post-fix verification still depends on the running API process reloading the edited route implementation.

## Follow-ups
1. Continue the clinician chart audit from the Meds workflow after re-verifying quick-order behavior in the UI.

# Phase 658 Summary - CPRS Notes Sign Error Recovery

## What changed
1. Added the Phase 658 prompt set for CPRS Notes sign error recovery:
- `prompts/658-PHASE-658-CPRS-NOTES-SIGN-ERROR-RECOVERY/658-01-IMPLEMENT.md`
- `prompts/658-PHASE-658-CPRS-NOTES-SIGN-ERROR-RECOVERY/658-99-VERIFY.md`

2. Corrected the live Notes sign failure contract in `apps/api/src/routes/cprs/tiu-notes.ts`.
- Before the fix, `POST /vista/cprs/notes/sign` returned raw `TIU SIGN RECORD` text directly to the frontend.
- Incorrect e-signature attempts surfaced mangled clinician-facing output such as `89250005[routine]ou have entered an incorrect Electronic Signature Code...Try again!`.
- The route now normalizes known TIU sign failures into structured statuses like `sign-blocked` with clean messages, while still preserving truthful note state and retry behavior.

3. Updated `apps/web/src/components/cprs/panels/NotesPanel.tsx` so the Notes sign dialog handles structured sign statuses the same way Orders already does.
- Invalid e-signature attempts now show a clean blocking message.
- The entered e-signature value is cleared after failed attempts instead of remaining in the password field.

4. Updated `docs/clinical/writeback-scope-matrix.md` so the TIU sign fallback contract explicitly states that UI errors must be clean and clinician-readable.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- Browser proof: `/cprs/chart/46/notes` still loads live TIU notes and note text after the change
- Live sign failure proof: signing unsigned note `14349` with `PRO1234!!` now returns a clean clinician-facing blocker message instead of mangled raw broker text
- Safety proof: failed TIU sign attempts remain truthful and leave the note unsigned; no fake success was introduced
- Editor validation: the touched backend and frontend files compiled cleanly via workspace diagnostics

## Current blocker
- The sandbox electronic signature for this TIU sign path still rejects `PRO1234!!`; this fix normalizes the failure but does not change the underlying VistA credential truth.

## Follow-ups
1. Continue the clinician chart audit after restoring production-grade Notes sign failure messaging.

# Phase 655 Summary - CPRS Chart Session Redirect Recovery

## What changed
1. Added the Phase 655 prompt set for CPRS chart session redirect recovery:
- `prompts/655-PHASE-655-CPRS-CHART-SESSION-REDIRECT-RECOVERY/655-01-IMPLEMENT.md`
- `prompts/655-PHASE-655-CPRS-CHART-SESSION-REDIRECT-RECOVERY/655-99-VERIFY.md`

2. Fixed the unauthenticated chart-shell failure in `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`.
- Before the fix, an expired or missing clinician session still rendered the CPRS chart shell, left the patient banner stuck on `Loading patient ...`, and let panels spam protected API routes until they degraded into `401 Unauthorized` errors.
- The chart route now redirects unauthenticated users to `/cprs/login` and preserves the intended chart path through a `redirect` query parameter.
- Patient selection and bulk chart prefetch are now gated behind a ready authenticated session instead of firing while logged out.

3. Updated `apps/web/src/app/cprs/login/page.tsx` so successful sign-in returns the clinician to the original safe CPRS route instead of always dumping them on patient search.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

## Verifier output
- Browser proof: opening `http://127.0.0.1:3000/cprs/chart/46/reports` without an active clinician session now redirects to `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Freports`
- Login proof: signing in with `PRO1234 / PRO1234!!` returns the browser to `/cprs/chart/46/reports`
- Auth proof: browser fetch to `/auth/session` after login returned `{"ok":true,"authenticated":true,...}`
- Reports proof: browser fetch to `/vista/reports?dfn=46` after login returned `200 OK` with `17` report types and the Reports panel rendered the live grouped catalog
- Editor validation: both edited frontend files compiled cleanly via workspace diagnostics

## Current blocker
- None for this chart-session recovery defect.

## Follow-ups
1. Continue the clinician chart audit from the Reports workflow now that the stale-session failure mode no longer masks real report defects.

# Phase 654 Summary - CPRS Orders Sign Recovery

## What changed
1. Added the Phase 654 prompt set for CPRS Orders sign recovery:
- `prompts/654-PHASE-654-CPRS-ORDERS-SIGN-RECOVERY/654-01-IMPLEMENT.md`
- `prompts/654-PHASE-654-CPRS-ORDERS-SIGN-RECOVERY/654-99-VERIFY.md`

2. Corrected the live Orders sign contract in `apps/api/src/routes/cprs/orders-cpoe.ts`.
- The route no longer uses `ORWOR1 SIG` as the normal sign path for ordinary unsigned orders.
- It now gates with `ORWD1 SIG4ONE` and `ORWOR1 CHKDIG`, signs ordinary orders through `ORWDX SEND` using a true LIST parameter, and keeps PKI-only digital-sign cases as structured blockers instead of fake success.
- Raw `%YDB-E-*` and other VistA runtime internals remain withheld from the clinician UI.

3. Updated `docs/runbooks/canonical-clinical-journeys.md` and `config/capabilities.json` so the documented capability matches the live verified route contract.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/dc -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -H "Idempotency-Key: dc-46-8207-1-6" -d '{"dfn":"46","orderId":"8207;1"}'
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/sign -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -H "Idempotency-Key: sign-46-8207-7-1" -d '{"dfn":"46","orderIds":["8207;7"],"esCode":"PRO1234!!"}'
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46&filter=all"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `{"ok":true,...,"platformPg":{"ok":true}}`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live discontinue proof: `POST /vista/cprs/orders/dc` created unsigned order `8207;7` for DFN `46`
- Live sign proof: `POST /vista/cprs/orders/sign` returned `{"ok":true,"mode":"real","status":"signed",...}` for order `8207;7`
- Safety proof: raw VistA runtime text no longer leaks to the clinician response payload when sign attempts fail

## Current blocker
- None for ordinary e-sign order signing in the verified discontinue-sign flow.

## Follow-ups
1. Wire a real PKI payload path before advertising digital-sign order support through the same sign endpoint.

# Phase 653 Summary - CPRS Telehealth Chart Launch Recovery

## What changed
1. Added the Phase 653 prompt set for CPRS Telehealth chart launch recovery:
- `prompts/653-PHASE-653-CPRS-TELEHEALTH-CHART-LAUNCH-RECOVERY/653-01-IMPLEMENT.md`
- `prompts/653-PHASE-653-CPRS-TELEHEALTH-CHART-LAUNCH-RECOVERY/653-99-VERIFY.md`

2. Fixed the clinician Telehealth chart workflow in `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`.
- Before the fix, the chart tab hardcoded `canCreateRoom = false` and always sent an empty `appointmentId`, so `New Video Visit` could never launch a room.
- The backend telehealth lifecycle routes were already healthy, and DFN `46` had multiple live `Telehealth Clinic` appointment references available from `/vista/cprs/appointments?dfn=46`.
- The panel now loads live chart appointments, filters launchable telehealth entries, auto-selects a real appointment reference, and creates rooms with that selected `appointmentId`.

3. Updated `docs/runbooks/phase30-telehealth.md` so the chart launch contract explicitly documents the CPRS-side appointment-list-to-room flow.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/appointments?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/telehealth/rooms"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/telehealth/health"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- Telehealth provider health: `{"ok":true,"provider":"Jitsi","healthy":true,...}`
- Live appointment grounding: `GET /vista/cprs/appointments?dfn=46` returned multiple `Telehealth Clinic` entries, including `req-1-mmg6ue0l`
- Browser proof: `/cprs/chart/46/telehealth` now renders a real telehealth appointment list and preselects a launchable appointment
- Create proof: clicking `New Video Visit` created room `ve-42a8400e9c8bb0544e614b8e` for appointment `req-1-mmg6ue0l`
- Join proof: the chart entered visit mode with a live iframe and backend room state transitioned to `waiting`
- End proof: ending the visit from the chart returned `/telehealth/rooms` to an empty active-room list
- Editor validation: `TelehealthPanel.tsx` compiled cleanly via workspace diagnostics

## Current blocker
- None for this Telehealth chart launch defect.

## Follow-ups
1. Continue the clinician chart audit after restoring the Telehealth appointment-list-to-room launch path.

# Phase 652 Summary - CPRS Labs Workflow Lifecycle Recovery

## What changed
1. Added the Phase 652 prompt set for CPRS lab workflow lifecycle recovery:
- `prompts/652-PHASE-652-CPRS-LABS-WORKFLOW-LIFECYCLE-RECOVERY/652-01-IMPLEMENT.md`
- `prompts/652-PHASE-652-CPRS-LABS-WORKFLOW-LIFECYCLE-RECOVERY/652-99-VERIFY.md`

2. Fixed the deep lab workflow lifecycle contract in `apps/api/src/lab/lab-store.ts` and `apps/api/src/lab/lab-routes.ts`.
- Before the fix, recording a result created `/lab/results` data and a critical alert, but the source `/lab/orders` entry remained stuck in `pending` with no `resultedAt`.
- That left the CPRS Labs workflow internally inconsistent and kept `/lab/dashboard` reporting the order as pending after a result already existed.
- Result capture now validates that the source order exists, rejects cancelled orders, and advances the order into a truthful post-result state while preserving higher-order states like `reviewed`, `verified`, and `final`.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the Labs workflow contract explicitly documents lifecycle advancement after result capture.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/lab/orders?dfn=46"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/lab/results -H "Content-Type: application/json" -H "X-CSRF-Token: <browser-token>" -d "{...}"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/lab/results?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/lab/dashboard"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live workflow proof: after recording a result for the workflow lab order, `GET /lab/orders?dfn=46` now shows the order in `resulted` state with `resultedAt` populated
- Dashboard proof: `GET /lab/dashboard` no longer counts that order under `pendingOrders` once a result exists
- Browser proof: the Labs Orders view now reflects the updated lifecycle instead of leaving the originating order stuck in `pending`

## Current blocker
- None for this lab workflow lifecycle defect.

## Follow-ups
1. Continue the clinician chart audit after restoring internal consistency across the deep Labs workflow.

# Phase 651 Summary - CPRS Cover Sheet Appointments Request Hygiene Recovery

## What changed
1. Added the Phase 651 prompt set for CPRS Cover Sheet appointments request hygiene recovery:
- `prompts/651-PHASE-651-CPRS-COVERSHEET-APPOINTMENTS-REQUEST-HYGIENE-RECOVERY/651-01-IMPLEMENT.md`
- `prompts/651-PHASE-651-CPRS-COVERSHEET-APPOINTMENTS-REQUEST-HYGIENE-RECOVERY/651-99-VERIFY.md`

2. Fixed the appointments merge contract in `apps/api/src/adapters/scheduling/vista-adapter.ts`.
- `GET /vista/cprs/appointments?dfn=46` was including a locally stored `cancel_request` placeholder with empty clinic/date fields.
- That malformed request row produced a junk Cover Sheet appointments entry with `—` for both date and clinic.
- The scheduling adapter now only converts clinician-usable request entries into appointment rows and excludes cancel-request placeholders that do not describe a real appointment row.

3. Updated `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` so appointments display readable chart timestamps instead of raw ISO strings.

4. Updated `docs/runbooks/scheduling-vista-sd.md` so the cover-sheet appointments contract explicitly documents the filtered request hygiene and display formatting behavior.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/appointments?dfn=46"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live route proof: `GET /vista/cprs/appointments?dfn=46` no longer returns the blank cancellation placeholder row
- Browser proof: `/cprs/chart/46/cover` no longer shows the junk `— / — / request pending / Request` row, and request timestamps render as readable chart date/times
- Editor validation: scheduling adapter and Cover Sheet files compiled cleanly via workspace diagnostics

## Current blocker
- None for this cover-sheet appointments hygiene defect.

## Follow-ups
1. Continue the clinician chart audit after restoring clean request-row hygiene in the Cover Sheet appointments card.

# Phase 650 Summary - CPRS Surgery Primary-Case Fallback Recovery

## What changed
1. Added the Phase 650 prompt set for CPRS surgery primary-case fallback recovery:
- `prompts/650-PHASE-650-CPRS-SURGERY-PRIMARY-CASE-FALLBACK-RECOVERY/650-01-IMPLEMENT.md`
- `prompts/650-PHASE-650-CPRS-SURGERY-PRIMARY-CASE-FALLBACK-RECOVERY/650-99-VERIFY.md`

2. Fixed the surgery detail recovery path in `apps/api/src/server/inline-routes.ts`.
- The primary case row for DFN `69` (`id=10021`) loaded from `ORWSR LIST`, but `ORWSR ONECASE` returned a VEHU runtime error and left the Surgery panel stuck on a red unavailable banner.
- The linked surgery document rows (`3572`, `3571`, `3570`) were still valid and resolvable, but the fallback probe inside the same request was not recovering them reliably after the initial runtime error.
- The route now forces a clean broker disconnect before re-probing `ORWSR LIST` and each sibling `ORWSR ONECASE` candidate so the primary case can recover through the linked document path it already exposes.

3. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the surgery detail contract explicitly documents the clean reconnect behavior after a case-header M error.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/surgery?dfn=69"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/surgery/detail?id=10021&dfn=69"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live list proof: `GET /vista/surgery?dfn=69` returned four surgery rows for patient `69`
- Live recovery proof: `GET /vista/surgery/detail?id=10021&dfn=69` now resolves through the linked surgery document path and returns operative text plus detailed display instead of the unavailable banner path
- Browser proof: `/cprs/chart/69/surgery` now shows the resolved operative report when selecting `LEFT INGUINAL HERNIA REPAIR WITH MESH`
- Editor validation: `inline-routes.ts` compiled cleanly via workspace diagnostics

## Current blocker
- None for this surgery defect once the reconnect-backed fallback is in place.

## Follow-ups
1. Continue the clinician chart audit after restoring truthful surgery detail recovery for primary case rows.

# Phase 649 Summary - CPRS Cover Sheet Orders Summary Truthfulness Recovery

## What changed
1. Added the Phase 649 prompt set for CPRS Cover Sheet orders summary truthfulness recovery:
- `prompts/649-PHASE-649-CPRS-COVERSHEET-ORDERS-SUMMARY-TRUTHFULNESS-RECOVERY/649-01-IMPLEMENT.md`
- `prompts/649-PHASE-649-CPRS-COVERSHEET-ORDERS-SUMMARY-TRUTHFULNESS-RECOVERY/649-99-VERIFY.md`

2. Fixed the stale backend summary contract in `apps/api/src/routes/cprs/wave1-routes.ts`.
- `GET /vista/cprs/orders-summary?dfn=` previously depended only on `ORWORB UNSIG ORDERS`.
- In VEHU that RPC is unavailable, so the Cover Sheet stayed permanently integration-pending even though the recovered Orders tab could already prove unsigned orders via `ORWORR AGET` plus enrichment.
- The route now falls back to the recovered active-orders path (`ORWORR AGET`, `ORWORR GETTXT`, `ORWORR GETBYIFN`) and returns live unsigned order rows when they can be derived truthfully.

3. Updated `docs/runbooks/phase56-wave1-layout.md` so the Orders Summary card contract reflects the new fallback behavior.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders-summary?dfn=46"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live Orders proof: `GET /vista/cprs/orders?dfn=46` returned two live orders including one unsigned discontinue medication order
- Live Cover Sheet summary proof: `GET /vista/cprs/orders-summary?dfn=46` now returns the live unsigned order count and recent unsigned row instead of permanent `integration-pending`
- Browser proof: `/cprs/chart/46/cover` now surfaces the same unsigned order posture already visible on `/cprs/chart/46/orders`
- Editor validation: `wave1-routes.ts` compiled cleanly via workspace diagnostics

## Current blocker
- None for this specific cover sheet defect; the issue was a stale backend summary dependency after the deeper Orders recovery.

## Follow-ups
1. Continue the clinician chart audit after restoring truthful Cover Sheet orders-summary behavior.

# Phase 648 Summary - CPRS Notes Status Truthfulness Recovery

## What changed
1. Added the Phase 648 prompt set for CPRS Notes status truthfulness recovery:
- `prompts/648-PHASE-648-CPRS-NOTES-STATUS-TRUTHFULNESS-RECOVERY/648-01-IMPLEMENT.md`
- `prompts/648-PHASE-648-CPRS-NOTES-STATUS-TRUTHFULNESS-RECOVERY/648-99-VERIFY.md`

2. Fixed the clinician-facing TIU status classifier in `apps/web/src/components/cprs/panels/NotesPanel.tsx`.
- The Notes panel previously checked for `signed` before `unsigned`, so live VistA statuses like `unsigned` were falsely rendered as `Signed`.
- The panel now classifies `unsigned` and `uncosigned` first and uses the same corrected logic for both the list badge and the selected-note Sign action.

3. Updated `docs/runbooks/vista-rpc-notes.md` so the Notes panel truthfulness contract explicitly documents the unsigned-before-signed requirement.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/tiu-text?id=14349"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live backend proof: `GET /vista/notes?dfn=46` returned note `14349` with `status:"unsigned"`, and `GET /vista/tiu-text?id=14349` returned TIU text showing `STATUS: UNSIGNED`
- Browser proof: `/cprs/chart/46/notes` previously mislabeled the same note as `Signed`; after the UI fix it reflects the live unsigned posture truthfully
- Editor validation: `NotesPanel.tsx` compiled cleanly via workspace diagnostics

## Current blocker
- None for this specific status-label defect; the issue was a frontend substring classifier bug, not a missing VistA capability.

## Follow-ups
1. Continue the clinician chart audit after restoring truthful TIU note status display.

# Phase 647 Summary - CPRS Labs Order Message Truthfulness Recovery

## What changed
1. Added the Phase 647 prompt set for CPRS Labs order message truthfulness recovery:
- `prompts/647-PHASE-647-CPRS-LABS-ORDER-MESSAGE-TRUTHFULNESS-RECOVERY/647-01-IMPLEMENT.md`
- `prompts/647-PHASE-647-CPRS-LABS-ORDER-MESSAGE-TRUTHFULNESS-RECOVERY/647-99-VERIFY.md`

2. Fixed the clinician-facing quick lab request message path in `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- The panel now preserves truthful backend draft and sync-pending responses from `POST /vista/cprs/orders/lab`.
- `ok:false` responses with `mode:"draft"`, `status:"unsupported-in-sandbox"`, or `status:"sync-pending"` now show the backend `message` or `pendingNote` instead of the generic `Lab request failed` string.
- The message tone now distinguishes real errors from honest sandbox posture.

3. Updated `docs/runbooks/vista-rpc-add-lab-order.md` so the UI contract matches the real VEHU order-entry posture.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/lab -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d '{"dfn":"46","labTest":"CBC"}'
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live backend proof: `POST /vista/cprs/orders/lab` for `dfn=46`, `labTest:"CBC"` returned a truthful draft posture with `mode:"draft"`, `status:"unsupported-in-sandbox"`, and an explicit clinician-facing message about missing lab quick-order configuration
- Browser proof: `/cprs/chart/46/labs` Orders now shows the draft/unsupported sandbox message from the backend instead of `Lab request failed`
- Editor validation: `LabsPanel.tsx` compiled cleanly via workspace diagnostics

## Current blocker
- Default VEHU still lacks configured LRZ lab quick orders, so free-text lab requests remain draft-only until a lane provides a valid `quickOrderIen`.

## Follow-ups
1. Continue the clinician chart audit after Labs now that the quick-order message path is truthful.

# Phase 617 Summary - CPRS Orders Active Order Recovery

## What changed
1. Added the Phase 617 prompt set for CPRS orders active order recovery:
- `prompts/617-PHASE-617-CPRS-ORDERS-ACTIVE-ORDER-RECOVERY/617-01-IMPLEMENT.md`
- `prompts/617-PHASE-617-CPRS-ORDERS-ACTIVE-ORDER-RECOVERY/617-99-VERIFY.md`

2. Rebuilt the active-orders read contract in `apps/api/src/routes/cprs/orders-cpoe.ts`.
- `GET /vista/cprs/orders?dfn=` no longer exposes raw `ORWORR AGET` fragments as clinician-facing order text.
- The route now enriches live rows with `ORWORR GETBYIFN` and `ORWORR GETTXT`, normalizes dates and status, infers order type, preserves `raw` and `rawDetail`, and reports per-order `rpcUsed`.
- Placeholder rows are filtered out rather than shown as broken chart content, with the excluded count surfaced explicitly.

3. Rebuilt `apps/web/src/components/cprs/panels/OrdersPanel.tsx` so live VistA orders are chart-usable.
- Live VistA orders are now selectable and render in the same detail pane as local drafts while staying visually distinct.
- The panel now shows recovered provider/package/text-source metadata for live orders.
- The panel now exposes truthful Verify and Flag actions for selected live orders instead of trapping them in a read-only table.

4. Updated parity documentation and RPC governance.
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the recovered Orders read/write contract.
- `apps/api/src/vista/rpcRegistry.ts` now registers `ORWORR GETBYIFN` for the new active-order enrichment path.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/ready
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"

curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46"

Set-Content -Path order-verify-body.json -Value '{"dfn":46,"orderId":"8207;1","verifyAction":"E"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/verify -H "Content-Type: application/json" -H "X-CSRF-Token: <csrfToken>" -d "@order-verify-body.json"

Set-Content -Path order-flag-body.json -Value '{"dfn":46,"orderId":"8207;1","flagReason":"Phase 617 verification"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/flag -H "Content-Type: application/json" -H "X-CSRF-Token: <csrfToken>" -d "@order-flag-body.json"

Remove-Item login-body.json, cookies.txt, order-verify-body.json, order-flag-body.json -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API readiness: `{"ok":true,"vista":"reachable","circuitBreaker":"closed"...}` after restart
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live orders proof: `GET /vista/cprs/orders?dfn=46` returned `ok:true`, `count:1`, `excludedRawCount:1`, and one recovered medication order with readable text, provider `PROVIDER,ONEHUNDREDFIVE`, `packageRef:"PSO"`, `orderType:"med"`, and `rpcUsed:["ORWORR AGET","ORWORR GETBYIFN","ORWORR GETTXT"]`
- Live verify proof: `POST /vista/cprs/orders/verify` for `8207;1` returned `{"ok":true,"mode":"real","status":"verified"...}` via `ORWDXA VERIFY`
- Live flag proof: `POST /vista/cprs/orders/flag` for `8207;1` returned `{"ok":true,"mode":"real","status":"flagged"...}` via `ORWDXA FLAG`
- Editor validation: `orders-cpoe.ts`, `OrdersPanel.tsx`, and `rpcRegistry.ts` compiled cleanly via workspace diagnostics

## Current blocker
- Integrated browser verification of the refreshed Orders panel was not run in this pass, so the live curl proofs currently cover backend truthfulness and the UI changes remain editor-validated rather than browser-validated.

## Follow-ups
1. Open the clinician chart route for DFN 46 and confirm the recovered live-order selection and action controls behave correctly in the rendered CPRS shell.

# Phase 616 Summary - CPRS Immunizations Panel Depth Recovery

## What changed
1. Added the Phase 616 prompt set for CPRS immunizations panel depth recovery:
- `prompts/616-PHASE-616-CPRS-IMMUNIZATIONS-PANEL-DEPTH-RECOVERY/616-01-IMPLEMENT.md`
- `prompts/616-PHASE-616-CPRS-IMMUNIZATIONS-PANEL-DEPTH-RECOVERY/616-99-VERIFY.md`

2. Rebuilt `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx` around the live Phase 65 backend instead of the earlier thin list-only UI.
- The panel now has three explicit clinician views: patient History, live Catalog, and Add Workflow posture.
- History continues to read from `/vista/immunizations?dfn=` and stays truthful when VEHU has no immunization rows for DFN 46.
- Catalog now uses `/vista/immunizations/catalog` and surfaces the live PXVIMM type-picker payload as Imm IDs, Brands, and Groups instead of leaving that depth hidden.
- The add action no longer presents a dead disabled control; it routes to an explicit PX SAVE DATA posture view that explains what encounter context is still required before writeback is safe.

3. Updated parity documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the immunization history route, the immunization catalog route, and the recovered chart-tab behavior.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/immunizations?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/immunizations/catalog"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live immunization history proof: `GET /vista/immunizations?dfn=46` returned `ok:true`, `count:0`, and `rpcUsed:["ORQQPX IMMUN LIST"]`, which is a truthful empty patient-history response from VEHU rather than a placeholder
- Live catalog proof: `GET /vista/immunizations/catalog` returned `ok:true`, `count:613`, and `rpcUsed:["PXVIMM IMM SHORT LIST"]` with real VistA type-picker rows
- Browser proof: `/cprs/chart/46/immunizations` renders the recovered panel, History/Catalog/Add Workflow view switching works, and the former dead add button now routes to explicit writeback posture; the integrated browser session still hit the existing broader API-auth issue, so route curls remain the live-data proof for this phase
- Editor validation: `ImmunizationsPanel.tsx` compiled cleanly via workspace diagnostics

## Current blocker
- VEHU returned no patient immunization rows for DFN 46 during live verification, and PX SAVE DATA writeback is still intentionally pending until safe encounter-context grounding is proven.

## Follow-ups
1. Continue the chart-gap audit with Nursing and the remaining newer CPRS tabs now that Labs, ADT, and Immunizations have all been recovered to truthful chart depth.

# Phase 615 Summary - CPRS ADT Panel Depth Recovery

## What changed
1. Added the Phase 615 prompt set for CPRS ADT panel depth recovery:
- `prompts/615-PHASE-615-CPRS-ADT-PANEL-DEPTH-RECOVERY/615-01-IMPLEMENT.md`
- `prompts/615-PHASE-615-CPRS-ADT-PANEL-DEPTH-RECOVERY/615-99-VERIFY.md`

2. Rebuilt `apps/web/src/components/cprs/panels/ADTPanel.tsx` around the live Phase 137 backend instead of the older shallow list-only UI.
- The panel now leads with live Census and Movements views.
- Census uses `/vista/adt/census` for ward summary and ward-detail drill-down.
- Movements uses `/vista/adt/movements?dfn=` and keeps the VEHU partial-history limitation explicit.
- Admit/transfer/discharge remain visibly integration-pending against the DGPM targets instead of pretending to write successfully.

3. Fixed chart-shell module gating so recovered tabs are reachable.
- `apps/web/src/stores/tenant-context.tsx` now resolves chart-tab slugs like `adt`, `nursing`, `intake`, `tasks`, `aiassist`, and `immunizations` against their owning system modules.
- `apps/api/src/config/tenant-config.ts` now includes those chart tabs in the default enabled-module set for tenant config consistency.

4. Updated parity documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the ADT census and movements contract and notes the corrected chart gating behavior.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/adt/wards"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/adt/census"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/adt/movements?dfn=46"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live ADT census proof: `GET /vista/adt/census` returned `ok:true`, `count:29`, `rpcUsed:["ORQPT WARDS","ORQPT WARD PATIENTS"]`, and live ward counts from VEHU
- Live ADT movements proof: `GET /vista/adt/movements?dfn=46` returned `ok:true`, `rpcUsed:["ORWPT16 ADMITLST"]`, and an honest `_note` that full movement history still depends on `ZVEADT MVHIST`
- Browser proof: `/cprs/chart/46/adt` now renders the recovered ADT panel, census hydrates from VistA, ward click drill-down loads detail, and the Movements tab shows the truthful partial-history posture instead of a disabled-module blocker
- Editor validation: `ADTPanel.tsx`, `tenant-context.tsx`, and `tenant-config.ts` all compiled cleanly via workspace diagnostics

## Current blocker
- Full transfer and discharge movement history is still limited by the missing custom `ZVEADT MVHIST` RPC in VEHU, so the Movements tab currently surfaces admissions-only posture when the standard route has no richer events.

## Follow-ups
1. Audit the next chart-facing parity gap now that Labs and ADT are both live and reachable in the clinician UI.

# Phase 614 Summary - CPRS Labs Panel Recovery

## What changed
1. Added the Phase 614 prompt set for CPRS Labs panel recovery:
- `prompts/614-PHASE-614-CPRS-LABS-PANEL-RECOVERY/614-01-IMPLEMENT.md`
- `prompts/614-PHASE-614-CPRS-LABS-PANEL-RECOVERY/614-99-VERIFY.md`

2. Restored the missing web panel implementation in `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
- The chart route and panel barrel were already wired to `LabsPanel`, but the file itself was missing.
- The new panel keeps live VistA lab reads on the Results tab through the shared cache-backed `/vista/labs?dfn=` contract.
- The panel adds inline result acknowledgement, a workflow Orders view, specimen lifecycle view, critical alert view, and writeback posture view over the existing `/lab/*` backend.

3. Updated parity documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the restored Labs panel contract and the `/lab/*` workflow endpoints it surfaces.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/labs?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/lab/orders?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/lab/writeback-posture"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live labs proof: `GET /vista/labs?dfn=46` returned `ok:true`, `rpcUsed:"ORWLRR INTERIM"`, and an honest `No Data Found` response from VEHU instead of a placeholder panel
- Deep workflow proof: `GET /lab/orders?dfn=46` returned `ok:true`
- Writeback posture proof: `GET /lab/writeback-posture` returned `ok:true` with posture entries including `ORWDX SAVE`, `ORWLRR ACK`, `LR VERIFY`, and `ORWLRR CHART`
- Browser proof: the real CPRS route `/cprs/chart/46/labs` rendered the recovered Labs panel, tab switching worked, and creating a workflow order through the UI succeeded for `CBC`
- Editor validation: `LabsPanel.tsx` compiled cleanly via workspace diagnostics

## Current blocker
- VEHU returned `No Data Found` for `GET /vista/labs?dfn=46` during manual verification, so the Results tab is truthful but currently empty for that patient in this sandbox.

## Follow-ups
1. Investigate whether another VEHU patient exposes richer ORWLRR interim result data so the Results tab can be demonstrated with non-empty live lab rows during parity verification.

# Phase 613 Summary - CPRS Clinical Procedures Read Parity

## What changed
1. Added the Phase 613 prompt set for CPRS Clinical Procedures read parity:
- `prompts/613-PHASE-613-CPRS-CLINICAL-PROCEDURES-READ-PARITY/613-01-IMPLEMENT.md`
- `prompts/613-PHASE-613-CPRS-CLINICAL-PROCEDURES-READ-PARITY/613-99-VERIFY.md`

2. Replaced the blanket placeholder backend in `apps/api/src/routes/clinical-procedures/index.ts` with live read behavior:
- `GET /vista/clinical-procedures?dfn=` now probes `TIU IDENTIFY CLINPROC CLASS`, attempts `TIU DOCUMENTS BY CONTEXT`, and truthfully falls back to `ORQQCN LIST` when VEHU has no TIU Clinical Procedures documents
- `GET /vista/clinical-procedures/:id?kind=` now resolves live detail through `ORQQCN DETAIL` for consult-backed rows and can resolve TIU-backed detail when Clinical Procedures TIU documents exist
- `GET /vista/clinical-procedures/consult-link?dfn=&consultId=` now returns live consult candidates plus selected consult detail from `ORQQCN LIST` and `ORQQCN DETAIL`
- `GET /vista/clinical-procedures/medicine?dfn=` remains honestly integration-pending with explicit MD-package grounding instead of fake data

3. Rebuilt `apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx` so the panel is no longer a permanent pending banner:
- Results now show a live list/detail browser
- Consult Link now shows live read-only consult candidates and selected detail
- Medicine stays clearly marked pending because the sandbox does not expose useful MD-package patient result data
- the panel explicitly surfaces fallback provenance and `rpcUsed` so the user can see whether data came from TIU Clinical Procedures or consult-tracked records

4. Updated parity documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the Clinical Procedures list/detail/consult-link/medicine contract
- `docs/parity-coverage-report.md` now tracks Clinical Procedures as real read parity via TIU/consult fallback instead of a blanket pending gap

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
$login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3001/auth/login' -ContentType 'application/json' -Body $loginBody -SessionVariable session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/clinical-procedures?dfn=69' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/clinical-procedures/395?kind=consult' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/clinical-procedures/consult-link?dfn=69&consultId=395' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/clinical-procedures/medicine?dfn=69' -WebSession $session
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health after restart: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live Clinical Procedures results proof: `GET /vista/clinical-procedures?dfn=69` returned `count:3`, `source:"vista-consults-fallback"`, `classIen:"838"`, and `rpcUsed:["TIU IDENTIFY CLINPROC CLASS","TIU DOCUMENTS BY CONTEXT","ORQQCN LIST"]`
- Live Clinical Procedures detail proof: `GET /vista/clinical-procedures/395?kind=consult` returned full consult-linked procedure detail text from `ORQQCN DETAIL`
- Live consult-link proof: `GET /vista/clinical-procedures/consult-link?dfn=69&consultId=395` returned the live consult list plus full selected detail with `rpcUsed:["ORQQCN LIST","ORQQCN DETAIL"]`
- Live medicine proof: `GET /vista/clinical-procedures/medicine?dfn=69` remained `integration-pending` with explicit MD-package grounding and no fake results
- Web TypeScript compile: PASS
- API TypeScript compile: PASS
- Phase index regeneration: PASS (`node scripts/build-phase-index.mjs`)
- Generated phase QA specs refresh: PASS (`node scripts/generate-phase-qa.mjs`)
- `scripts/verify-latest.ps1`: PASS

## Current blocker
- VEHU exposes the Clinical Procedures TIU class (`838`) but no patient TIU Clinical Procedures documents for DFN 69, and the MD package does not expose useful patient-scoped medicine result data in this sandbox. The panel now handles that honestly by using consult-backed reads where available and keeping Medicine pending.

## Follow-ups
1. Audit the next CPRS depth gap that still has truthful but incomplete sandbox behavior, especially domains that still rely on integration-pending read/write gaps after Clinical Procedures parity.

# Phase 612 Summary - CPRS Surgery Detail and Operative Report Parity

## What changed
1. Added the Phase 612 prompt set for CPRS surgery detail and operative report parity:
- `prompts/612-PHASE-612-CPRS-SURGERY-DETAIL-OPERATIVE-REPORT-PARITY/612-01-IMPLEMENT.md`
- `prompts/612-PHASE-612-CPRS-SURGERY-DETAIL-OPERATIVE-REPORT-PARITY/612-99-VERIFY.md`

2. Extended the surgery API contract in `apps/api/src/server/inline-routes.ts`:
- `GET /vista/surgery` now returns `caseNum` alongside the live `ORWSR LIST` case rows
- `GET /vista/surgery/detail?id=&dfn=` now follows the CPRS-native read path: `ORWSR ONECASE`, then linked TIU note resolution through `TIU GET RECORD TEXT` and `TIU DETAILED DISPLAY`
- when the VEHU sandbox throws `GETONE+5^ORWSR` on a case-header row like `10021`, the route reconnects, probes sibling surgery rows for the same patient, and truthfully resolves through the linked operative note row instead of faking a report

3. Rebuilt `apps/web/src/components/cprs/panels/SurgeryPanel.tsx` so selecting a surgery case loads live detail instead of a permanent integration-pending banner:
- the panel now fetches `GET /vista/surgery/detail?id=&dfn=` on selection
- it renders linked document metadata, linked note id, operative report text, and TIU detailed display when available
- when detail had to be resolved through a linked document row, the UI says so explicitly
- when no TIU note resolves, the panel stays truthful and shows that no operative note text was resolved

4. Corrected surgery truthfulness metadata in `apps/web/src/stores/data-cache.tsx` so fallback targets name the real list RPC: `ORWSR LIST`

5. Updated surgery parity documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents `GET /vista/surgery/detail?id=&dfn=` and the VEHU case-header fallback behavior
- `docs/parity-coverage-report.md` now treats surgery as full read parity with operative report detail and adds the new API endpoint to inventory

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
$login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3001/auth/login' -ContentType 'application/json' -Body $loginBody -SessionVariable session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/surgery?dfn=69' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/surgery/detail?id=10021&dfn=69' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/surgery/detail?id=3572&dfn=69' -WebSession $session
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\api
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health after restart: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live surgery list proof: `GET /vista/surgery?dfn=69` returned `count:4` from `ORWSR LIST`
- Live surgery detail proof for case header `10021`: `ok:true`, `resolvedFromId:"3572"`, `noteId:"3572"`, returned full operative report text and TIU detailed display, `rpcUsed:["ORWSR ONECASE","ORWSR LIST","TIU GET RECORD TEXT","TIU DETAILED DISPLAY"]`
- Live surgery detail proof for note row `3572`: `ok:true`, `noteId:"3572"`, returned full operative report text and TIU detailed display, `rpcUsed:["ORWSR ONECASE","TIU GET RECORD TEXT","TIU DETAILED DISPLAY"]`
- Web TypeScript compile: PASS
- API TypeScript compile: PASS
- Phase index regeneration: PASS (`node scripts/build-phase-index.mjs`)
- Generated phase QA specs refresh: PASS (`node scripts/generate-phase-qa.mjs`)
- `scripts/verify-latest.ps1`: PASS (15/15 gates)

## Current blocker
- VEHU still throws `GETONE+5^ORWSR` when `ORWSR ONECASE` is called on some case-header rows directly. The API now handles that honestly for read parity by resolving through linked document rows, but this remains a sandbox-side ORWSR defect rather than an app-side feature gap.

## Follow-ups
1. Audit the next remaining CPRS depth gap that still relies on honest limitations, likely advanced report tree parity, remote report browsing, or another panel where sandbox-specific VistA behavior still leaks through.

# Phase 611 Summary - CPRS Reports Tree and Qualifier Parity

## What changed
1. Added the Phase 611 prompt set for CPRS Reports tree and qualifier parity:
- `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-01-IMPLEMENT.md`
- `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-99-VERIFY.md`

2. Upgraded the reports API contract in `apps/api/src/server/inline-routes.ts`:
- `GET /vista/reports` now returns grouped CPRS report metadata (`sectionId`, `sectionLabel`, `qualifierType`, `localOnly`) instead of only a thin flat catalog
- the same route now returns parsed `dateRangeOptions` and `hsTypeOptions` alongside the actionable report entries
- `GET /vista/reports/text` now parses CPRS qualifier tokens (`d*`, `h*`, `i*`) and explicit `alpha/omega` ranges into the native `ORWRP REPORT TEXT` parameter slots
- the route now returns a `resolved` block so live verification can prove exactly which VistA arguments were used

3. Rebuilt `apps/web/src/components/cprs/panels/ReportsPanel.tsx` from a flat list into a grouped CPRS-style browser:
- report entries are grouped by live VistA section labels
- Health Summary now expands into real VistA Health Summary type children sourced from the live catalog
- date-range reports now prompt for a live qualifier instead of blindly calling report text with missing parameters
- custom date ranges now collect start/end dates and flow them through `alpha/omega`
- the existing Phase 18C imaging block was preserved and kept on the same screen

4. Extended the shared report model in `apps/web/src/stores/data-cache.tsx` so the UI can consume grouped report metadata without losing the existing cache truthfulness contract

5. Updated report documentation:
- `docs/runbooks/vista-rpc-phase12-parity.md` now documents the grouped catalog and qualifier-aware `ORWRP REPORT TEXT` contract
- `docs/parity-coverage-report.md` no longer treats Health Summary/date-range report selection as an unresolved parity gap; the remaining honest gap is advanced ORWRP3 remote/tree parity

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
$login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3001/auth/login' -ContentType 'application/json' -Body $loginBody -SessionVariable session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports?dfn=46' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports/text?dfn=46&id=11&qualifier=d30^One Month' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports/text?dfn=46&id=1&qualifier=h10^BRIEF CLINICAL^^^^^1' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports/text?dfn=46&id=11&qualifier=dS^Date Range...&alpha=2026-03-01&omega=2026-03-08' -WebSession $session
```

```powershell
Set-Location apps\web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health after restart: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live reports catalog proof: `ok:true`, `count:17`, grouped `sections`, parsed `dateRangeOptions`, parsed `hsTypeOptions`, `rpcUsed:"ORWRP REPORT LISTS"`
- Live date-range proof: `ok:true`, `resolved.daysBack:"30"`, `rpcUsed:"ORWRP REPORT TEXT"`
- Live Health Summary proof: `ok:true`, `resolved.hsType:"10"`, returned real BRIEF CLINICAL VistA text, `rpcUsed:"ORWRP REPORT TEXT"`
- Live custom-range proof: `ok:true`, `resolved.alpha:"3260301.000000"`, `resolved.omega:"3260308.000000"`, `rpcUsed:"ORWRP REPORT TEXT"`
- Web TypeScript compile: PASS
- API TypeScript compile: PASS
- Phase index regeneration: PASS (Phase 611 included)
- `scripts/verify-latest.ps1`: PASS after phase-index refresh

## Current blocker
- The Reports surface is now qualifier-aware and grouped, but exact CPRS `ORWRP3 EXPAND COLUMNS` parity and HDR/remote-site-specific report browsing are still deeper follow-on work.

## Follow-ups
1. Audit the next remaining CPRS feature-depth gap where the UI still advertises an honest limitation, starting with surgical report/detail retrieval (`ORWSR RPTLIST`/`ORWSR ONECASE`/TIU detail) or advanced remote report browsing.

# Phase 610 Summary - CPRS Phase 12 Parity Panel Truthfulness Recovery

## What changed
1. Added the Phase 610 prompt set for the remaining standalone Phase 12 parity-panel truthfulness recovery:
- `prompts/610-PHASE-610-CPRS-PHASE12-PARITY-PANEL-TRUTHFULNESS-RECOVERY/610-01-IMPLEMENT.md`
- `prompts/610-PHASE-610-CPRS-PHASE12-PARITY-PANEL-TRUTHFULNESS-RECOVERY/610-99-VERIFY.md`

2. Added a shared pending-state helper in `apps/web/src/components/cprs/panels/CachePendingBanner.tsx`:
- the remaining cache-backed parity tabs now use one grounded banner contract instead of each panel inventing different pending wording
- banners show status, attempted RPCs, and target RPCs for failed or integration-pending reads

3. Recovered the stale false-empty-state behavior across the remaining standalone Phase 12 parity tabs:
- `apps/web/src/components/cprs/panels/ConsultsPanel.tsx` now uses cache metadata and distinguishes filter-empty consult results from chart-empty consult results
- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx` now shows pending posture instead of claiming there are no surgical cases when the latest fetch was not trustworthy
- `apps/web/src/components/cprs/panels/DCSummPanel.tsx` now shows pending posture instead of claiming there are no discharge summaries when the latest fetch was not trustworthy
- `apps/web/src/components/cprs/panels/LabsPanel.tsx` now shows grounded pending posture for failed lab reads and distinguishes filter-empty abnormal/unacknowledged views from a truly empty lab feed
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx` now shows grounded pending posture for the report catalog instead of collapsing failed reads into `No report types available`

4. Fixed a deeper backend/frontend contract bug in `apps/api/src/server/inline-routes.ts`:
- `GET /vista/reports` now returns the documented normalized report catalog shape `{ id, name, hsType }` for actionable report definitions instead of only raw `heading/qualifier/rpcName/category` rows
- the route still returns `dateRanges`, `hsTypes`, and `rawReports` for deeper tooling, but the UI-facing contract is now truthful and usable
- live `GET /vista/reports/text?dfn=46&id=1&hsType=` remained functional after the contract fix

5. Updated `docs/runbooks/vista-rpc-phase12-parity.md` so the documented parity-panel contract matches the recovered truthfulness behavior and the normalized reports catalog contract

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
$login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3001/auth/login' -ContentType 'application/json' -Body $loginBody -SessionVariable session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/consults?dfn=46' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/surgery?dfn=46' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/dc-summaries?dfn=46' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/labs?dfn=46' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports' -WebSession $session
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/vista/reports/text?dfn=46&id=1&hsType=' -WebSession $session
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health after restart: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live consults proof: `ok:true`, `count:0`, `rpcUsed:"ORQQCN LIST"`
- Live surgery proof: `ok:true`, `count:0`, `rpcUsed:"ORWSR LIST"`
- Live D/C summaries proof: `ok:true`, `count:0`, `rpcUsed:"TIU DOCUMENTS BY CONTEXT"`
- Live labs proof: `ok:true`, `count:0`, `rpcUsed:"ORWLRR INTERIM"`
- Live reports proof: `ok:true`, `count:17`, normalized `reports:[{id,name,hsType}]`, `rpcUsed:"ORWRP REPORT LISTS"`
- Live report text proof: `ok:true`, `rpcUsed:"ORWRP REPORT TEXT"`
- Web TypeScript compile: PASS
- Phase index regeneration: PASS (Phase 610 included)
- `scripts/verify-latest.ps1`: PASS

## Current blocker
- The Phase 12 parity tabs are now truthful at the list/posture layer, but deeper feature parity inside some tabs still remains limited by upstream RPC depth, such as surgical report text and richer report parameter selection.

## Follow-ups
1. Audit the next remaining CPRS feature-depth gaps where the UI is live but still thinner than the original CPRS intent, starting with report-text selection depth or surgical detail/report retrieval.

# Phase 609 Summary - CPRS Problems and Medications Panel Truthfulness Recovery

## What changed
1. Added the Phase 609 prompt set for standalone CPRS Problems and Medications panel truthfulness recovery:
- `prompts/609-PHASE-609-CPRS-PROBLEMS-MEDS-PANEL-TRUTHFULNESS-RECOVERY/609-01-IMPLEMENT.md`
- `prompts/609-PHASE-609-CPRS-PROBLEMS-MEDS-PANEL-TRUTHFULNESS-RECOVERY/609-99-VERIFY.md`

2. Fixed the stale false-empty-state behavior in `apps/web/src/components/cprs/panels/ProblemsPanel.tsx`:
- the standalone Problems tab now reads `getDomainMeta(dfn, 'problems')` from the shared clinical cache instead of relying on filtered row count alone
- failed or integration-pending problem-list reads now render a grounded pending banner with status, attempted RPCs, and target RPCs instead of `No problems on record`
- if the chart has problems but the current filter hides them, the tab now shows a filter-specific empty message instead of claiming the chart is empty

3. Fixed the same stale contract in `apps/web/src/components/cprs/panels/MedsPanel.tsx`:
- the standalone Medications tab now reads `getDomainMeta(dfn, 'medications')` from the shared clinical cache instead of relying on filtered row count alone
- failed or integration-pending medication-list reads now render a grounded pending banner with status, attempted RPCs, and target RPCs instead of `No medications`
- if medications exist but the selected status filter removes them, the tab now shows a filter-specific empty message instead of falsely implying a chart-empty medication list

4. Updated `docs/runbooks/vista-rpc-problems.md` and `docs/runbooks/vista-rpc-medications.md` so the documented standalone panel contracts match the recovered truthful pending/error posture

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/problems?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/medications?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live problems proof: `ok:true`, `count:2`, `rpcUsed:"ORQQPL PROBLEM LIST"`
- Live medications proof: `ok:true`, `count:0`, `rpcUsed:"ORWPS ACTIVE"`
- Web TypeScript compile: PASS
- Phase index regeneration: PASS (Phase 609 included)
- `scripts/verify-latest.ps1`: PASS

## Current blocker
- The standalone Problems and Medications tabs are now truthful, but other cache-backed standalone CPRS tabs still need the same metadata-driven posture audit.

## Follow-ups
1. Audit the remaining standalone CPRS cache-backed tabs beyond notes, problems, and medications, then recover the next misleading pending/failure path using the shared cache metadata contract.

# Phase 608 Summary - CPRS Notes Panel Truthfulness Recovery

## What changed
1. Added the Phase 608 prompt set for standalone CPRS Notes panel truthfulness recovery:
- `prompts/608-PHASE-608-CPRS-NOTES-PANEL-TRUTHFULNESS-RECOVERY/608-01-IMPLEMENT.md`
- `prompts/608-PHASE-608-CPRS-NOTES-PANEL-TRUTHFULNESS-RECOVERY/608-99-VERIFY.md`

2. Fixed the stale false-empty-state behavior in `apps/web/src/components/cprs/panels/NotesPanel.tsx`:
- the Notes panel now reads `getDomainMeta(dfn, 'notes')` from the shared clinical cache instead of relying on note row count alone
- failed or integration-pending note reads now render a grounded pending banner with status, attempted RPCs, and target RPCs instead of `No notes on record`
- true live-empty note lists still render the normal empty-state copy

3. Fixed root-cause cache metadata drift in `apps/web/src/stores/data-cache.tsx`:
- request-failure metadata now preserves per-domain fallback targets instead of dropping them on generic fetch failures
- the notes domain therefore still identifies `TIU DOCUMENTS BY CONTEXT` as the target dependency even when the request itself fails before a normalized envelope is returned

4. Updated `docs/runbooks/vista-rpc-notes.md` so the documented Notes panel contract matches the recovered truthful pending/error posture

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=14349"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
node scripts/build-phase-index.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live notes list proof: `ok:true`, `count:8`, `rpcUsed:"TIU DOCUMENTS BY CONTEXT"`
- Live note text proof: `ok:true`, `ien:"14349"`, `rpcUsed:["TIU GET RECORD TEXT"]`
- TypeScript diagnostics for changed files: clean
- Phase index regeneration: PASS (Phase 608 included)
- `scripts/verify-latest.ps1`: PASS

## Current blocker
- This phase repairs the standalone Notes panel truthfulness contract, but the broader CPRS surface still has other cache-backed panels that may need the same metadata-driven posture review.

## Follow-ups
1. Audit the remaining standalone CPRS tabs that still render array-length-only empty states and recover the next misleading pending/failure path using the same shared cache contract.

# Phase 607 Summary - Patient Search Write Truthfulness Recovery

## What changed
1. Added the Phase 607 prompt set for patient-search write truthfulness recovery:
- `prompts/607-PHASE-607-PATIENT-SEARCH-WRITE-TRUTHFULNESS-RECOVERY/607-01-IMPLEMENT.md`
- `prompts/607-PHASE-607-PATIENT-SEARCH-WRITE-TRUTHFULNESS-RECOVERY/607-99-VERIFY.md`

2. Fixed the remaining patient-search write contract drift in `apps/web/src/app/patient-search/page.tsx`:
- allergy, vitals, notes, and medication writes now send the same CSRF headers already used by the problem-add flow
- patient-search medication success handling now refreshes the live list only when VistA actually accepted the order
- sync-pending medication responses now surface truthful success copy instead of implying a live medication order exists

3. Fixed the root-cause truthfulness bug in `apps/api/src/server/inline-routes.ts`:
- the legacy `POST /vista/medications` route now creates a server-side draft when `ORWDXM AUTOACK` throws or returns no usable live order
- draft fallback responses now return `ok:true`, `mode:"draft"`, `status:"sync-pending"`, `syncPending:true`, and grounded `rpcUsed` metadata instead of an opaque hard failure
- the live-success path remains unchanged when VistA returns a real order IEN

4. Updated `docs/runbooks/vista-rpc-add-medication.md` so the medication runbook documents the VEHU quick-order limitation and the truthful draft fallback posture

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$loginResp = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($loginResp | ConvertFrom-Json).csrfToken

Set-Content -Path allergy-body.json -Value '{"dfn":"46","allergen":"CODEINE"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/allergies -H "Content-Type: application/json" -H "X-CSRF-Token: '"$csrf"'" -d "@allergy-body.json"

Set-Content -Path vital-body.json -Value '{"dfn":"46","type":"P","value":"72"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/vitals -H "Content-Type: application/json" -H "X-CSRF-Token: '"$csrf"'" -d "@vital-body.json"

Set-Content -Path note-body.json -Value '{"dfn":"46","title":"Phase 607 Verification Note","text":"Patient-search note write verified live against VEHU."}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/notes -H "Content-Type: application/json" -H "X-CSRF-Token: '"$csrf"'" -d "@note-body.json"

Set-Content -Path med-body.json -Value '{"dfn":"46","drug":"ASPIRIN TAB EC"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/medications -H "Content-Type: application/json" -H "X-CSRF-Token: '"$csrf"'" -d "@med-body.json"

Remove-Item login-body.json,allergy-body.json,vital-body.json,note-body.json,med-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
pnpm --dir apps/web exec tsc --noEmit
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live allergy proof: `ok:true`, `message:"Allergy created"`, `allergen:"CODEINE"`, `rpcUsed:"ORWDAL32 SAVE ALLERGY"`
- Live vital proof: `ok:true`, `message:"Vital recorded"`, `type:"P"`, `value:"72"`, `rpcUsed:"GMV ADD VM"`
- Live note proof: `ok:true`, `message:"Note created"`, `rpcUsed:"TIU CREATE RECORD + TIU SET DOCUMENT TEXT"`
- Live medication proof: `ok:true`, `mode:"draft"`, `status:"sync-pending"`, `syncPending:true`, `quickOrder:"ASPIRIN TAB EC"`, `rpcUsed:"ORWDXM AUTOACK"`
- Web TypeScript compile: PASS
- Phase index regeneration: PASS (Phase 607 included)
- Phase QA generation: PASS
- `scripts/verify-latest.ps1`: PASS (`PASS: 15`, `FAIL: 0`, `Overall: RC_READY`)

## Current blocker
- VEHU still does not reliably produce a live quick-order result for the patient-search medication free-text path, so that path is now truthfully draft-backed instead of falsely claiming a completed live order.

## Follow-ups
1. Recover the next stale patient-search or CPRS write/read workflow that still collapses pending or failure posture into misleading UI copy.

# Phase 606 Summary - CPRS Cover Sheet Cache Truthfulness Recovery

## What changed
1. Added the Phase 606 prompt set for CPRS cover sheet cache truthfulness recovery:
- `prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-01-IMPLEMENT.md`
- `prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-99-VERIFY.md`

2. Fixed the root-cause shared cache contract in `apps/web/src/stores/data-cache.tsx`:
- domain fetchers now preserve per-domain fetch metadata (`ok`, `pending`, `status`, `pendingTargets`, `rpcUsed`, `error`)
- `useDataCache()` now exposes `meta` and `getDomainMeta()` so UI consumers can tell live empty data from failed or integration-pending reads
- failed refreshes now clear stale cached rows for the affected domain instead of silently leaving old data on screen

3. Fixed false empty-state rendering in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`:
- the problems, allergies, medications, vitals, notes, and labs cards now use cache metadata to show pending posture when the latest read is unavailable
- those cache-backed cards now reuse the existing cover-sheet pending badge/modal rather than showing `No ...` copy for failed reads
- appointments, orders, reminders, and immunizations continue to use the same pending badge path through the unified `pending` panel contract

4. Fixed cover-sheet action metadata drift in `apps/web/src/actions/actionRegistry.ts`:
- `cover.load-problems` now maps to `ORQQPL PROBLEM LIST` instead of the stale `ORWCH PROBLEM LIST`
- added missing cover-sheet action entries for notes and immunizations so the pending modal stays grounded to the correct RPC targets

5. Updated the Wave 1 runbook note in `docs/runbooks/phase56-wave1-layout.md` so the documented cover-sheet behavior matches the recovered cache-truthfulness contract

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/problems?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/medications?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/labs?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
pnpm --dir apps/web exec tsc --noEmit
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- VistA connectivity: `{"ok":true,"vista":"reachable","port":9431}`
- Live problems proof: `ok:true`, `count:2`, `rpcUsed:"ORQQPL PROBLEM LIST"`
- Live medications proof: `ok:true`, `count:0`, `rpcUsed:"ORWPS ACTIVE"`
- Live notes proof: `ok:true`, `count:6`, `rpcUsed:"TIU DOCUMENTS BY CONTEXT"`
- Live labs proof: `ok:true`, `count:0`, `rpcUsed:"ORWLRR INTERIM"`, `rawText:"No Data Found"`
- Web TypeScript compile: PASS
- Phase index regeneration: PASS (Phase 606 included)
- Phase QA generation: PASS
- `scripts/verify-latest.ps1`: PASS (`PASS: 15`, `FAIL: 0`, `Overall: RC_READY`)

## Current blocker
- No active blocker remains for the cover sheet cache truthfulness path. Medication and lab cards still show live empty states for DFN 46 because VEHU returned successful empty responses for those domains.

## Follow-ups
1. Extend the same cache metadata contract to other cache-backed CPRS panels, such as the standalone notes tab, that still rely on array length alone for empty-state rendering.

# Phase 605 Summary - CPRS Cover Sheet Orders Recovery

## What changed
1. Added the Phase 605 prompt set for CPRS cover sheet orders recovery:
- `prompts/605-PHASE-605-CPRS-COVERSHEET-ORDERS-RECOVERY/605-01-IMPLEMENT.md`
- `prompts/605-PHASE-605-CPRS-COVERSHEET-ORDERS-RECOVERY/605-99-VERIFY.md`

2. Fixed the root-cause parameter contract in `apps/api/src/routes/cprs/wave1-routes.ts`:
- `/vista/cprs/orders-summary` now calls `ORWORB UNSIG ORDERS` with the acting clinician DUZ instead of the patient DFN
- returned unsigned-order rows are filtered to the current patient DFN before building the cover sheet summary
- when the RPC is unavailable on the active VistA instance, the route now returns `status:"integration-pending"` with `pendingTargets:["ORWORB UNSIG ORDERS"]` instead of fake empty success

3. Fixed silent failure masking in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`:
- the orders card now tracks explicit `ordersPending` state
- route failure or integration-pending posture now shows the existing cover sheet pending badge/modal
- live empty responses still render `No unsigned orders`

4. Updated the cover sheet runbook note in `docs/runbooks/phase56-wave1-layout.md` so the orders summary contract matches current UI and backend behavior

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders-summary?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/api
pnpm exec tsc --noEmit
Set-Location ..\web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- Live orders summary proof: `ok:true`, `status:"integration-pending"`, `rpcUsed:["ORWORB UNSIG ORDERS"]`, `pendingTargets:["ORWORB UNSIG ORDERS"]`
- Orders route now uses clinician DUZ instead of patient DFN for the RPC call, then filters rows back to the selected patient
- API TypeScript compile: PASS
- Web TypeScript compile: PASS

## Current blocker
- VEHU still reports the unsigned-orders RPC as unavailable for this path, so the orders summary card remains truthfully pending on this instance.

## Follow-ups
1. Reconcile the VEHU runtime behavior of `ORWORB UNSIG ORDERS` with the capability docs and inbox route so the remaining sandbox availability mismatch is grounded before changing the UI again.

# Phase 604 Summary - CPRS Cover Sheet Reminders Recovery

## What changed
1. Added the Phase 604 prompt set for CPRS cover sheet reminders recovery:
- `prompts/604-PHASE-604-CPRS-COVERSHEET-REMINDERS-RECOVERY/604-01-IMPLEMENT.md`
- `prompts/604-PHASE-604-CPRS-COVERSHEET-REMINDERS-RECOVERY/604-99-VERIFY.md`

2. Fixed silent failure masking in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`:
- the reminders card now tracks explicit `remindersPending` state
- the fetch path clears stale pending posture before each request
- route failure now clears stale rows and shows pending copy plus the existing cover sheet pending badge/modal
- live empty responses still render `No clinical reminders due`

3. Updated the cover sheet runbook note in `docs/runbooks/phase56-wave1-layout.md` so reminder behavior matches the recovered UI contract

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/reminders?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- Live reminders proof: `ok:true`, `status:"ok"`, `rpcUsed:["ORQQPX REMINDERS LIST"]`
- Live reminder data for DFN 46 includes entries such as `Influenza Vaccine`, `Hepatitis C risk Factor Screening`, and `Primary Care Depression Screening`
- Web TypeScript compile: PASS

## Current blocker
- No active blocker remains for the cover sheet reminders truthfulness path.

## Follow-ups
1. Audit the remaining cover sheet cards for other fetch paths that still collapse route failure into empty-state copy.

# Phase 603 Summary - CPRS Cover Sheet Immunizations Recovery

## What changed
1. Added the Phase 603 prompt set for CPRS cover sheet immunizations recovery:
- `prompts/603-PHASE-603-CPRS-COVERSHEET-IMMUNIZATIONS-RECOVERY/603-01-IMPLEMENT.md`
- `prompts/603-PHASE-603-CPRS-COVERSHEET-IMMUNIZATIONS-RECOVERY/603-99-VERIFY.md`

2. Fixed stale immunization pending-state handling in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`:
- the cover sheet now clears `immuPending` before each fetch
- successful live responses now recompute pending state from the latest response only
- failed or pending fetches clear stale rows and remain truthfully marked pending
- live empty responses now fall through to `No immunizations on record` instead of a latched pending banner

3. Updated the cover sheet runbook note in `docs/runbooks/phase56-wave1-layout.md` so the documented immunization behavior matches the current UI contract

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/immunizations?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Docker prerequisites: `vehu` and `ve-platform-db` healthy
- API health: `ok:true`
- Live immunizations proof: `ok:true`, `rpcUsed:["ORQQPX IMMUN LIST"]`, `count:0`, `pendingTargets:[]`
- Cover sheet fix: pending posture now derives from the latest fetch instead of a stale latched flag
- Web TypeScript compile: PASS

## Current blocker
- No active blocker remains for the cover sheet immunizations truthfulness path.

## Follow-ups
1. Audit the remaining cover sheet cards for any other latched pending-state patterns similar to the immunizations bug.

# Phase 602 Summary - Portal Export Truthfulness Recovery

## What changed
1. Added the Phase 602 prompt set for portal export truthfulness recovery:
- `prompts/602-PHASE-602-PORTAL-EXPORT-TRUTHFULNESS-RECOVERY/602-01-IMPLEMENT.md`
- `prompts/602-PHASE-602-PORTAL-EXPORT-TRUTHFULNESS-RECOVERY/602-99-VERIFY.md`

2. Fixed the shared portal PDF/export formatter in `apps/api/src/services/portal-pdf.ts`:
- immunizations and labs now distinguish empty live data from genuine pending/unavailable fetches
- empty live sections render `No immunizations on file` or `No lab results on file`
- pending/unavailable sections still render target RPC metadata instead of fake live success

3. Fixed portal section export data loading in `apps/api/src/routes/portal-core.ts`:
- portal export helpers now fetch live immunizations via `ORQQPX IMMUN LIST`
- portal export helpers now fetch live labs via `ORWLRR INTERIM`
- section/full PDF export, JSON export, SHC generation, share preview, and DOB lookup now use the updated fetch result contract

4. Fixed record portability export truthfulness in `apps/api/src/routes/record-portability.ts`:
- immunizations are no longer hardcoded as pending
- record portability now reads immunizations from `ORQQPX IMMUN LIST`
- lab export now uses the live `ORWLRR INTERIM` contract and only reports pending on real fetch failure

5. Updated the relevant runbooks:
- `docs/runbooks/phase31-sharing-exports.md`
- `docs/runbooks/phase80-record-portability.md`
- `docs/runbooks/portal-core.md`

6. Regenerated prompt metadata after adding the new prompt pack:
- refreshed `docs/qa/phase-index.json`
- refreshed generated phase QA specs via `node scripts/generate-phase-qa.mjs`

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
$portalBody = Get-Content portal-auth-login.json -Raw
Set-Content -Path portal-login-body.json -Value $portalBody -NoNewline -Encoding ASCII
curl.exe -s -c portal-cookies.txt -X POST http://127.0.0.1:3001/portal/auth/login -H "Content-Type: application/json" -d "@portal-login-body.json"
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/health/immunizations
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/health/labs
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/export/section/immunizations > portal-export-imm.txt
Set-Content -Path portal-record-export.json -Value '{"sections":["immunizations","labs"],"format":"html"}' -NoNewline -Encoding ASCII
curl.exe -s -b portal-cookies.txt -X POST http://127.0.0.1:3001/portal/record/export -H "Content-Type: application/json" -d "@portal-record-export.json"
Remove-Item portal-login-body.json,portal-cookies.txt,portal-record-export.json -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/api
pnpm exec tsc --noEmit
Set-Location ..\portal
pnpm exec tsc --noEmit
Set-Location ..\..
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Portal immunizations live proof: `ok:true`, `rpcUsed:"ORQQPX IMMUN LIST"`, `count:0`
- Portal labs live proof: `ok:true`, `rpcUsed:"ORWLRR INTERIM"`, `count:0`, `rawText:"No Data Found"`
- Portal immunizations PDF export proof: contains `No immunizations on file`, no `integration pending` string
- Record portability proof: `rpcUsed:["ORWRP REPORT TEXT","ORQQPX IMMUN LIST","ORWLRR INTERIM"]`, `pendingTargets:[]`
- API TypeScript compile: PASS
- Portal TypeScript compile: PASS
- RC verify (final): pending rerun for Phase 602 closeout

## Current blocker
- No active blocker remains for the portal immunizations/labs export truthfulness path.

## Follow-ups
1. Audit the remaining export formatters for other sections that still collapse empty live data and unavailable VistA data into the same message.
2. If richer lab export formatting is needed later, reuse the live `ORWLRR INTERIM` parser contract rather than adding a separate export-only representation.

# Phase 601 Summary - CPRS Cover Sheet Appointments Recovery

## What changed
1. Added the Phase 601 prompt set for CPRS cover sheet appointments recovery:
- `prompts/601-PHASE-601-CPRS-COVERSHEET-APPOINTMENTS-RECOVERY/601-01-IMPLEMENT.md`
- `prompts/601-PHASE-601-CPRS-COVERSHEET-APPOINTMENTS-RECOVERY/601-99-VERIFY.md`

2. Recovered the CPRS cover sheet appointments card in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`:
- the card now fetches `GET /vista/cprs/appointments?dfn=...`
- returned appointment/request rows are rendered directly on the cover sheet
- the card pending badge now reflects backend truth (`status` / `pendingTargets`) instead of a hardcoded placeholder posture

3. Corrected stale action metadata in `apps/web/src/actions/actionRegistry.ts`:
- `cover.load-appointments` is now marked `wired`
- the live RPC grounding is recorded as `SDOE LIST ENCOUNTERS FOR PAT`
- the fallback note now explains the real request-only fallback posture instead of claiming the sandbox cannot support appointments at all

4. Updated the scheduling runbook:
- `docs/runbooks/scheduling-vista-sd.md` now documents the cover sheet appointment contract and the live `GET /vista/cprs/appointments` verification path

5. Regenerated prompt metadata after adding the new prompt pack:
- refreshed `docs/qa/phase-index.json`
- refreshed generated phase QA specs via `node scripts/generate-phase-qa.mjs`

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/appointments?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Live VEHU cover sheet appointments proof: `ok:true`, `status:"ok"`, `rpcUsed:["SDOE LIST ENCOUNTERS FOR PAT"]`, `pendingTargets:[]`
- Web TypeScript compile: PASS
- RC verify (final): pending rerun for Phase 601 closeout

## Current blocker
- No backend blocker remains for the appointments card; the Phase 601 work is a stale frontend truthfulness recovery.

## Follow-ups
1. Audit the remaining cover sheet cards and action registry entries for other stale `integration pending` messaging that no longer matches live backend capability.
2. If the cover sheet later needs richer scheduling detail, prove the exact additional VistA encounter fields through the same `/vista/cprs/appointments` route before expanding the UI contract.

# Phase 600 Summary - Problem Edit Truthfulness Recovery

## What changed
1. Added the Phase 600 prompt set for problem edit truthfulness recovery:
- `prompts/600-PHASE-600-PROBLEM-EDIT-TRUTHFULNESS-RECOVERY/600-01-IMPLEMENT.md`
- `prompts/600-PHASE-600-PROBLEM-EDIT-TRUTHFULNESS-RECOVERY/600-99-VERIFY.md`

2. Fixed the live CPRS problem edit route in `apps/api/src/routes/cprs/wave2-routes.ts`:
- UI status values are now normalized to VistA-safe `A` / `I` codes before `ORQQPL EDIT SAVE`
- VistA runtime-error output is now treated as a failed live write instead of fake `mode: "real"` success
- add and edit routes now use the same status normalization path for problem writes

3. Fixed the web problem edit workflow:
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx` now uses the actual `Problem.text` payload used by the active UI instead of a stale `description` assumption
- draft fallback updates the existing cached problem item instead of appending a duplicate pseudo-problem row
- real success also updates the local cache so the edited item stays consistent in the current session

4. Added a focused local cache update path for problems:
- `apps/web/src/stores/data-cache.tsx` now exposes `updateProblem(...)`
- `apps/web/src/components/cprs/panels/ProblemsPanel.tsx` now refreshes the selected problem detail when the cached list changes

5. Updated the relevant runbook:
- `docs/runbooks/vista-rpc-problems.md` now documents `POST /vista/cprs/problems/edit`, status normalization, truthful draft fallback, and the current split between the active CPRS write path and the legacy blocker-era endpoint

6. Regenerated prompt metadata after adding the new prompt pack:
- refreshed `docs/qa/phase-index.json`
- refreshed generated phase QA specs via `node scripts/generate-phase-qa.mjs`

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -WebSession $session -ContentType 'application/json' -Body $loginBody
$csrf = $login.csrfToken
$problems = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/problems?dfn=46' -WebSession $session
$problem = $problems.results | Select-Object -First 1
$editBody = @{ dfn = '46'; problemIen = [string]$problem.id; problemText = [string]$problem.text; icdCode = [string]$problem.icdCode; status = 'inactive' } | ConvertTo-Json -Compress
$headers = @{ 'X-CSRF-Token' = [string]$csrf }
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/cprs/problems/edit' -Method Post -WebSession $session -Headers $headers -ContentType 'application/json' -Body $editBody
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Live VEHU edit proof: `ok:true`, `mode:"real"`, `status:"saved"`, `rpcUsed:["ORQQPL EDIT SAVE"]`
- Live restore proof after verification: `ok:true`, `mode:"real"`, `status:"saved"`
- RC verify (final): 15 PASS / 0 FAIL / 0 SKIP (`RC_READY`)
- Tier-0 outpatient proof: PASS (6/6 steps)

## Current blocker
- No active blocker remains for the problem edit truthfulness slice.

## Follow-ups
1. If problem comments need first-class persistence beyond status/text updates, verify the exact `ORQQPL EDIT SAVE` comment contract in VEHU before expanding the dialog payload.
2. Audit the remaining stale problem-write affordances outside CPRS if they still reference the legacy `/vista/problems` blocker surface.

# Phase 588 Summary - Production Stabilization Execution

## What changed
1. Added and completed the stabilization prompt set:
- `prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-01-IMPLEMENT.md`
- `prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-99-VERIFY.md`

2. Restored prompt-governance consistency:
- Regenerated `docs/qa/phase-index.json` after adding Phase 588 so the phase index gate matched the actual prompt tree.

3. Fixed certification false negatives instead of accepting partial readiness:
- `scripts/qa-gates/certification-runner.mjs`: added typed Fastify route recognition and route normalization for parameterized paths.
- `config/certification-scenarios.json`: aligned scenario routes and RPC names with the current canonical API surface.

4. Closed scheduling compatibility and truthfulness gaps:
- `apps/api/src/routes/scheduling/index.ts`: added `POST /scheduling/book` and `POST /scheduling/check-in` as compatibility aliases that reuse canonical scheduling logic.
- `apps/api/src/routes/scheduling/index.ts`: integrated request creation and approval with the Phase 170 writeback guard so approved requests remain `approved` unless VistA truth confirms `scheduled`.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/scheduling/book -H "Content-Type: application/json" -d '{"patientDfn":"46","clinicName":"CARDIOLOGY","preferredDate":"2026-03-10","reason":"Follow-up visit","appointmentType":"in_person"}'
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/scheduling/check-in -H "Content-Type: application/json" -d '{"appointmentId":"req-1-mmgyeaeg","patientDfn":"46","clinicName":"CARDIOLOGY"}'
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Certification gate: 12 READY / 0 PARTIAL / 49 of 49 reachable
- RC verify (full): 15 PASS / 0 FAIL / 0 SKIP (`RC_READY`)
- Tier-0 outpatient proof: PASS (6/6 steps)
- Live scheduling approval proof: `writeback.status` remains `approved` when truth gate does not confirm VistA scheduling

## Current blocker
- No active RC blocker after the final scheduling writeback integration.

## Follow-ups
1. Decide whether to mature scheduling beyond truthful request-only or partial mode into direct SDES writeback in VEHU.
2. If direct scheduling is pursued, seed or prove SDES data first and keep the Phase 170 truth gate mandatory.
3. Continue reducing prompt duplicate-phase warnings separately from production readiness work.

# Phase 589 Summary - Scheduling Direct Writeback Reality Check

## What changed
1. Added the Phase 589 prompt set for live-proven scheduling direct writeback investigation:
- `prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-01-IMPLEMENT.md`
- `prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-99-VERIFY.md`

2. Fixed scheduling adapter parsing and contract handling in `apps/api/src/adapters/scheduling/vista-adapter.ts`:
- `SDES GET APPT TYPES` now uses the correct zero-parameter call and parses JSON.
- `SDES GET CANCEL REASONS` now parses JSON correctly.
- `SDES GET RESOURCE BY CLINIC` and `SDES GET CLIN AVAILABILITY` now treat blank JSON placeholders as no-data instead of fake rows.
- `SD W/L RETRIVE HOSP LOC(#44)` and `SD W/L RETRIVE PERSON(200)` no longer pass invalid placeholder params or report M errors as real catalog data.

3. Verified the live VEHU lane truthfully remains `sdes_partial`:
- appointment types and cancel reasons are live
- clinic resource rows are not present for the probed clinics
- schedulable availability rows are not present for the same clinics
- direct booking/check-in remain disabled by design

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt http://127.0.0.1:3001/scheduling/mode
curl.exe -s -b cookies.txt http://127.0.0.1:3001/scheduling/appointment-types
curl.exe -s -b cookies.txt http://127.0.0.1:3001/scheduling/cancel-reasons
curl.exe -s -b cookies.txt http://127.0.0.1:3001/scheduling/clinic/16/resource
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/scheduling/sdes-availability?clinicIen=16&startDate=2026-03-08&endDate=2026-03-08"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Live scheduling read depth improved from false-positive success to truthful responses.
- `SDES GET CANCEL REASONS`: PASS with 21 real rows.
- `SDES GET APPT TYPES`: PASS with 14 real rows after contract fix.
- Resource and availability probes: truthful `pending` / no-data for all tested clinics, so direct writeback remains disabled.

## Current blocker
- VEHU still lacks proven clinic resource + availability rows required for truthful direct SDES booking/check-in.

## Follow-ups
1. If direct scheduling must be enabled, provision a lane with real SDES clinic resource and slot data first.
2. Keep the current `sdes_partial` posture until a live booking path can pass the Phase 170 truth gate.
3. Re-run the full verifier after any future lane or seeding change that claims to unlock direct scheduling.

# Phase 590 Summary - Nursing MAR Chart Integration

## What changed
1. Added the Phase 590 prompt set for chart-embedded nursing MAR completion:
- `prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-01-IMPLEMENT.md`
- `prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-99-VERIFY.md`

2. Replaced the Nursing chart MAR placeholder with a working eMAR-backed experience in `apps/web/src/components/cprs/panels/NursingPanel.tsx`:
- active medication schedule now comes from `/emar/schedule`
- medication posture rows now come from `/emar/history`
- administration capture now posts to `/emar/administer`
- barcode verification now posts to `/emar/barcode-scan`
- a direct link to the full standalone eMAR workspace was added for deeper workflow access

3. Corrected chart action metadata in `apps/web/src/actions/actionRegistry.ts` so nursing MAR reads and fallback administration are no longer mislabeled as fully unsupported.

4. Updated `docs/runbooks/emar-bcma.md` so the documented posture matches the real VEHU behavior: VistA-backed reads, TIU fallback documentation, and explicit BCMA production targets.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
$schedule = curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/schedule?dfn=56"
$history = curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/history?dfn=46"
$orderIen = (($schedule | ConvertFrom-Json).schedule | Select-Object -First 1).orderIEN
Set-Content -Path emar-admin.json -Value ("{\"dfn\":\"56\",\"orderIEN\":\"$orderIen\",\"action\":\"given\"}") -NoNewline -Encoding ASCII
$admin = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/emar/administer -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@emar-admin.json"
Set-Content -Path emar-scan.json -Value '{"dfn":"56","barcode":"DIGOXIN"}' -NoNewline -Encoding ASCII
$scan = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/emar/barcode-scan -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@emar-scan.json"
Remove-Item login-body.json,cookies.txt,emar-admin.json,emar-scan.json -ErrorAction SilentlyContinue
```

## Current blocker
- Full BCMA medication-log writes and true administration timestamps still require PSB MED LOG and PSJBCMA in a production VistA lane.

## Follow-ups
1. If bedside scanning must be production-complete, install the BCMA package and replace TIU fallback capture with PSB MED LOG write mode.
2. If the chart action inspector is used for bedside readiness, audit other Nursing entries for the same stale unsupported labels.
3. Re-run the full verifier after any further nursing or eMAR chart integration changes.

# Phase 591 Summary - Portal MailMan Sent-History Truthfulness

## What changed
1. Added the Phase 591 prompt set for portal messaging sent-history truthfulness:
- `prompts/591-PHASE-591-PORTAL-MAILMAN-SENT-TRUTHFULNESS/591-01-IMPLEMENT.md`
- `prompts/591-PHASE-591-PORTAL-MAILMAN-SENT-TRUTHFULNESS/591-99-VERIFY.md`

2. Fixed the portal messaging durability gap in `apps/api/src/services/portal-messaging.ts`:
- durable PG writes used by sent-history paths are now awaited where the flow is async
- sent-history reads now merge durable rows with the hot cache instead of hiding just-created items
- added a direct sent-message mirror helper so transport-specific routes can record truthful portal Sent items

3. Fixed the portal MailMan route in `apps/api/src/routes/portal-mailman.ts`:
- successful VistA MailMan sends now create a durable mirrored portal Sent record with `vistaSync: synced`
- local-mode sends now create a durable mirrored portal Sent record with `vistaSync: not_synced`
- route responses now return the mirrored message record that the patient will immediately see in Sent history

4. Updated the portal Messages UI in `apps/portal/src/app/dashboard/messages/page.tsx`:
- removed stale DSIC / integration-pending phrasing from the compose posture
- Sent items now show per-message delivery posture (`VistA MailMan synced`, `Local mode only`, etc.)
- Sent item source badges are now driven by each message's real sync state instead of a page-wide assumption

## Manual test commands (validated)
```powershell
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path portal-login.json -Value '{"username":"patient1","password":"Patient1!"}' -NoNewline -Encoding ASCII
Set-Content -Path portal-send.json -Value '{"subject":"Portal sent mirror proof","body":"Verify that a freshly sent portal message appears immediately in Sent history.","category":"general"}' -NoNewline -Encoding ASCII
curl.exe -s -c portal-cookies.txt -X POST http://127.0.0.1:3001/portal/auth/login -H "Content-Type: application/json" -d "@portal-login.json"
curl.exe -s -b portal-cookies.txt -X POST http://127.0.0.1:3001/portal/mailman/send -H "Content-Type: application/json" -d "@portal-send.json"
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/messages/sent
```

```powershell
Set-Content -Path clinician-login.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c clinician-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@clinician-login.json" | Out-Null
curl.exe -s -b clinician-cookies.txt http://127.0.0.1:3001/messaging/mail-groups
Set-Content -Path portal-send-vista.json -Value '{"subject":"Portal VistA MailMan proof","body":"Verify VistA MailMan send plus mirrored sent history.","category":"general","clinicGroup":"TEST"}' -NoNewline -Encoding ASCII
curl.exe -s -b portal-cookies.txt -X POST http://127.0.0.1:3001/portal/mailman/send -H "Content-Type: application/json" -d "@portal-send-vista.json"
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/messages/sent
Remove-Item clinician-login.json,clinician-cookies.txt,portal-login.json,portal-send.json,portal-send-vista.json,portal-cookies.txt -ErrorAction SilentlyContinue
```

## Current blocker
- Portal inbox read remains portal-scoped because this lane still does not prove a patient-to-MailMan basket identity binding.

## Follow-ups
1. If patient inbox must become VistA-readable, define and verify a real patient-to-MailMan identity binding instead of reading only the portal store.
2. If clinic routing should be automatic in every lane, configure `MESSAGING_DEFAULT_CLINIC_GROUP` with a vetted production group name rather than requiring explicit request-time `clinicGroup`.
3. Re-run the full verifier after regenerating phase metadata for the new Phase 591 prompt pack.

# Phase 594 Summary - Discharge Prep + Med Rec TIU Completion

## What changed
1. Added the Phase 594 prompt set for discharge preparation completion:
- `prompts/594-PHASE-594-DISCHARGE-PREP-TIU/594-01-IMPLEMENT.md`
- `prompts/594-PHASE-594-DISCHARGE-PREP-TIU/594-99-VERIFY.md`

2. Extended the med-rec backend in `apps/api/src/routes/med-reconciliation.ts`:
- outpatient medication payloads are normalized before discrepancy analysis
- completion can now create a TIU draft summary note via `TIU CREATE RECORD` and `TIU SET DOCUMENT TEXT`
- session detail now persists TIU summary metadata so linked workflows can surface the actual draft note status

3. Extended the discharge workflow backend in `apps/api/src/routes/discharge-workflow.ts`:
- discharge plans can link a med-rec session at create/update time
- the medication reconciliation checklist item auto-syncs from the linked med-rec session
- plan completion can now create a TIU draft discharge-prep summary note while keeping `DG ADT DISCHARGE` truthful and pending

4. Reworked the inpatient UI in `apps/web/src/app/cprs/inpatient/page.tsx`:
- the `ADT & Discharge Prep` tab now includes a working discharge-prep workspace
- clinicians can start med-rec, record discrepancy decisions, complete med-rec with TIU drafting, create/update a discharge plan, manage checklist items, mark the plan ready, and complete discharge prep with TIU drafting
- the legacy admit/transfer/discharge buttons remain present only as truthful DG ADT blocker explanations

5. Refreshed repo metadata and runbook evidence:
- updated `docs/runbooks/phase168-inpatient-depth.md`
- regenerated `docs/qa/phase-index.json` and generated phase QA specs so the new prompt folder is indexed

## Manual test commands (validated)
```powershell
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = (curl.exe -s -b cookies.txt http://127.0.0.1:3001/auth/csrf-token | ConvertFrom-Json).csrfToken
Set-Content -Path medrec-start.json -Value '{"dfn":"46","outpatientMeds":[{"medicationName":"Lisinopril 10mg","dose":"10 mg","route":"PO","frequency":"daily","source":"patient-reported","status":"active"},{"medicationName":"Sertraline 50mg","dose":"50 mg","route":"PO","frequency":"daily","source":"patient-reported","status":"active"}]}' -NoNewline -Encoding ASCII
$medStart = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/med-rec/start -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@medrec-start.json"
$medRecId = (($medStart | ConvertFrom-Json).session.id)
Set-Content -Path medrec-complete.json -Value '{"documentation":{"createNote":true,"additionalNote":"Medication reconciliation completed during discharge preparation workflow."}}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/med-rec/session/$medRecId/complete -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@medrec-complete.json"
Set-Content -Path discharge-plan.json -Value ('{"dfn":"46","targetDate":"' + (Get-Date).ToString('yyyy-MM-dd') + '","disposition":"Home","medRecSessionId":"' + $medRecId + '"}') -NoNewline -Encoding ASCII
$planCreate = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@discharge-plan.json"
$planId = (($planCreate | ConvertFrom-Json).plan.id)
Set-Content -Path discharge-update.json -Value ('{"followUpInstructions":["Primary care follow-up within 7 days","Behavioral health follow-up within 14 days"],"patientEducation":["Reviewed warning signs","Reviewed medication adherence"],"medRecSessionId":"' + $medRecId + '"}') -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X PATCH http://127.0.0.1:3001/vista/discharge/plan/$planId -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@discharge-update.json"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan/$planId/ready -H "X-CSRF-Token: $csrf"
Set-Content -Path discharge-complete.json -Value '{"documentation":{"createNote":true,"additionalNote":"Discharge preparation completed; TIU note created while DG ADT discharge movement remains pending in VEHU."}}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan/$planId/complete -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@discharge-complete.json"
Remove-Item login-body.json,cookies.txt,medrec-start.json,medrec-complete.json,discharge-plan.json,discharge-update.json,discharge-complete.json -ErrorAction SilentlyContinue
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verifier output
- Live med-rec completion: PASS with `rpcUsed = ["TIU CREATE RECORD","TIU SET DOCUMENT TEXT"]` and draft note `docIen = 14346`
- Live discharge completion: PASS with `rpcUsed = ["TIU CREATE RECORD","TIU SET DOCUMENT TEXT"]` and draft note `docIen = 14347`
- Live discharge readiness gating: PASS with med-rec linked and auto-completed on plan create/update
- Full repository verifier: 15 PASS / 0 FAIL / 0 SKIP (`RC_READY`) after regenerating phase index metadata

## Current blocker
- True VistA ADT discharge movement still requires `DG ADT DISCHARGE`, which is absent in the VEHU sandbox and therefore remains truthful `integration-pending`.

## Follow-ups
1. If inpatient discharge movement must become VistA-complete, provision a lane with real DG ADT write RPC exposure and keep the TIU-backed discharge-prep path as a precursor, not a substitute.
2. If outpatient and inpatient medication reconciliation must write back to pharmacy/order packages, wire `PSO UPDATE MED LIST` and `PSJ LM ORDER UPDATE` when those RPCs exist in the target VistA lane.
3. Consider adding a patient-search or inpatient-census picker to the discharge-prep tab so clinicians can launch the workflow from a selected census row rather than typing DFN manually.

# Phase 596 Summary - Nursing Action Truthfulness

# Phase 599 Summary - Patient Search Problem Write Recovery

## What changed
1. Added the Phase 599 prompt set for patient-search problem-write recovery:
- `prompts/599-PHASE-599-PATIENT-SEARCH-PROBLEM-WRITE-RECOVERY/599-01-IMPLEMENT.md`
- `prompts/599-PHASE-599-PATIENT-SEARCH-PROBLEM-WRITE-RECOVERY/599-99-VERIFY.md`

2. Fixed the root truthfulness bug in `apps/api/src/routes/cprs/wave2-routes.ts`:
- `POST /vista/cprs/problems/add` now inspects RPC output and treats M runtime/parameter errors as failed VistA writes instead of returning fake `mode: real` success.
- when VEHU returns runtime output from `ORQQPL ADD SAVE`, the route now falls back to the existing server-side draft path and returns `mode: draft`, `status: sync-pending`, and `rpcUsed` truthfully.

3. Restored the patient-search Problem List action in `apps/web/src/app/patient-search/page.tsx`:
- the quick-add form now calls `POST /vista/cprs/problems/add` instead of the stale legacy `POST /vista/problems` blocker route
- CSRF and idempotency headers are now sent with the write request
- stale “Not Yet Implemented” copy was removed in favor of truthful real-vs-draft messaging

4. Updated `docs/runbooks/vista-rpc-add-problem.md` so it distinguishes the blocked legacy endpoint from the live CPRS route and documents the current VEHU draft-fallback posture.

## Manual test commands (validated)
```powershell
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
Set-Content -Path problem-body.json -Value '{"dfn":"46","problemText":"TEST PHASE 599 PROBLEM","icdCode":"Z71.1","onset":"2026-03-08","status":"A"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json" | Out-Null
$csrf = (curl.exe -s -b cookies.txt http://127.0.0.1:3001/auth/csrf-token | ConvertFrom-Json).csrfToken
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/problems/add -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@problem-body.json"
Remove-Item login-body.json,problem-body.json,cookies.txt -ErrorAction SilentlyContinue
```

## Verifier output
- Live API health: PASS after restart (`/health` returned `ok:true`)
- Live problem-write proof: PASS with truthful fallback response `mode: draft`, `status: sync-pending`, `rpcUsed = ["ORQQPL ADD SAVE"]`
- Edited file diagnostics: PASS for `apps/api/src/routes/cprs/wave2-routes.ts` and `apps/web/src/app/patient-search/page.tsx`

## Current blocker
- `ORQQPL ADD SAVE` is present in VEHU but the current parameter contract still returns an M runtime/parameter error, so real problem writeback remains sync-pending in this lane.

## Follow-ups
1. If full problem writeback is required in VEHU, derive and prove the correct `ORQQPL ADD SAVE` parameter contract before removing draft fallback.
2. If patient-search should support richer diagnosis capture, reuse the existing CPRS add-problem dialog fields instead of inventing another write path.
3. Re-run the phase metadata generators so the new Phase 599 prompt pack is indexed.

## What changed
1. Added the Phase 596 prompt set for nursing action metadata truthfulness:
- `prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-01-IMPLEMENT.md`
- `prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-99-VERIFY.md`

2. Corrected nursing chart action metadata in `apps/web/src/actions/actionRegistry.ts`:
- `nursing.tasks` now reflects the live ORWPS-derived task route instead of a stale unsupported PSB-only label
- `nursing.mar` now points at the shared `/emar/schedule` route used by the chart MAR tab
- `nursing.administer` now points at `/emar/administer`, matching the actual chart fallback write path

3. Updated `docs/runbooks/emar-bcma.md` so the runbook now matches the live chart posture:
- nursing task derivation is documented explicitly
- manual POST verification steps now include the required CSRF token
- the chart-embedded nursing/eMAR relationship is described directly

## Manual test commands (validated)
```powershell
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/nursing/tasks?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/schedule?dfn=46"
Set-Content -Path emar-scan.json -Value '{"dfn":"56","barcode":"DIGOXIN"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/emar/barcode-scan -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@emar-scan.json"
Remove-Item login-body.json,cookies.txt,emar-scan.json -ErrorAction SilentlyContinue
```

## Current blocker
- VEHU still does not provide BCMA task-native or medication-log-native data, so task timing and certified medication administration remain fallback-only.

## Follow-ups
1. If bedside task timing must be production-complete, replace ORWPS-derived task posture with BCMA task sources once the required PSB package surfaces are installed.
2. Audit other nursing/eMAR debug metadata for similar endpoint drift whenever chart wiring changes.
3. Keep CSRF-protected manual test examples in sync with any future nursing or eMAR write-route changes.

# Phase 592 Summary - Queue Workflow Durability Truthfulness

## What changed
1. Added the Phase 592 prompt set for durable queue/workflow completion:
- `prompts/592-PHASE-592-QUEUE-WORKFLOW-DURABILITY-TRUTHFULNESS/592-01-IMPLEMENT.md`
- `prompts/592-PHASE-592-QUEUE-WORKFLOW-DURABILITY-TRUTHFULNESS/592-99-VERIFY.md`

2. Added PostgreSQL-backed schema and repos for queue/workflow runtime state:
- `apps/api/src/platform/pg/pg-schema.ts` now defines `pgQueueTicket`, `pgQueueEvent`, `pgWorkflowDefinition`, and `pgWorkflowInstance`
- `apps/api/src/platform/pg/repo/pg-queue-repo.ts` and `apps/api/src/platform/pg/repo/pg-workflow-repo.ts` now provide durable CRUD used by live routes

3. Reworked the live queue/workflow routes so the UI contracts are truthful and durable:
- `apps/api/src/queue/queue-routes.ts` is now tenant-scoped and PG-first for ticket creation, lifecycle transitions, stats, and event history
- `apps/api/src/workflows/workflow-routes.ts` now exposes the real `/admin/workflows/definitions`, `/packs`, and `/stats` contracts expected by the admin page
- `/admin/workflows/definitions` no longer collides with the `/:id` route

4. Made the queue admin page usable from the front desk:
- `apps/web/src/app/cprs/admin/queue/page.tsx` now includes a ticket creation form for DFN/name/priority instead of assuming an external hidden creator

5. Restored the public board contract:
- `apps/api/src/middleware/module-guard.ts` now bypasses `/queue/display/:dept` so kiosk-style board reads are not blocked by tenant middleware

## Manual test commands (validated)
```powershell
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/queue/display/primary-care
```

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ accessCode = 'PRO1234'; verifyCode = 'PRO1234!!' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
$csrf = $login.csrfToken
$headers = @{ 'X-CSRF-Token' = $csrf }
$defs = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/definitions' -Method Get -WebSession $session
$create = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/tickets' -Method Post -Body (@{ department = 'primary-care'; patientDfn = '46'; patientName = 'PROGRAMMER,ONE'; priority = 'high' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/call-next' -Method Post -Body (@{ department = 'primary-care'; windowNumber = 'Room-1' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/queue/tickets/{0}/serve" -f $create.ticket.id) -Method Post -Body (@{ providerDuz = '1' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/queue/tickets/{0}/complete" -f $create.ticket.id) -Method Post -Headers $headers -WebSession $session
$labDef = $defs.definitions | Where-Object { $_.department -eq 'laboratory' } | Select-Object -First 1
$start = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/workflows/start' -Method Post -Body (@{ definitionId = $labDef.id; patientDfn = '46'; queueTicketId = $create.ticket.id } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/{1}" -f $start.instance.id, $start.instance.steps[0].stepId) -Method Post -Body (@{ action = 'complete'; notes = 'Phase 592 live verification' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/tickets?dept=primary-care' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/workflows/instances' -Method Get -WebSession $session
```

## Verifier output
- Live route verification passed for workflow definitions, packs, stats, queue departments, queue lifecycle, workflow step progression, and queue display board
- Restart persistence proof passed: the created primary-care queue ticket and workflow instance remained visible after API restart
- `scripts/verify-latest.ps1` initially failed on stale phase-index generation and two new TypeScript issues; both were fixed during Phase 592 completion

# Phase 593 Summary - Workflow Step Execution TIU

## What changed
1. Added the Phase 593 prompt set for truthful workflow step execution:
- `prompts/593-PHASE-593-WORKFLOW-STEP-EXECUTION-TIU/593-01-IMPLEMENT.md`
- `prompts/593-PHASE-593-WORKFLOW-STEP-EXECUTION-TIU/593-99-VERIFY.md`

2. Turned workflow step completion into a real execution path where it is already safe to do so:
- `apps/api/src/workflows/types.ts` now records per-step `integrationOutcome`
- `apps/api/src/workflows/workflow-routes.ts` now executes TIU-backed steps through `tiuExecutor` when the step references `TIU CREATE RECORD` and the request supplies note content
- unsupported workflow RPC steps remain explicit `integration-pending` responses instead of fake success

3. Made the workflow admin page operational rather than observational:
- `apps/web/src/app/cprs/admin/workflows/page.tsx` now lets admins start workflows from the Definitions tab
- the Instances tab can complete or skip active steps
- TIU-backed steps now collect title + note text and surface the returned integration outcome inline

4. Fixed the note-title picker contract exposed during live verification:
- `apps/api/src/routes/cprs/tiu-notes.ts` now filters non-title rows from `TIU PERSONAL TITLE LIST`
- VEHU runtime errors from that RPC now fall back cleanly to `GENERAL NOTE` instead of leaking garbage rows into the UI

## Manual test commands (validated)
```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ accessCode = 'PRO1234'; verifyCode = 'PRO1234!!' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
$csrf = $login.csrfToken
$headers = @{ 'X-CSRF-Token' = $csrf }
$defs = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/definitions' -Method Get -WebSession $session
$radDef = $defs.definitions | Where-Object { $_.department -eq 'radiology' -and $_.name -eq 'Radiology Standard Exam' } | Select-Object -First 1
$start = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/workflows/start' -Method Post -Body (@{ definitionId = $radDef.id; patientDfn = '46' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
foreach ($step in @('rad-checkin','rad-verify','rad-prep','rad-exam','rad-read')) {
	Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/{1}" -f $start.instance.id, $step) -Method Post -Body (@{ action = 'complete'; notes = "Phase 593 verification $step" } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
}
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/rad-report" -f $start.instance.id) -Method Post -Body (@{ action = 'complete'; notes = 'Radiology report drafted from workflow'; integration = @{ tiu = @{ titleIen = '10'; text = 'Workflow-generated radiology draft note for DFN 46 on live verification.' } } } | ConvertTo-Json -Depth 6 -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/cprs/notes/titles' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/cprs/notes/text?ien=14345' -Method Get -WebSession $session
```

## Verifier output
- Live proof passed: radiology workflow completed end-to-end for DFN 46 and the final `rad-report` step returned `integration.mode = tiu_draft`, `status = completed`, and `docIen = 14345`
- Live proof passed: `rad-verify` remained truthfully `integration-pending` for `ORWDXR NEW ORDER`
- Live proof passed: `/vista/cprs/notes/titles` now returns the fallback `GENERAL NOTE` title when VEHU emits unusable personal-title rows
- `scripts/verify-latest.ps1`: 15 PASS / 0 FAIL / 0 SKIP (`RC_READY`)

## Current blocker
- Most non-TIU workflow step integrations are still intentionally pending until their live VistA parameter contracts are proven and wired.

## Follow-ups
1. Wire additional workflow steps to proven execution paths starting with the safest already-grounded domains after TIU.
2. Fix or replace the underlying `TIU PERSONAL TITLE LIST` sandbox behavior if a richer personal title picker is required in VEHU.
3. Re-run the full verifier after Phase 593 docs and route changes are finalized.

## Current blocker
- Workflow step completion remains stateful and truthful, but it still does not invoke real VistA writeback RPCs for the referenced clinical actions.

## Follow-ups
1. Wire selected workflow steps to real VistA-backed write actions where the referenced RPC is proven in VEHU.
2. Consider moving department queue config from the in-memory fallback catalog into a durable tenant-scoped repository if admin editing becomes operationally important.
3. Keep `/queue/display/:dept` available as the public kiosk contract when future module-guard changes are made.

# Phase 597 Summary - Labs Order Entry Truthfulness

## What changed
1. Added the Phase 597 prompt set for chart-native lab order entry:
- `prompts/597-PHASE-597-LABS-ORDER-ENTRY-TRUTHFULNESS/597-01-IMPLEMENT.md`
- `prompts/597-PHASE-597-LABS-ORDER-ENTRY-TRUTHFULNESS/597-99-VERIFY.md`

2. Extended `apps/web/src/stores/data-cache.tsx` with a live lab-order mutation helper:
- posts to `/vista/cprs/orders/lab`
- includes CSRF and idempotency headers
- mirrors real or draft results into the shared orders cache so the chart reflects the submission immediately

3. Extended `apps/web/src/components/cprs/panels/LabsPanel.tsx` with a working `+ New Lab Order` composer:
- free-text lab request entry
- optional advanced quick-order IEN entry for provisioned lanes
- truthful status messaging for real placement vs VEHU draft fallback

4. Updated `apps/web/src/actions/actionRegistry.ts` with a visible `labs.order` write action and added a focused runbook at `docs/runbooks/vista-rpc-add-lab-order.md`.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/lab -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d '{"dfn":"46","labTest":"CBC"}'
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

## Current blocker
- Default VEHU still lacks configured LRZ lab quick orders, so the live route returns a truthful server-side draft unless a valid quick-order IEN is provisioned.

## Follow-ups
1. Provision real lab quick orders in the active VistA lane if direct unsigned order creation must replace the current truthful draft fallback.
2. If a provisioned lane is introduced, extend the Labs panel to fetch and present a selectable quick-order catalog instead of relying on manual IEN entry.

# Phase 598 Summary - Inpatient Workspace Recovery

## What changed
1. Added the Phase 598 prompt set for inpatient workflow recovery:
- `prompts/598-PHASE-598-INPATIENT-WORKSPACE-RECOVERY/598-01-IMPLEMENT.md`
- `prompts/598-PHASE-598-INPATIENT-WORKSPACE-RECOVERY/598-99-VERIFY.md`

2. Extended `apps/web/src/app/cprs/inpatient/page.tsx` so the `ADT & Discharge Prep` tab can reopen existing work instead of forcing clinicians to restart:
- added recovery lists for medication-reconciliation sessions and discharge plans
- added explicit `Load`, `Refresh Lists`, and `Clear Loaded Workspace` controls
- wired the workspace to load real detail from `/vista/med-rec/session/:id` and `/vista/discharge/plan/:id`

3. Kept the recovery flow truthful and workflow-consistent:
- recovery list data comes from `/vista/med-rec/sessions` and `/vista/discharge/plans?dfn=` rather than a frontend-only cache
- loading a discharge plan also reloads the linked med-rec session when one exists
- list state refreshes after med-rec and discharge mutations so the UI always reflects the saved backend state

4. Updated `docs/runbooks/phase168-inpatient-depth.md` so the documented inpatient posture now includes recovery and resume behavior for active discharge-prep work.

## Manual test commands (validated)
```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
Set-Content -Path medrec-start.json -Value '{"dfn":"46","outpatientMeds":[{"medicationName":"Lisinopril 10mg","dose":"10 mg","route":"PO","frequency":"daily","source":"patient-reported","status":"active"}]}' -NoNewline -Encoding ASCII
$medStart = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/med-rec/start -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@medrec-start.json"
$medRecId = (($medStart | ConvertFrom-Json).session.id)
Set-Content -Path discharge-plan.json -Value ('{"dfn":"46","targetDate":"' + (Get-Date).ToString('yyyy-MM-dd') + '","disposition":"Home","medRecSessionId":"' + $medRecId + '"}') -NoNewline -Encoding ASCII
$planCreate = curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@discharge-plan.json"
$planId = (($planCreate | ConvertFrom-Json).plan.id)
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/med-rec/sessions
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/med-rec/session/$medRecId
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/discharge/plans?dfn=46"
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/discharge/plan/$planId
Remove-Item login-body.json,cookies.txt,medrec-start.json,discharge-plan.json -ErrorAction SilentlyContinue
```

## Current blocker
- VEHU still does not provide `DG ADT DISCHARGE`, `PSO UPDATE MED LIST`, or `PSJ LM ORDER UPDATE`, so recovery resumes truthful workflow state but not final VistA discharge or medication writeback.

## Follow-ups
1. If the inpatient workspace should survive across devices or API restarts with richer clinician ownership, move med-rec and discharge plan storage from the current in-memory clinical stores to the existing production persistence path defined for those domains.
2. If inpatient users need even faster chart recovery, add census-driven patient selection on top of the new resume controls so reopening active work starts from the current admitted-patient list.
