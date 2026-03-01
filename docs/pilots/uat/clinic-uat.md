# UAT Scenario Pack — Archetype A: Outpatient Clinic

> Phase 414 (W24-P6): Clinical Safety & UAT Harness

## Overview
This scenario pack covers end-to-end user acceptance testing for a typical
outpatient clinic deployment (5-20 providers, HL7 lab/pharmacy feeds,
X12/PhilHealth claims).

---

## Pre-Requisites
- [ ] API running (`npx tsx --env-file=.env.local src/index.ts`)
- [ ] WorldVistA Docker running (port 9430)
- [ ] Web app running (`pnpm -C apps/web dev`)
- [ ] Test user authenticated (PROV123 / PROV123!!)

---

## Scenario 1: Patient Lookup & Demographics
**Actor:** Front-desk clerk  
**Steps:**
1. Navigate to Patient Search
2. Search for patient by name (e.g., "CARTER")
3. Select a patient from results
4. Verify demographics panel shows: name, DOB, SSN (masked), sex

**Expected:** Patient demographics load within 3 seconds.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 2: Allergy Review & Add
**Actor:** Provider  
**Steps:**
1. Open patient chart
2. Navigate to Allergies panel
3. Review existing allergies
4. Click "Add Allergy"
5. Search for allergen (e.g., "PENICILLIN")
6. Select severity and symptoms
7. Save allergy

**Expected:** New allergy appears in list. VistA confirms via GMRAGNT.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 3: Medication Review
**Actor:** Provider  
**Steps:**
1. Open patient chart
2. Navigate to Medications panel
3. Verify active medications display
4. Check medication details (drug name, dose, route, schedule)

**Expected:** Active medications load from ORWPS ACTIVE.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 4: Lab Results Review
**Actor:** Provider  
**Steps:**
1. Open patient chart
2. Navigate to Labs panel
3. Review most recent lab results
4. Verify lab values display with reference ranges

**Expected:** Lab results load via ORWLRR INTERIM.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 5: Order Entry (CPOE)
**Actor:** Provider  
**Steps:**
1. Open patient chart
2. Navigate to Orders panel
3. Review existing orders
4. Attempt to create a new order
5. Verify order displays in pending list

**Expected:** Order lifecycle (create/sign) follows ORWDX LOCK/UNLOCK pattern.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 6: Clinical Note (TIU)
**Actor:** Provider  
**Steps:**
1. Open patient chart
2. Navigate to Notes panel
3. Create a new progress note
4. Enter note text
5. Save as draft
6. Verify note appears in notes list

**Expected:** TIU CREATE RECORD succeeds. Note shows as unsigned draft.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 7: Claim Submission (RCM)
**Actor:** Billing clerk  
**Steps:**
1. Navigate to Admin > RCM dashboard
2. Create a new claim
3. Verify claim validation runs (15+ rules)
4. Export claim to X12 format
5. Verify export file created in `data/rcm-exports/`

**Expected:** Claim lifecycle: created -> validated -> ready_to_submit.
Export-only mode (CLAIM_SUBMISSION_ENABLED=false).  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 8: Scheduling (Request Mode)
**Actor:** Front-desk clerk  
**Steps:**
1. Navigate to Portal > Appointments
2. Check scheduling mode badge
3. Attempt appointment request
4. Verify request recorded

**Expected:** Scheduling mode shows "request_only" or "sdes_partial".  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 9: Login / Logout / Session
**Actor:** Any user  
**Steps:**
1. Navigate to login page
2. Enter sandbox credentials
3. Verify successful authentication
4. Navigate across multiple panels
5. Log out
6. Verify session terminated

**Expected:** Session cookie set on login, cleared on logout. No stale sessions.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Scenario 10: Error Handling
**Actor:** Any user  
**Steps:**
1. Search for a non-existent patient
2. Attempt to add an allergy with missing fields
3. Navigate to a page with VistA down (stop Docker)
4. Verify error messages are user-friendly

**Expected:** Circuit breaker activates. No stack traces shown to user.
"Integration pending" messages where applicable.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** _________________ Date: _________

---

## Summary Signoff

| # | Scenario | Result | Tester | Date |
|---|----------|--------|--------|------|
| 1 | Patient Lookup | | | |
| 2 | Allergy Review & Add | | | |
| 3 | Medication Review | | | |
| 4 | Lab Results Review | | | |
| 5 | Order Entry (CPOE) | | | |
| 6 | Clinical Note (TIU) | | | |
| 7 | Claim Submission | | | |
| 8 | Scheduling | | | |
| 9 | Login / Logout | | | |
| 10 | Error Handling | | | |

**Overall UAT Verdict:** [ ] PASS / [ ] FAIL  
**Clinical Safety Lead:** _________________ Date: _________
