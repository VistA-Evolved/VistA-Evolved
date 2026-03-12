# Slice 001 — Security keys overview: wireframe / scope

> **Lightweight wireframe and UI scope.** Read-only; no new page — reuse System & Security → Security Keys tab.

---

## 1. Screen: System & Security → Security Keys tab

**Route:** `/cprs/admin/vista-admin` → tab **System & Security** → sub-tab **Security Keys**.

**States:**

1. **Loading** — Spinner or skeleton; “Loading security keys…”
2. **Success** — Table with columns: Key name (or IEN), Description. Optional: sort by name, search/filter. Source: `GET /vista/admin/keys` with `ok: true`, `data: [...]`.
3. **Integration-pending** — Banner (e.g. warning style): “Security key list is not yet available from VistA. Ensure VE KEY LIST RPC is installed, or use the terminal option XUS KEY.” No table with empty or fake rows.
4. **Error** — Message from API (e.g. “VistA unavailable”, “RPC failed”). Retry control optional.

---

## 2. Layout (minimal)

```
[ System & Security ]  [ Facility ]  [ Clinics ]  ...  (existing tabs)

  [ Users ]  [ Security Keys ]  [ Menu Assignments ]  ...  (existing sub-tabs)

  ┌─────────────────────────────────────────────────────────────┐
  │  Security Keys                                              │
  │  (Optional: [ Search keys... ]  [ Sort: Name ▼ ])            │
  ├─────────────────────────────────────────────────────────────┤
  │  [ Success: table ]                                         │
  │  | Name        | Description                    |            │
  │  | KEYNAME     | Key description from VistA     |            │
  │  | ...         | ...                            |            │
  │                                                             │
  │  OR [ Integration-pending banner ]                          │
  │  OR [ Error message + optional Retry ]                      │
  └─────────────────────────────────────────────────────────────┘
```

---

## 3. Out of scope (this slice)

- “Keys for user X” picker (can be later slice).
- Add/remove key (write).
- Key detail/edit modal.
- New standalone page `/cprs/admin/vista/keys`.

---

## 4. Reference

- **Slice plan** — `docs/canonical/slices/slice-001-security-keys-overview.md`
- **Existing UI** — `apps/web/src/app/cprs/admin/vista-admin/page.tsx` (subTab === 'keys').
