# Slice 001 — Implementation prompt (next step)

> **Use this as the exact implementation prompt for the next stage.** Do not start implementation until human approval to proceed. Planning is complete; implementation is not.

---

## Objective

Implement and verify **Slice 001: Security keys/roles overview (read-only)** per the planning pack. Deliver: API behavior (integration-pending when VE KEY LIST missing; real data when present), UI behavior (Keys tab shows data or integration-pending banner), and proof (terminal optional, RPC/API + browser required).

---

## Mandatory references

- **Slice plan:** `docs/canonical/slices/slice-001-security-keys-overview.md` (user story, scope, acceptance criteria, verification methods, human review checkpoints).
- **Research:** `docs/canonical/research/admin-slice-001-vista-truth-and-repo.md` (VistA truth, repo state, risks).
- **Wireframe:** `docs/canonical/wireframes/slice-001-security-keys-wireframe.md` (UI states and layout).
- **Governed build:** `docs/canonical/governed-build-protocol.md` (one slice, verification, no stub, evidence).
- **Verification standard:** `docs/canonical/verification-standard.md` (evidence requirements).

---

## Implementation tasks (in order)

1. **API**  
   - In `apps/api/src/routes/vista-admin.ts`, for `GET /vista/admin/keys`:  
     - Call `VE KEY LIST` via safeCallRpc.  
     - If RPC succeeds and returns data: return `ok: true`, `source: 'vista'`, `rpcUsed: ['VE KEY LIST']`, `data` (parsed list).  
     - If RPC fails or is missing (e.g. RPC not in File 8994): return `ok: false`, `status: 'integration-pending'`, `vistaGrounding: { rpc: 'VE KEY LIST', file: '19.1', note: '...' }`. Do not return a stub or empty array as success.  
   - Ensure response shape is consistent so the UI can distinguish success vs integration-pending vs error.

2. **UI**  
   - In `apps/web/src/app/cprs/admin/vista-admin/page.tsx`, Security Keys sub-tab:  
     - When API returns `ok: true` and `data`: render table of keys (name, description).  
     - When API returns `status: 'integration-pending'`: show a clear banner (e.g. warning) with the message from the plan; do not show an empty table as if data were loaded.  
     - When API errors (network, 500): show error state with optional retry.  
   - Reuse existing `useDomainData('/vista/admin/keys')` or equivalent; extend to handle integration-pending and error states explicitly.

3. **Verification**  
   - **RPC/API:** Run `GET /vista/admin/keys` with admin session (e.g. PowerShell or curl from planning pack). Capture response. Pass = real data or explicit integration-pending; fail = stub list or unclear state.  
   - **Browser:** Log in as admin, open System & Security → Security Keys. Pass = table with data or visible integration-pending banner.  
   - **Terminal (optional):** In roll-and-scroll terminal, run Security Key option if available; document result.  
   - **Evidence:** Commands run, response snippets, screenshot or test log. Write to `/artifacts/` (gitignored). Slice completion report: files changed, commands, results, verified/unverified, next step.

4. **Human review**  
   - After implementation: human confirms integration-pending path and (if applicable) live path; confirms no stub data.  
   - Before sign-off: human approves slice completion report and evidence; explicit approval to proceed to next slice.

---

## Out of scope (do not do in this slice)

- Write paths (add/remove key, edit user).
- User list/detail, menu list, facility, clinics, wards, parameters.
- New standalone Keys page.
- Stub or mock key list when RPC is missing.

---

## Success criteria (reminder)

- API returns either real VistA key list or explicit integration-pending (no silent stub).  
- Keys tab shows either key table or integration-pending banner (no fake success).  
- Evidence and slice completion report produced; human review checkpoint satisfied before next slice.
