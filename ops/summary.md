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
