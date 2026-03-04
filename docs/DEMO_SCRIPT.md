# Hospital Demo Script (20 Minutes)

> **Audience:** Hospital CFO, clinical leadership, IT director
> **System:** VistA-Evolved with VEHU sandbox + platform PG
> **Prerequisites:** `pnpm seed:demo` has been run, API + Web running

---

## Before the Demo

```powershell
# Verify everything is running
curl.exe -s http://localhost:3001/health     # API health
curl.exe -s http://localhost:3000            # Web app
pnpm seed:demo                               # Idempotent -- safe to re-run
```

Open browser to `http://localhost:3000` and have login ready.

---

## Minute 1-2: Login & Patient Search

**Story:** "Let me show you how fast a provider can find and open a patient chart."

1. **Login** with `PRO1234` / `PRO1234!!` (sandbox credentials auto-fill)
2. Click **Patient Search** in the sidebar
3. Type `EIGHT` in the search box
4. Point out: **44 patients** returned in under 1 second
5. **Click on EIGHT,PATIENT** (DFN 3) to open the chart

**Talking points:**
- Real-time search against VistA via RPC Broker protocol
- Same RPC (`ORWPT LIST ALL`) that CPRS uses
- Full patient list from VEHU with 800+ synthetic patients

---

## Minute 3-5: Clinical Coversheet

**Story:** "This is the provider's at-a-glance view -- everything they need."

1. The **Coversheet** loads automatically when opening a patient
2. Walk through each section:
   - **Allergies** (3 documented allergies)
   - **Active Medications** (7 meds -- point out drug names, doses, routes)
   - **Vitals** (9 recent vital readings -- BP, HR, temp, SpO2)
   - **Notes** (14 clinical notes from various encounters)
3. Click on a medication to show detail view
4. Click on a vital to show trending

**Talking points:**
- All data comes directly from VistA -- no data duplication
- Each widget calls a real VistA RPC (ORWCH ALLERGT, ORWPS ACTIVE, etc.)
- Sub-second response times with connection pooling
- Problem list may be empty for some VEHU patients (realistic -- not all patients have coded problems)

---

## Minute 6-8: CPOE (Computerized Provider Order Entry)

**Story:** "Ordering is where safety and efficiency meet."

1. Navigate to the **Orders** tab
2. Show the **active orders** list
3. Click **New Order** (or the + button)
4. Show the order dialog:
   - Select order type (lab, medication, consult)
   - Search for a lab: type `CBC`
   - Point out the order detail fields
5. **Note:** Order signing requires an electronic signature code
   - In production, this connects to `ORWDX SAVE` and `ORWOR1 SIG` RPCs
   - Demo shows the order form and validation workflow

**Talking points:**
- CPOE follows CPRS workflow exactly -- providers won't need retraining
- Order dialogs call `ORWDXM DLGNAME`, `ORWDX WRLST` for order sets
- Electronic signature is required for all orders (regulatory compliance)
- Orders panel shows "integration pending" status where VistA write RPCs aren't yet wired

---

## Minute 9-11: Inpatient View

**Story:** "Nursing and bed management see the same VistA data."

1. Navigate to **ADT/Census** (if available in sidebar)
2. Show the ward list or patient census
3. Point out:
   - Inpatient patients (VEHU has `*,INPATIENT` patients like EIGHT,INPATIENT)
   - Bed assignments
   - Movement history

**Talking points:**
- ADT data from VistA File 405 (Patient Movement)
- Custom ZVEADT routine provides ward census, bed board, movement history
- Same data that CPRS ADT uses, exposed through modern web interface

> **If ADT panel shows "integration pending":** "This module is staged for
> VistA ADT RPC integration. The routing and UI are built -- we're wiring
> the remaining VistA RPCs in the next sprint."

---

## Minute 12-14: Nursing & Medication Administration

**Story:** "Nurses need barcode scanning and eMAR -- let's see what's there."

1. Navigate back to EIGHT,PATIENT chart
2. Open the **Medications** tab
3. Show the medication list with administration details
4. Point out active vs. discontinued meds
5. Discuss the eMAR workflow:
   - Medication name, dose, route, schedule
   - Administration recording (pending VistA writeback)

**Talking points:**
- Medication list from `ORWPS ACTIVE` RPC -- same as CPRS Meds tab
- 7 active medications on this patient with full detail
- eMAR barcode scanning and administration recording are planned features
- Foundation is in place: we read meds, next step is write-back

---

## Minute 15-17: Billing & PhilHealth Claims

**Story:** "Now let's talk revenue. Here's the billing dashboard."

1. Navigate to **Admin > RCM** (Revenue Cycle Management)
2. Show the **Claims** tab:
   - **3 PhilHealth claims**: 1 Paid, 1 Pending, 1 Denied
   - Point out the claim statuses with color coding
   - Click on the denied claim to show denial reason (CO-4: Modifier issue)
3. Show the **Payers** tab:
   - 7 payers seeded (PhilHealth, BCBS, Aetna, UHC, Cigna, Maxicare, Self-Pay)
   - PhilHealth integration mode shown
4. Show the **Connectors** tab:
   - PhilHealth eClaims connector status
   - Clearinghouse connector for US payers

**Talking points:**
- PhilHealth CF1-CF4 eClaims format built in (not X12 -- PhilHealth uses its own format)
- Multi-payer: US clearinghouse EDI + Philippine PhilHealth + HMO portals
- Claim lifecycle: draft -> scrubbed -> submitted -> paid/denied -> appeal
- All claims grounded to VistA encounters via `vista_charge_ien`
- Sandbox mode: claims export to file, never submit to real payers

---

## Minute 18-20: CFO Dashboard & Revenue Analytics

**Story:** "This is what the CFO sees every morning."

1. Stay in **Admin > RCM** and switch to the **CFO Dashboard** sub-tab
2. Walk through the 5 metrics:

| Metric | Demo Value | What It Shows |
|--------|-----------|---------------|
| **Net Revenue** | ~$4,975 paid of $17,700 charged | Total collected this year |
| **Collection Rate** | ~28% | Paid / Charged ratio (low because most claims are pending) |
| **Denials This Week** | 2 claims | CO-16 (missing info) + CO-197 (no pre-auth) |
| **AR Aging** | All 4 buckets populated | $6,450 (0-30d), $5,550 (31-60d), $2,200 (61-90d), $4,800 (90+d) |
| **Payer Mix** | 7 payers | PhilHealth 23%, BCBS 15%, Aetna 15%, etc. |

3. Change the period dropdown: `month` -> `quarter` -> `year`
4. Point out the AR aging chart -- the 90+ bucket is a red flag for the CFO

**Talking points:**
- All metrics are SQL queries against real claim data (PostgreSQL)
- No fake dashboards -- these numbers come from the seeded claims
- AR aging shows exactly where revenue is stuck in the pipeline
- Denial tracking by reason code helps target process improvements
- Period filters let CFO drill into monthly, weekly, quarterly trends
- Data refreshes in real-time as claims move through lifecycle

---

## Closing (30 seconds)

**Summary slide / verbal closing:**

> "What you've seen today is a modern web frontend built on top of the same
> VistA engine that's run VA hospitals for 40 years. We're not replacing
> VistA -- we're evolving it. Every RPC call you saw is the same protocol
> that CPRS uses. The difference is: it runs in a browser, it has
> multi-tenant architecture, it has real billing integration, and it's
> open source."

**Key differentiators to emphasize:**
- VistA-native: uses real VistA RPCs, not a parallel database
- Multi-payer: PhilHealth + US clearinghouse + HMO portals
- Modern stack: React, TypeScript, PostgreSQL, Docker
- Open source: no vendor lock-in

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login fails | Verify VistA VEHU container is running: `docker ps` |
| No patients found | Check API logs: `curl http://localhost:3001/health` |
| CFO dashboard empty | Run `pnpm seed:demo` to seed claim data |
| Slow responses | VistA container needs 15-30s after start to be ready |
| Session expired | Re-login (sessions expire after inactivity) |

---

## Demo Data Reset

To start fresh:

```powershell
# Reset claim data (WARNING: deletes all claims)
# Use psql or the API to clear claim_draft table if needed

# Re-seed
pnpm seed:demo
```

The seed script is idempotent -- running it again skips existing records.
