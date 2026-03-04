# Runbook — Add Vitals via `GMV ADD VM` RPC (Phase 6B)

## Objective

Record a new vital sign measurement for a patient using the **GMV ADD VM**
RPC (entry point `EN1^GMVDCSAV`).

---

## Prerequisites

| Item         | Detail                                           |
| ------------ | ------------------------------------------------ |
| VistA Docker | `docker compose --profile dev up -d` (port 9430) |
| API server   | `pnpm -C apps/api dev` (port 3001)               |
| Credentials  | `apps/api/.env.local` with `PROV123 / PROV123!!` |

---

## API Endpoint

```
POST /vista/vitals
Content-Type: application/json

{
  "dfn":   "1",
  "type":  "BP",
  "value": "120/80"
}
```

### Request Body

| Field   | Required | Description                                                           |
| ------- | -------- | --------------------------------------------------------------------- |
| `dfn`   | Yes      | Patient DFN (internal entry number)                                   |
| `type`  | Yes      | Vital type abbreviation: `BP`, `T`, `P`, `R`, `HT`, `WT`, `PO2`, `PN` |
| `value` | Yes      | Reading value (e.g., `120/80` for BP, `98.6` for T, `72` for P)       |

### Vital Type IENs (File 120.51)

| Abbreviation | IEN | Description    |
| ------------ | --- | -------------- |
| BP           | 1   | Blood Pressure |
| T            | 2   | Temperature    |
| R            | 3   | Respiration    |
| P            | 5   | Pulse          |
| HT           | 8   | Height         |
| WT           | 9   | Weight         |
| PO2          | 21  | Pulse Oximetry |
| PN           | 22  | Pain           |

---

## Under the Hood

### RPC: `GMV ADD VM`

Entry point: `EN1^GMVDCSAV` in routine `GMVDCSAV.m`.

Takes a **single literal string** parameter (`GMVDATA`) with format:

```
datetime^DFN^vitalTypeIEN;reading;^hospitalLocation^DUZ
```

Example:

```
3250615.1430^1^1;120/80;^2^87
```

Breakdown:

- `3250615.1430` — FileMan date (June 15 2025 at 14:30). YYY = year − 1700.
- `1` — Patient DFN
- `1;120/80;` — Vital type IEN 1 (BP), reading "120/80", semicolons as delimiters
- `2` — Hospital location IEN (DR OFFICE)
- `87` — DUZ (Provider CLYDE WV)

### FileMan Date Format

```
YYYMMDD.HHMM
```

- `YYY` = Gregorian year − 1700 (e.g., 2025 → 325)
- `MM` = Month, zero-padded
- `DD` = Day, zero-padded
- `HHMM` = Hours and minutes, zero-padded (24-hour)

The API computes this at request time using `new Date()`.

---

## Verification

### 1. curl POST — add a BP reading

```bash
curl -s -X POST http://127.0.0.1:3001/vista/vitals \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","type":"BP","value":"130/85"}' | jq .
```

Expected:

```json
{
  "ok": true,
  "message": "Vital recorded",
  "type": "BP",
  "value": "130/85",
  "rpcUsed": "GMV ADD VM"
}
```

### 2. curl GET — confirm it appears in the list

```bash
curl -s "http://127.0.0.1:3001/vista/vitals?dfn=1" | jq .
```

The new BP 130/85 should appear in the results array.

### 3. Validation errors

```bash
# Missing value
curl -s -X POST http://127.0.0.1:3001/vista/vitals \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","type":"BP","value":""}' | jq .

# Invalid type
curl -s -X POST http://127.0.0.1:3001/vista/vitals \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","type":"XYZ","value":"99"}' | jq .
```

Both should return `"ok": false` with descriptive error messages.

---

## Troubleshooting

| Symptom                                          | Cause                         | Fix                                             |
| ------------------------------------------------ | ----------------------------- | ----------------------------------------------- |
| `ok: false, error: "Missing or non-numeric dfn"` | Bad or missing dfn            | Ensure body has numeric dfn                     |
| `ok: false, error: "Invalid vital type..."`      | Unsupported type abbreviation | Use one of: BP, T, P, R, HT, WT, PO2, PN        |
| `ok: false, error: "...ERROR..."`                | VistA rejected the data       | Check value format matches vital type           |
| 608 Job ended                                    | Protocol framing              | Check rpcBrokerClient.ts framing bytes          |
| ECONNREFUSED                                     | Docker not running            | Start with `docker compose --profile dev up -d` |

---

## Files Modified (Phase 6B)

| File                                              | Change                                                      |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `apps/api/src/index.ts`                           | Added `POST /vista/vitals` route with `GMV ADD VM` RPC call |
| `apps/web/src/app/patient-search/page.tsx`        | Added vital recording form (type dropdown + value input)    |
| `apps/web/src/app/patient-search/page.module.css` | Styles for add vital form                                   |
| `docs/runbooks/vista-rpc-add-vitals.md`           | This runbook                                                |
