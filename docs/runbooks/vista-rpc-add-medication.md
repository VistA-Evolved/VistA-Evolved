# Runbook — Phase 8B: Add Medication (Write/CRUD)

> **Date:** 2026-02-12
> **Endpoint:** `POST /vista/medications`
> **RPCs:** `ORWDX LOCK`, `ORWDXM AUTOACK`, `ORWDX UNLOCK`

---

## 1. CPOE Complexity Assessment

VistA's Computerized Provider Order Entry (CPOE) is one of the most complex
subsystems in the EHR.  Full medication ordering in CPRS involves:

| Step | RPC | Purpose |
|------|-----|---------|
| 1 | `ORWDX LOCK` | Lock patient for ordering |
| 2 | `ORWDXM PROMPTS` | Get dialog prompts (20+ fields) |
| 3 | `ORWDX ORDITM` | Look up orderable item for drug |
| 4 | `ORWDX SAVE` | Save order (13 params, one is LIST with all dialog responses) |
| 5 | `ORWDXC SAVECHK` | Run order checks (drug interactions, allergies, duplicates) |
| 6 | `ORWDX SEND` | Sign/release order with electronic signature hash |
| 7 | `ORWDX UNLOCK` | Unlock patient |

The `ORWDX SAVE` RPC alone requires building an `ORDIALOG` array with responses
for each prompt:  Orderable Item, Dose, Route, Schedule, Priority, Quantity,
Refills, Routing (mail/window/clinic), Days Supply, Start Date, Comments,
Service Connected flag, Dispense Drug, Strength, and more.

**This is NOT feasible to replicate safely for an MVP.**

---

## 2. MVP Approach: AUTOACK with Quick Orders

The WorldVistA Docker sandbox includes 22 pre-configured "quick orders"
(`PSOZ *`) for outpatient medications.  These quick orders have all dialog
responses pre-filled (drug, dose, route, schedule, quantity, refills, etc.).

The `ORWDXM AUTOACK` RPC places a quick order without the full verify step:

```
AUTOACK(REC, ORVP, ORNP, ORL, ORIT)
  REC   — output: order record
  ORVP  — patient DFN
  ORNP  — provider DUZ
  ORL   — location IEN (2 = DR OFFICE)
  ORIT  — quick order IEN from ^ORD(101.41)
```

Internally, AUTOACK:
1. Looks up the display group from the quick order
2. Gets the default dialog for that display group
3. Loads the quick order's pre-filled responses
4. Calls `EN^ORCSAVE` to create the order
5. Returns the order record via `GETBYIFN^ORWORR`

---

## 3. Available Quick Orders

| IEN  | Name | Keywords |
|------|------|----------|
| 1638 | ASPIRIN CHEW | aspirin chew, aspirin chewable |
| 1639 | ASPIRIN TAB EC | aspirin, aspirin tab, aspirin ec |
| 1640 | ATENOLOL TAB | atenolol |
| 1641 | ATORVASTATIN TAB | atorvastatin, lipitor |
| 1642 | BENAZEPRIL TAB | benazepril |
| 1643 | CANDESARTAN TAB | candesartan |
| 1644 | CAPTOPRIL TAB | captopril |
| 1645 | CARVEDILOL TAB | carvedilol |
| 1646 | ENALAPRIL TAB | enalapril |
| 1647 | FLUVASTATIN XL TAB | fluvastatin, fluvastatin xl |
| 1648 | LISINOPRIL TAB | lisinopril |
| 1649 | LOSARTAN TAB | losartan |
| 1650 | LOVASTATIN TAB | lovastatin |
| 1651 | METOPROLOL TAB | metoprolol |
| 1652 | NADOLOL TAB | nadolol |
| 1653 | CLOPIDOGREL TAB | clopidogrel, plavix |
| 1654 | PRAVASTATIN TAB | pravastatin |
| 1655 | PROPRANOLOL TAB | propranolol |
| 1656 | ROSUVASTATIN TAB | rosuvastatin, crestor |
| 1657 | SIMVASTATIN TAB | simvastatin, zocor |
| 1658 | FLUVASTATIN CAP | fluvastatin cap |
| 1628 | WARFARIN | warfarin, coumadin |

---

## 4. Wire Protocol

### Step 1: Lock Patient
```
RPC: ORWDX LOCK
Params: [DFN]
Response: "1" on success, "0" or error on failure
```

### Step 2: AUTOACK
```
RPC: ORWDXM AUTOACK
Params: [DFN, DUZ, LocationIEN, QuickOrderIEN]
Response (array): order record lines
  Line 0: ~OrderIEN;status^displayGroup^dateTime^...^DUZ^providerName^...
  Line 1: tQuantity: N Refills: N *UNSIGNED*
```

### Step 3: Unlock Patient
```
RPC: ORWDX UNLOCK
Params: [DFN]
Response: "1" on success
```

---

## 5. API Examples

### Add medication (success)
```bash
curl -X POST http://127.0.0.1:3001/vista/medications \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","drug":"ASPIRIN"}'

# Response:
{
  "ok": true,
  "message": "Medication order created (unsigned): ASPIRIN TAB EC",
  "orderIEN": "137",
  "quickOrder": "ASPIRIN TAB EC",
  "rpcUsed": "ORWDXM AUTOACK"
}
```

### Drug not available
```bash
curl -X POST http://127.0.0.1:3001/vista/medications \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","drug":"AMOXICILLIN"}'

# Response:
{
  "ok": false,
  "error": "No matching quick order for \"AMOXICILLIN\"...",
  "availableDrugs": "ASPIRIN CHEW, ASPIRIN TAB EC, ATENOLOL TAB, ...",
  "hint": "Available quick-order drugs: ..."
}
```

### Validation error
```bash
curl -X POST http://127.0.0.1:3001/vista/medications \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
{
  "ok": false,
  "error": "Missing or non-numeric dfn",
  "hint": "Body: { \"dfn\": \"1\", \"drug\": \"ASPIRIN\" }"
}
```

---

## 6. Known Limitations

1. **Unsigned orders**: AUTOACK creates orders in `*UNSIGNED*` status.
   Signing requires `ORWDX SEND` with an electronic signature hash (verify
   code hashed via `$$HASH^XUSHSHP`), which is beyond MVP scope.

2. **Orders may not appear in GET /vista/medications**: `ORWPS ACTIVE` only
   returns pharmacy-verified active prescriptions.  Unsigned orders are in the
   OE/RR order file (`^OR(100)`) but not yet dispensed by pharmacy.

3. **Limited drug selection**: Only the 22 pre-configured quick orders in the
   WorldVistA Docker sandbox are available.  Full drug ordering requires
   building the complete ORDIALOG array — a 20+ field complex structure.

4. **Body params `sig` and `days` are ignored**: Quick orders have pre-filled
   dose, sig, schedule, quantity, and days supply.  Custom sig/days would
   require the full ORWDX SAVE flow with dialog responses.

5. **Location hardcoded**: Uses Location IEN 2 (DR OFFICE) from WorldVistA
   Docker.  Production would need location lookup.

---

## 7. CPOE Deep Dive (for future work)

### ORDIALOG Structure
The `ORDIALOG` list parameter for `ORWDX SAVE` uses prompt IENs as keys:

| Prompt IEN | Name | Description |
|-----------|------|-------------|
| 4 | OR GTX ORDERABLE ITEM | Drug/orderable item IEN |
| 136 | OR GTX INSTRUCTIONS | Dose text (e.g., "81MG") |
| 137 | OR GTX ROUTE | Route (e.g., "1" for oral) |
| 170 | OR GTX SCHEDULE | Schedule (e.g., "QD") |
| 7 | OR GTX URGENCY | Priority (e.g., "9" = routine) |
| 149 | OR GTX QUANTITY | Quantity dispensed |
| 148 | OR GTX ROUTING | Pickup method (W=window, M=mail) |
| 150 | OR GTX REFILLS | Number of refills |
| 387 | OR GTX DAYS SUPPLY | Days supply |
| 138 | OR GTX DISPENSE DRUG | Pharmacy drug IEN |
| 384 | OR GTX STRENGTH | Drug strength text |
| 385 | OR GTX SIG | Full sig text |
| 386 | OR GTX DOSE | Dose string (complex format) |
| 6 | OR GTX START DATE/TIME | Start date in FileMan format |

### Quick Order Response Structure
Quick orders store pre-filled responses in `^ORD(101.41,IEN,6,seq)`:
```
^ORD(101.41,1638,6,1,0) = "1^4^1"     → response 1: prompt 4 (OI), sequence 1
^ORD(101.41,1638,6,1,1) = "1222"       → orderable item IEN 1222
^ORD(101.41,1638,6,2,0) = "5^7^1"      → response 2: prompt 7 (urgency)
^ORD(101.41,1638,6,2,1) = "9"          → priority = 9 (routine)
```

### PSO OERR Dialog (IEN 147)
The outpatient medication dialog has 21 prompt entries covering all aspects
of outpatient prescriptions.  Each prompt has a sequence, required flag,
display text, and domain.  See `^ORD(101.41,147,10,*)` for the full structure.
