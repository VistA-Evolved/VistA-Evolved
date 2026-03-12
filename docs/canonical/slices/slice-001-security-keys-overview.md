# Slice 001 — Security keys/roles overview (read-only)

> **First administration/control slice for the governed VistA build path.** Planning and scoping only; no implementation in this stage. Aligned to real VistA truth and existing repo routes.

---

## 1. User story

**As a** security officer or system administrator,  
**I want** to view a read-only list of security keys (and optionally which users hold a given key) from our VistA system,  
**so that** I can understand current access control without using the roll-and-scroll terminal.

---

## 2. Who uses it

- **Primary:** Security officers, VistA system administrators (admin role in the web app).
- **Secondary:** Auditors reviewing who has what access (read-only visibility).

---

## 3. Why it matters

- **Foundational:** Security keys (File 19.1, OPTION) define “who can do what” in VistA. A proven read-only keys overview is the base for later user management, role changes, and facility/clinic admin.
- **Governed build:** This slice establishes the pattern: one admin surface, VistA-backed RPC (or explicit integration-pending), terminal + RPC/API + browser verification, human review before the next slice.
- **No fake data:** If the RPC is missing or fails, the UI must show integration-pending (or a clear error), not a stub list.

---

## 4. VistA source/manual truth needed

- **File 19** — OPTION file (menu options).
- **File 19.1** — Security key definitions (key name, description, hierarchy).
- **File 200** — NEW PERSON; key assignments (e.g. 200.051).
- **Kernel:** RPC **XUS ALLKEYS** (keys for a user IEN + flag). Option “Security Key” [XUS KEY] for key management in roll-and-scroll.
- **Custom (if installed):** **VE KEY LIST** RPC (ZVEUSR.m or equivalent) returning a list of all keys (IEN^name^description or similar). May not exist in stock WorldVistA/VEHU; plan must allow integration-pending when absent.

---

## 5. Likely routines/options/files involved

| Item | Type | Purpose |
|------|------|--------|
| File 19 | VistA file | OPTION (menus/keys) |
| File 19.1 | VistA file | Security key structure |
| File 200 | VistA file | NEW PERSON (user key assignments) |
| XUS ALLKEYS | Kernel RPC | Keys for one user (standard; in xus.ts) |
| VE KEY LIST | Custom RPC | Full key list (ZVEUSR or similar; may be absent in sandbox) |
| Option XUS KEY | Kernel option | Security Key management (terminal) |

---

## 6. Current repo reuse opportunities

- **API:** `GET /vista/admin/keys` already exists; calls `VE KEY LIST`. Reuse route; add explicit handling when RPC is missing (return `ok: false`, `status: 'integration-pending'`, `vistaGrounding: { rpc: 'VE KEY LIST', ... }`).
- **Optional fallback:** Endpoint could call **XUS ALLKEYS** for a single user (e.g. current DUZ or query param `?duz=`) to show “keys for this user” when VE KEY LIST is not available; document as partial truth.
- **UI:** System & Security → Security Keys tab in `vista-admin/page.tsx` already uses `useDomainData('/vista/admin/keys')`. Reuse panel; ensure loading/error states show integration-pending when API returns it.
- **Auth:** Route already protected by `requireSession` + `requireRole(session, ['admin'])`. No change.

---

## 7. Current repo risks/conflicts

- **VE KEY LIST may not be registered** in File 8994 (WorldVistA/VEHU). All calls must assume RPC can fail; no silent fallback to mock data.
- **Monolithic vista-admin page:** Many tabs; slice touches only Keys (and minimal shared hooks). Avoid refactoring entire page in slice 1.
- **Duplicate routes:** `/cprs/admin/vista-admin` vs `/cprs/admin/vista` and `/cprs/admin/vista/users`. Slice scope: canonical entry for Keys is **System & Security → Security Keys** on the vista-admin page; other entry points out of scope for slice 1.

---

## 8. Modern UI reference ideas

- **Read-only table:** Keys list with columns e.g. Key name, Description, (optional) Holders count or “View holders” link. Sort/filter by name; search box.
- **Status banner:** When API returns integration-pending, show a clear banner: “Security key list is not yet available from VistA. Install VE KEY LIST RPC or use terminal option XUS KEY.”
- **Optional “Keys for user”:** Dropdown or user picker + “Show keys for this user” using XUS ALLKEYS (if we add that path); keeps scope to read-only.
- **No cards/dashboards:** Keep to one table + one status/error area; no executive dashboard or charts in this slice.

---

## 9. Exact scope boundaries

**In scope (slice 1):**

- **API:** `GET /vista/admin/keys` — proven against live VistA: either (a) VE KEY LIST returns data and we return it, or (b) RPC missing/fails and we return integration-pending with vistaGrounding. No stub list.
- **UI:** System & Security → Security Keys tab: load keys from API; show table when `ok: true`; show integration-pending banner when API returns integration-pending; show error state on other failures.
- **Verification:** Terminal (optional: run Security Key option in roll-and-scroll to confirm keys exist); RPC/API (curl with admin session to `/vista/admin/keys`); browser (open Keys tab, confirm content or banner).

**Out of scope (slice 1):**

- Adding/removing keys for users (write paths).
- User account list/detail (separate slice).
- Menu/options list (separate slice).
- Facility, clinic, wards, parameters (separate slices).
- New dedicated “Keys only” page (reuse existing tab).

---

## 10. Acceptance criteria

1. **API:** With admin session, `GET /vista/admin/keys` returns either (a) `ok: true`, `source: 'vista'`, `rpcUsed: ['VE KEY LIST']`, and a non-stub key list from VistA, or (b) `ok: false`, `status: 'integration-pending'`, and `vistaGrounding` describing the missing RPC/file. No silent stub.
2. **UI:** Security Keys tab loads; displays key table when API returns data; displays a clear integration-pending message when API returns integration-pending; displays error state when API errors.
3. **Terminal:** (Optional) In roll-and-scroll terminal, option XUS KEY (or equivalent) shows keys; documented as supporting evidence.
4. **Evidence:** Commands run, responses captured, pass/fail recorded per governed-build protocol.

---

## 11. Terminal verification method

- **Action:** Log in to web app as admin, open roll-and-scroll terminal (`/cprs/vista-workspace` → Terminal), sign in to VistA, run Kernel option **Security Key** (e.g. `D ^XUSKEY` or menu path to key management).
- **Pass:** Option runs and displays key list or key management screen from VistA.
- **Evidence:** Command(s) and screenshot or log excerpt under `/artifacts/` (gitignored). If option is not available in sandbox, document and still require API/UI to show integration-pending when RPC is missing.

---

## 12. RPC/API verification method

- **Action:** Log in via API (POST `/auth/login`), then `GET /vista/admin/keys` with session cookie (or Bearer).
- **Pass:** Response has `ok: true` and `rpcUsed` including the RPC used, and `data` is from VistA; or `ok: false` with `status: 'integration-pending'` and no fake list.
- **Evidence:** Exact curl or PowerShell; response body (or key fields). See `docs/canonical/verification-standard.md`.

Example (PowerShell):

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -ContentType 'application/json' -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/admin/keys' -WebSession $session
```

---

## 13. Browser verification method

- **Action:** Log in to web app as admin, go to `/cprs/admin/vista-admin`, open **System & Security**, then **Security Keys** tab.
- **Pass:** Tab loads; either (a) table of keys from VistA, or (b) visible integration-pending banner when API returned integration-pending. No blank table with no message, no stub data.
- **Evidence:** Screenshot or Playwright step; URL and steps documented.

---

## 14. Human review checkpoints

1. **After API behavior is implemented:** Human confirms that integration-pending path is implemented (no stub list) and that live VistA path (if RPC exists) returns real data.
2. **After UI behavior is implemented:** Human confirms Keys tab shows either data or integration-pending banner; no fake success.
3. **Before slice sign-off:** Human confirms all verification evidence (terminal optional, RPC/API and browser required) is present and slice completion report is filled. Explicit approval to proceed to next slice.

---

## 15. Relation to other docs

- **Research** — `docs/canonical/research/admin-slice-001-vista-truth-and-repo.md`
- **Wireframe/scope** — `docs/canonical/wireframes/slice-001-security-keys-wireframe.md`
- **Governed build** — `docs/canonical/governed-build-protocol.md`
- **Verification** — `docs/canonical/verification-standard.md`
- **Build order** — `docs/governance/PROOF-AND-GOVERNANCE.md` (Stage 6)
