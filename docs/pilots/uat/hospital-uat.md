# UAT Scenario Pack — Archetype B: Hospital Service Line

> Phase 414 (W24-P6): Clinical Safety & UAT Harness

## Overview

This scenario pack covers end-to-end user acceptance testing for a hospital
service line deployment (50-200 beds, ADT, CPOE, pharmacy, lab, imaging,
nursing documentation, HIE connectivity).

---

## Pre-Requisites

- [ ] API running (`npx tsx --env-file=.env.local src/index.ts`)
- [ ] WorldVistA Docker running (port 9430)
- [ ] Orthanc + OHIF running (`docker compose --profile imaging up -d`)
- [ ] Web app running (`pnpm -C apps/web dev`)
- [ ] Patient portal running (`pnpm -C apps/portal dev`)
- [ ] Test user authenticated (PROV123 / PROV123!!)

---

## Scenario 1: Patient Lookup & Demographics

**Actor:** Admissions clerk  
**Steps:**

1. Navigate to Patient Search
2. Search for patient by name
3. Select patient, verify demographics panel
4. Verify problem list loads

**Expected:** Demographics + problem list within 3 seconds.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 2: Allergy & Adverse Reaction Review

**Actor:** Provider  
**Steps:**

1. Open patient chart
2. Navigate to Allergies panel
3. Review existing allergies with severity + symptoms
4. Add a new allergy
5. Verify allergy persists across refresh

**Expected:** GMRAGNT lookup + ORWDAL32 SAVE ALLERGY succeed.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 3: Inpatient Medication Administration

**Actor:** Nurse  
**Steps:**

1. Open patient chart
2. Navigate to Medications panel
3. Review active medications (ORWPS ACTIVE)
4. Verify medication grouping (header ~ lines)
5. Check dose/route/schedule details

**Expected:** Multi-line grouped records parsed correctly.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 4: CPOE Order Entry & Signature

**Actor:** Provider  
**Steps:**

1. Open patient chart, navigate to Orders panel
2. Call ORWDX LOCK before ordering
3. Create new order
4. Provide e-signature code
5. Sign order (ORWOR1 SIG)
6. Call ORWDX UNLOCK after

**Expected:** Lock/unlock lifecycle enforced. Sign event recorded in
cpoe_order_sign_event table. esCode hashed (SHA-256 truncated).  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 5: TIU Progress Note

**Actor:** Provider  
**Steps:**

1. Navigate to Notes panel
2. Create progress note via TIU CREATE RECORD
3. Enter clinical narrative
4. Save as draft
5. Verify draft appears in notes list
6. Sign note

**Expected:** Unsigned notes queried via both contexts (BUG-030/033).  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 6: Lab Results with Trends

**Actor:** Provider  
**Steps:**

1. Navigate to Labs panel
2. Review interim results (ORWLRR INTERIM)
3. Check reference ranges
4. Verify result sorting (most recent first)

**Expected:** Lab results load and display within 3 seconds.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 7: Imaging Study Ordering & Viewing

**Actor:** Provider / Radiologist  
**Steps:**

1. Navigate to Imaging panel > Orders tab
2. Create imaging order (in-memory worklist)
3. Verify accession number generated (VE-YYYYMMDD-NNNN)
4. Navigate to Studies tab
5. View study in OHIF viewer (if Orthanc running)
6. Check DICOMweb proxy connectivity

**Expected:** Imaging order created. OHIF viewer launches for studies.
DICOMweb rate limiter active (120 req/60s).  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 8: Imaging Audit & Break-Glass

**Actor:** Admin / Provider  
**Steps:**

1. Navigate to Imaging panel > Audit tab
2. Verify hash-chained audit trail displays
3. Verify audit chain integrity via GET /imaging/audit/verify
4. Test break-glass flow (POST /security/break-glass/start)
5. Verify break-glass session is patient-scoped and time-limited

**Expected:** Audit chain valid. Break-glass requires reason + patientDfn.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 9: Interop HL7 Telemetry

**Actor:** Integration engineer  
**Steps:**

1. Navigate to Admin > Integrations console
2. Check VistA HL7/HLO telemetry tab
3. Verify interop RPC calls succeed
4. Check message stats display

**Expected:** Interop RPCs callable (ZVEMIOP entry points).  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 10: HIE Document Exchange

**Actor:** Integration engineer  
**Steps:**

1. Verify document-exchange endpoints respond
2. Test exchange pack export
3. Verify consent-pou enforcement
4. Check MPI cross-reference

**Expected:** Exchange packs generate. Consent blocks unauthorized access.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 11: Telehealth Session

**Actor:** Provider + Patient  
**Steps:**

1. Create telehealth room (POST /telehealth/rooms)
2. Verify room ID is opaque hex (no PHI in URL)
3. Join from patient portal (device check)
4. Verify waiting room flow
5. End session, verify room cleanup

**Expected:** Room created with ve-{hex} ID. Auto-expiry after 4h.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 12: Patient Portal

**Actor:** Patient  
**Steps:**

1. Log in to patient portal
2. View appointments
3. Check scheduling mode badge
4. Complete intake questionnaire (if active)
5. Log out

**Expected:** Portal session uses httpOnly cookie. No PHI in logs.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 13: RCM Hospital Billing

**Actor:** Billing manager  
**Steps:**

1. Navigate to Admin > RCM dashboard
2. Create inpatient claim (837I)
3. Run validation (15+ rules)
4. Export to X12
5. Check payer integration mode

**Expected:** Export-only mode. Demo claims blocked from real submission.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 14: Admin Telemetry & Posture

**Actor:** System admin  
**Steps:**

1. Navigate to Admin > Analytics dashboard
2. Check posture endpoints (/posture/observability, /posture/data-plane)
3. Verify circuit breaker state
4. Check Prometheus metrics (/metrics/prometheus)

**Expected:** All posture gates report status. Metrics endpoint accessible.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Scenario 15: Error & Resilience

**Actor:** Any user  
**Steps:**

1. Stop VistA Docker container
2. Attempt patient search
3. Verify circuit breaker opens after 5 failures
4. Verify /ready returns ok:false
5. Restart VistA Docker
6. Verify recovery (half-open -> closed)

**Expected:** Graceful degradation. No crashes. Circuit breaker pattern works.  
**Signoff:** [ ] Pass / [ ] Fail / [ ] Blocked  
**Tester:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***

---

## Summary Signoff

| #   | Scenario                    | Result | Tester | Date |
| --- | --------------------------- | ------ | ------ | ---- |
| 1   | Patient Lookup              |        |        |      |
| 2   | Allergy & Adverse Reaction  |        |        |      |
| 3   | Inpatient Medications       |        |        |      |
| 4   | CPOE Order & Signature      |        |        |      |
| 5   | TIU Progress Note           |        |        |      |
| 6   | Lab Results                 |        |        |      |
| 7   | Imaging Study               |        |        |      |
| 8   | Imaging Audit & Break-Glass |        |        |      |
| 9   | Interop HL7                 |        |        |      |
| 10  | HIE Document Exchange       |        |        |      |
| 11  | Telehealth                  |        |        |      |
| 12  | Patient Portal              |        |        |      |
| 13  | RCM Hospital Billing        |        |        |      |
| 14  | Admin Telemetry             |        |        |      |
| 15  | Error & Resilience          |        |        |      |

**Overall UAT Verdict:** [ ] PASS / [ ] FAIL  
**Clinical Safety Lead:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***  
**Chief Medical Information Officer:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***
