# Research: First administration/control slice — VistA truth and repo state

> **Purpose:** Support planning of the first governed admin/control slice. VistA-facing code and sources only as needed. No implementation.

---

## 1. Candidate slices (from stage brief)

| Candidate | Description |
|-----------|-------------|
| User account management | Create/edit/deactivate users, link to File 200 |
| **Security keys/roles overview** | **Read-only visibility of security keys (and optionally key–user mapping)** |
| Wards/rooms/beds setup visibility | Read (and later edit) of LOCATION file, census |
| Facility/division/clinic configuration visibility | Institutions, divisions, clinics (File 44, etc.) |
| Sign-on / verify code / e-signature management visibility | AV codes, verify codes, e-sig (sensitive; often audit-only) |
| Menu/options/parameters visibility | File 19 OPTION, parameters |

---

## 2. Repo state: VistA admin surface

### 2.1 API routes (`apps/api/src/routes/vista-admin.ts`)

- **User management:** `GET /vista/admin/users`, `GET /vista/admin/user/:ien`, `POST .../edit`, `.../add-key`, `.../remove-key`, `.../deactivate`, `.../reactivate`.
- **Keys:** `GET /vista/admin/keys` — calls **VE KEY LIST** (custom RPC).
- **Menus:** `GET /vista/admin/menus` — calls **VE MENU LIST** (custom RPC).
- **Facility/org:** institutions, divisions, services, clinics, wards, appointment-types, etc. — all use **VE *** custom RPCs (e.g. VE INST LIST, VE CLIN LIST, VE WARD LIST).

All these endpoints use `safeCallRpc` with **VE*** RPC names. Comments reference **ZVEUSER.m** (user/keys), **ZVEFAC.m** (facility).

### 2.2 RPC registry (`apps/api/src/vista/rpcRegistry.ts`)

- **VE USER LIST**, **VE USER DETAIL**, **VE KEY LIST**, **VE MENU LIST** are in RPC_REGISTRY (domain `admin-users`).
- **VE KEY LIST** (and other VE* admin) are also in **RPC_EXCEPTIONS** with reason: "Custom admin RPC (ZVEUSER.m) for security key listing" — i.e. not in Vivian index; allowlisted for use.
- **XUS ALLKEYS** exists in `apps/api/src/routes/vista/xus.ts` (Kernel): takes `ien` (user IEN) and `flag`, returns keys for that user. Standard Kernel; likely present in WorldVistA/VEHU.

### 2.3 Frontend (`apps/web/src/app/cprs/admin/`)

- **vista-admin/page.tsx** — Single large admin page with tabs: System & Security (Users, Security Keys, Menu Assignments, TaskMan, Parameters), Facility Setup, Clinic Setup, Wards, etc.
- **System & Security** sub-tabs: Users, Security Keys, Menu Assignments. Data from `useDomainData('/vista/admin/users')`, `useDomainData('/vista/admin/keys')`.
- **vista/page.tsx** — Hub linking to `/cprs/admin/vista/users`, clinics, wards, etc. (separate detail pages exist under `vista/users`, `vista/clinics`, `vista/wards`).

### 2.4 VistA routines (services/vista)

- **ZVEUSR.m** present (user-related).
- **ZVEXUS.m** present (Kernel/XUS wrapper).
- Many other ZVE*.m routines. **VE KEY LIST** and **VE USER LIST** are expected to be exposed by one of these (or a companion installer) in the running VistA; they are **not** standard Kernel RPCs in File 8994 by default.

---

## 3. VistA source/manual truth (security keys)

- **File 19** — OPTION file (menu options).
- **File 19.1** — Security key structure (key names, hierarchy, descriptions). Kernel uses this for key checks.
- **File 200** — NEW PERSON. Keys assigned to users (e.g. multiple 200.051 key IENs per user).
- **Kernel:** Options like "Security Key" [XUS KEY], "Edit User Options" [XUSEREDIT]. RPC **XUS ALLKEYS** returns keys for a given user IEN (and flag).
- **Standard RPCs in sandbox:** XUS GET USER INFO, XUS KEY CHECK, XUS ALLKEYS (in xus.ts). Whether **VE KEY LIST** is registered in File 8994 depends on whether ZVEUSR (or equivalent) has been installed in the target VistA.

---

## 4. Why security keys/roles overview as first slice

- **Foundational:** Access control underlies all other admin (who can do what). Keys and roles are the first thing to make “real” before editing users or facilities.
- **Scopable:** Read-only list of security keys (and optionally “keys held by user X”) is one or two API surfaces and one UI panel. No write paths in slice 1.
- **Reuse:** Existing `GET /vista/admin/keys` and System & Security → Security Keys UI; we are not inventing a new area, we are **proving and bounding** it.
- **VistA truth:** Either (a) prove **VE KEY LIST** with ZVEUSR (or equivalent) installed in Docker, or (b) use **XUS ALLKEYS** for “keys for current user” / “keys for DUZ N” and document “full key catalog” as integration-pending until a routine is available. Both paths align to real Kernel/File 19.1.
- **Risks manageable:** If VE KEY LIST is missing, we explicitly return integration-pending and optionally show a Kernel-backed partial view (e.g. keys for logged-in user). No silent stub.

---

## 5. Risks/conflicts (current repo)

- **VE* RPCs may be absent in sandbox:** WorldVistA/VEHU may not have ZVEUSR or VE KEY LIST registered. Verification must handle “RPC not found” and surface it as integration-pending.
- **Large vista-admin page:** System & Security tab mixes Users, Keys, Menus, TaskMan, Parameters. First slice should touch only the Keys surface (and possibly one minimal Users dependency, e.g. “keys for user”).
- **Duplicate entry points:** `/cprs/admin/vista-admin` (monolithic) vs `/cprs/admin/vista` (hub) and `/cprs/admin/vista/users` etc. Slice can target one canonical route (e.g. vista-admin System & Security → Keys) and document the other as out of scope for slice 1.

---

## 6. Relation to other docs

- **Build order** — `docs/governance/PROOF-AND-GOVERNANCE.md` (Stage 6 = system administration/control slices).
- **Slice planning** — `docs/canonical/slices/slice-001-security-keys-overview.md`.
- **Verification** — `docs/canonical/verification-standard.md`, `docs/canonical/governed-build-protocol.md`.
