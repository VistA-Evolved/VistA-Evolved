# Runbook — Phase 5C: Patient Allergies via `ORQQAL LIST`

> **RPC**: `ORQQAL LIST`
> **Context**: `OR CPRS GUI CHART`
> **Endpoint**: `GET /vista/allergies?dfn=<dfn>`

---

## 1. RPC Discovery

The allergy list is retrieved using the CPRS RPC **`ORQQAL LIST`**. It
accepts a single `LITERAL` parameter — the patient DFN — and returns one
line per allergy entry in the format:

```
id^allergen^severity^reactions
```

- **id** — internal allergy entry number (empty when "No Allergy Assessment")
- **allergen** — display name (e.g. `PEANUT OIL`)
- **severity** — `SEVERE`, `MODERATE`, or empty
- **reactions** — semicolon-separated list (e.g. `CHEST PAIN;HIVES`)

If the patient has no allergy assessment, the RPC returns:

```
^No Allergy Assessment
```

(Note the leading `^` — the id field is empty.)

---

## 2. Test Patient Data (WorldVistA Docker)

| DFN | Allergen     | Severity | Reactions         |
|-----|-------------|----------|-------------------|
| 1   | PEANUT OIL  | SEVERE   | CHEST PAIN; HIVES |
| 2   | PEANUT OIL  | (empty)  | HIVES             |
| 3   | PROBALANCE  | MODERATE | RASH              |

Invalid DFN (e.g. 99999) → `^No Allergy Assessment`

---

## 3. Verify with curl

```bash
# Happy path
curl http://127.0.0.1:3001/vista/allergies?dfn=1
# → {"ok":true,"count":1,"results":[{"id":"1","allergen":"PEANUT OIL","severity":"SEVERE","reactions":"CHEST PAIN;HIVES"}],"rpcUsed":"ORQQAL LIST"}

# Missing dfn → 400
curl http://127.0.0.1:3001/vista/allergies
# → {"ok":false,"error":"Missing dfn query parameter"}

# Non-numeric dfn → 400
curl http://127.0.0.1:3001/vista/allergies?dfn=abc
# → {"ok":false,"error":"dfn must be a positive integer"}
```

---

## 4. UI Behaviour

When a patient is selected from search results:

1. Demographics are fetched (Phase 5B).
2. Allergies are fetched from `/vista/allergies?dfn=<dfn>`.
3. An "Allergies" section appears below the Patient Header.
4. Each allergy shows: allergen name, severity (if present), and reactions
   (semicolons replaced with commas for display).
5. If count is 0, shows "No known allergies."
6. Loading and error states are handled separately from demographics.

---

## 5. Implementation Files

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | `GET /vista/allergies` endpoint |
| `apps/web/src/app/patient-search/page.tsx` | Allergy fetch + render |
| `apps/web/src/app/patient-search/page.module.css` | Allergy styles |
