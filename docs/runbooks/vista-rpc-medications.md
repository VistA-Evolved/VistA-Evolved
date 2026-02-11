# Runbook — Phase 8A: Medications List (ORWPS ACTIVE)

> GET /vista/medications?dfn=<DFN> — active medications for a patient

---

## RPC Discovery

Medication-related RPCs found via `^XWB(8994,"B")` scan:

| RPC | IEN | Entry Point | Notes |
|-----|-----|-------------|-------|
| **ORWPS ACTIVE** | 347 | `ACTIVE^ORWPS` | Active inpatient & outpatient meds |
| **ORWPS COVER** | 538 | `COVER3^C0PWPS` | Cover sheet meds (less detail) |
| **ORWORR GETTXT** | 573 | `GETTXT^ORWORR` | Order display text (drug name + sig + qty) |

---

## Wire Format — ORWPS ACTIVE

**Parameters**: 1 LITERAL param — `DFN` (patient IEN).

**Response**: Multi-line, grouped by medication. Each med has:

1. **Header line** starting with `~`:
   ```
   ~TYPE^rxIEN;kind^drugName^?^?^?^?^?^orderIEN^status^?^?^qty^?^?
   ```
   - `TYPE` = OP (outpatient), NV (non-VA), UD (unit dose), IV, CP (clinic)
   - `rxIEN;kind` = Pharmacy Rx IEN + type (`P`=pending, `R`=refill) + `;O`=outpatient
   - `drugName` = Drug name from `^PSDRUG` (empty in WorldVistA Docker — see note below)
   - `orderIEN` = IEN in `^OR(100)` — used to look up drug name via ORWORR GETTXT
   - `status` = e.g., `PENDING`, `ACTIVE`
   - `qty` = Quantity

2. **Continuation lines**:
   - `   Qty: N` — quantity
   - `\ Sig: text` — instructions/sig

### Example (DFN=1):
```
~OP^11P;O^^^^^^^96^PENDING^^^30^^0
   Qty: 30
\ Sig: TAKE ONE CAPSULE BY MOUTH EVERY DAY
```

---

## Drug Name Resolution — ORWORR GETTXT

In the WorldVistA Docker image, `^PSDRUG` entries are incomplete, so the drug name
in ORWPS ACTIVE piece 2 is often empty. To resolve the drug name, call:

**ORWORR GETTXT** with 1 LITERAL param — the order IEN.

**Response** (3 lines):
```
ACEBUTOLOL CAP,ORAL  200MG          ← Line 0: drug name + strength
TAKE 1 CAPSULE BY MOUTH EVERY DAY   ← Line 1: sig
Quantity: 30 Refills: 3              ← Line 2: qty + refills
```

---

## Implementation Strategy

1. Call `ORWPS ACTIVE` with DFN → parse header lines for order IEN, status, qty
2. For each med with empty drug name, call `ORWORR GETTXT` with order IEN
3. Combine into `{ id, name, sig, status }` result objects

All calls happen within a single authenticated RPC broker session.

---

## API

```
GET /vista/medications?dfn=1
```

**Success response**:
```json
{
  "ok": true,
  "count": 1,
  "results": [
    {
      "id": "11P",
      "name": "ACEBUTOLOL CAP,ORAL  200MG",
      "sig": "TAKE ONE CAPSULE BY MOUTH EVERY DAY",
      "status": "pending"
    }
  ],
  "rpcUsed": "ORWPS ACTIVE"
}
```

**Validation error** (no dfn):
```json
{
  "ok": false,
  "error": "Missing or non-numeric dfn query parameter",
  "hint": "Example: /vista/medications?dfn=1"
}
```

---

## Test Commands

```powershell
# List medications for patient DFN=1
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/medications?dfn=1"

# cURL equivalent
curl http://127.0.0.1:3001/vista/medications?dfn=1
```

---

## Known Issue: Empty Drug Names in WorldVistA Docker

The `^PSDRUG` file in the WorldVistA Docker image has incomplete data for many
IENs (e.g., IEN 94657 is empty). The routine `OCL^PSOORRL` reads drug names from
`$P($G(^PSDRUG(+$P(RX0,"^",6),0)),"^")` — when that's empty, piece 2 in the
ORWPS ACTIVE output is blank.

The fallback via `ORWORR GETTXT` resolves this by reading from the order's
orderable item via `GETTXT^ORWORR`.

---

## Source Reference

- `ORWPS.m` line 19: `ACTIVE(LST,DFN,USER,VIEW,UPDATE)` — calls `OCL^PSOORRL`
- `ORWORR.m`: `GETTXT(LST,ID)` — assembles order display text
- `PSOORRL.m` line 48: Drug name lookup from `^PSDRUG` / `^PS(50.7)` / `^PS(50.606)`
