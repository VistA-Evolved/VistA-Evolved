# Specialty Clinical Coverage Map

> Maps each clinical setting/specialty to its required workflows, integrations,
> VistA touchpoints, and content pack. This is the engineering blueprint for
> Wave 22 specialty depth — NOT a regulatory certification claim.

---

## 1. Outpatient Primary Care

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `outpatient-primary-care` |
| **Settings** | `outpatient`, `any` |
| **Specialties** | primary-care, family-medicine, internal-medicine |
| **Workflows** | Patient check-in → chief complaint → vitals → HPI/ROS → exam → assessment/plan → orders → note sign → checkout |
| **Templates** | Progress note, annual wellness visit, chronic disease follow-up, pre-op clearance |
| **Order Sets** | Annual labs (CBC/CMP/lipids/A1c), preventive care, hypertension workup |
| **Flowsheets** | Vitals (BP/HR/RR/Temp/O2/BMI), chronic metrics (A1c trend, BP trend) |
| **CDS Hooks** | patient-view (preventive care reminders), order-sign (drug interaction check) |
| **VistA RPCs** | ORWPT SELECT, ORWDAL32 SAVE ALLERGY, ORWDX LOCK/UNLOCK, TIU CREATE RECORD, TIU SET DOCUMENT TEXT, GMV ADD VM |
| **Wave 21 Link** | POCT glucose ingest (ASTM/POCT1-A) |
| **RCM Touchpoints** | Visit capture → CPT/ICD coding → claim creation |

---

## 2. Inpatient Med/Surg

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `inpatient-med-surg` |
| **Settings** | `inpatient` |
| **Specialties** | internal-medicine, general-surgery, nursing |
| **Workflows** | Admission → bed assignment → nursing assessment → vitals q4h → I&O → medication admin → daily progress note → discharge planning |
| **Templates** | Admission H&P, daily progress note, discharge summary, nursing shift assessment |
| **Order Sets** | Admission orders (diet, activity, DVT prophylaxis, pain management), post-op orders |
| **Flowsheets** | Vitals, I&O (intake/output balance), pain assessment, fall risk, pressure injury risk, wound care |
| **CDS Hooks** | encounter-start (admission screening), order-sign (antibiotic stewardship) |
| **VistA RPCs** | ORWDX LOCK/UNLOCK, ORWDXR NEW ORDER, GMV ADD VM, TIU CREATE RECORD, DGPM ADT MOVEMENTS |
| **Wave 21 Link** | Wired bedside monitors (HL7v2 ORU), infusion pump events (BCMA bridge) |
| **RCM Touchpoints** | DRG assignment → charge capture → final coding → claim |
| **Bedboard** | Ward → room → bed → patient assignment (reuses facility-service.ts Location model) |

---

## 3. ICU / Critical Care

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `icu-critical-care` |
| **Settings** | `inpatient` |
| **Specialties** | icu-critical-care, pulmonology, anesthesia |
| **Workflows** | ICU admission → continuous monitoring → ventilator management → vasopressor titration → sedation scoring → daily goals → ICU daily note |
| **Templates** | ICU admission note, ICU daily progress note, ventilator weaning, procedures (central line, intubation) |
| **Order Sets** | ICU admission (sedation, ventilator settings, stress ulcer prophylaxis, insulin drip), sepsis bundle |
| **Flowsheets** | Vitals q1h, hemodynamics (MAP, CVP, PA pressures), ventilator parameters (FiO2, PEEP, TV, RR), Glasgow Coma Scale, RASS/CAM-ICU, fluid balance, vasoactive drip rates |
| **CDS Hooks** | order-sign (sepsis screening, antibiotic timing), custom: ventilator-liberation readiness |
| **VistA RPCs** | Same as inpatient + GMV ADD VM (high-frequency), ORWDXR NEW ORDER (drip orders) |
| **Wave 21 Link** | Continuous waveform from bedside monitors (HL7v2 ORU), infusion pump rate events, alarm pipeline (IHE PCD ACM escalation) |
| **RCM Touchpoints** | Critical care time documentation → CPT 99291/99292 → charge capture |

---

## 4. Emergency Department

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `emergency-department` |
| **Settings** | `ed` |
| **Specialties** | emergency-medicine, urgent-care |
| **Workflows** | Triage → ESI acuity → bed assignment → provider evaluation → orders → reassessment → disposition (admit/discharge/transfer) |
| **Templates** | ED triage note, ED provider note, ED procedure note, ED discharge instructions |
| **Order Sets** | Chest pain workup, abdominal pain workup, trauma panel, stroke alert |
| **Flowsheets** | Triage vitals, reassessment vitals, ESI score tracking, pain reassessment |
| **CDS Hooks** | encounter-start (sepsis screening), order-sign (contrast allergy check, opioid risk) |
| **VistA RPCs** | ORWPT SELECT, ORWDX LOCK/UNLOCK, TIU CREATE RECORD, GMV ADD VM, ORQQAL LIST |
| **Wave 21 Link** | POCT cardiac markers, bedside monitor HL7v2 |
| **RCM Touchpoints** | ED level coding (99281-99285) → quick charge capture → claim |

---

## 5. OR / Anesthesia

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `or-anesthesia` |
| **Settings** | `inpatient` |
| **Specialties** | anesthesia, general-surgery, orthopedics |
| **Workflows** | Pre-op assessment → surgical time-out → intraop record → anesthesia record → post-op note → PACU handoff |
| **Templates** | Pre-op evaluation, anesthesia record, operative note, post-op orders, PACU assessment |
| **Order Sets** | Pre-op (NPO, labs, ECG, imaging), intraop (blood products, vasopressors), post-op recovery |
| **Flowsheets** | Anesthesia timeline (agents, doses, vitals), surgical log, blood products, fluid balance |
| **CDS Hooks** | order-sign (blood type verification, malignant hyperthermia check) |
| **VistA RPCs** | ORWDX LOCK/UNLOCK, TIU CREATE RECORD, GMV ADD VM, ORWDXR NEW ORDER (OR scheduling integration-pending) |
| **Wave 21 Link** | Anesthesia machine data (HL7v2/SDC), infusion pump titration events |
| **RCM Touchpoints** | Surgical CPT coding → anesthesia time units → charge capture |

---

## 6. Pharmacy

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `pharmacy` |
| **Settings** | `any` |
| **Specialties** | pharmacy-clinical |
| **Workflows** | Order entry → clinical review → verification → dispensing → administration → monitoring → discontinuation |
| **Templates** | Pharmacist clinical note, medication reconciliation, anticoagulation management, TPN worksheet |
| **Order Sets** | Antibiotic stewardship, pain management tiered, anticoagulation, insulin protocols |
| **Flowsheets** | Medication administration record (MAR), anticoagulation INR tracking, vancomycin trough monitoring, renal dosing adjustments |
| **CDS Hooks** | medication-prescribe (drug-drug interaction, allergy, renal dosing), order-sign (duplicate therapy, formulary check) |
| **VistA RPCs** | PSB COVERSHEET, PSO CPRS INTERP, ORWDX LOCK/UNLOCK, ORWPS ACTIVE, ORWDXR NEW ORDER |
| **Wave 21 Link** | Infusion pump events (BCMA bridge: right-patient, right-drug, right-dose, right-route, right-time, right-documentation) |
| **RCM Touchpoints** | Drug cost capture → NDC on claim → formulary tier assignment |
| **Safety** | Step-up auth for high-risk medications per tenant policy; all state transitions audited |

---

## 7. Laboratory + POCT

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `laboratory-poct` |
| **Settings** | `any` |
| **Specialties** | laboratory |
| **Workflows** | Order entry → label print → specimen collection → transport → analysis → result review → verification → reporting → critical value alerting |
| **Templates** | Lab result interpretation note, pathology report template, microbiology report |
| **Order Sets** | Routine labs (CBC, CMP, UA), coag panel, blood bank, ABG, cultures, body fluids |
| **Flowsheets** | Lab trend view (glucose, K+, Cr, WBC), cumulative results, POCT QC log |
| **CDS Hooks** | order-sign (duplicate order check, specimen requirements), custom: critical-result-alert |
| **VistA RPCs** | ORWDX LOCK/UNLOCK, ORWDXR NEW ORDER, ORWLRR INTERIM, LR VERIFY, ORQQAL LIST |
| **Wave 21 Link** | HL7v2 ORU result ingest (lab analyzers), ASTM serial analyzers, POCT1-A glucose meters, device normalization (LOINC/UCUM) |
| **RCM Touchpoints** | CPT code per test → charge capture (auto from order catalog) |
| **Critical Results** | Auto-task + alert routing with required acknowledgement; tracked in audit trail |

---

## 8. Imaging / Radiology

| Dimension | Detail |
|-----------|--------|
| **Pack ID** | `imaging-radiology` |
| **Settings** | `any` |
| **Specialties** | radiology |
| **Workflows** | Order entry → scheduling → MWL → acquisition → study ingest → radiologist review → report draft → report sign → result notification |
| **Templates** | Radiology report (structured: findings, impression, recommendation), IR procedure note, ultrasound report |
| **Order Sets** | ED imaging (CT head, CXR, CT abd/pelvis), MSK workup (MRI knee, XR series), oncology staging |
| **Flowsheets** | Imaging study timeline, dose tracking (DLP, CTDIvol), contrast administration |
| **CDS Hooks** | order-sign (appropriateness criteria — ACR Select posture), custom: prior-study-check |
| **VistA RPCs** | ORWDX LOCK/UNLOCK, ORWDXR NEW ORDER, RAD/NUC MED REGISTER (integration-pending in sandbox) |
| **Wave 21 Link** | DICOM MWL/MPPS (imaging modality), DICOMweb viewer (OHIF), Orthanc ingest + accession reconciliation |
| **RCM Touchpoints** | CPT per exam → professional/technical component → charge capture |
| **Viewer** | Embedded OHIF viewer via existing imaging proxy (Phase 24) |

---

## 9. Revenue Cycle Touchpoints (Cross-Cutting)

Revenue cycle management is NOT a clinical specialty pack but intersects every
specialty at specific handoff points. These are documented per-specialty above
and summarized here for RCM team reference.

| Handoff Point | Source Specialty | RCM Action |
|---------------|------------------|------------|
| Visit checkout | Outpatient primary care | E&M level → CPT → claim |
| DRG assignment | Inpatient med/surg | DRG grouper → charge capture |
| Critical care time | ICU | CPT 99291/92 → charge capture |
| ED level coding | Emergency | 99281-85 → quick charge → claim |
| Surgical CPT | OR/Anesthesia | Procedure CPT + time units → claim |
| Drug cost capture | Pharmacy | NDC → formulary tier → claim |
| Lab test CPT | Laboratory | Test CPT → auto-charge from catalog |
| Imaging exam CPT | Radiology | Prof/tech component → charge |

All RCM handoff tasks feed into the Phase 38 claim store and Phase 40 EDI
pipeline. Specialty packs generate charge candidates; the RCM module validates,
adjudicates, and submits.

---

## Pack Status Matrix

| Pack | Wave 22 Phase | Status |
|------|---------------|--------|
| outpatient-primary-care | P2 (framework) + existing Phase 158 templates | Partial — templates exist, order sets + flowsheets new |
| inpatient-med-surg | P3 | New — bedboard + nursing flowsheets |
| icu-critical-care | P3 + P4 | New — extends inpatient + pharmacy |
| emergency-department | P3 + existing ED templates | Partial — triage exists, ESI + reassessment new |
| or-anesthesia | P3 | New — OR-specific workflows |
| pharmacy | P4 | New — lifecycle depth beyond existing med list reads |
| laboratory-poct | P5 | New — order → verify → critical alert depth |
| imaging-radiology | P6 | Partial — imaging proxy exists, report workflow new |

---

## VistA RPC Coverage Summary

| RPC | Used By | Status in Sandbox |
|-----|---------|-------------------|
| GMV ADD VM | Vitals writeback (all inpatient packs) | Available — needs validation |
| TIU CREATE RECORD | Note creation (all packs) | Available |
| TIU SET DOCUMENT TEXT | Note body (all packs) | Available |
| ORWDX LOCK/UNLOCK | Order locking (all packs) | Available |
| ORWDXR NEW ORDER | Order placement (pharmacy, lab, imaging) | Available — data-dependent |
| PSB COVERSHEET | Pharmacy read (pharmacy pack) | Available |
| ORWPS ACTIVE | Active meds (pharmacy pack) | Available |
| ORWLRR INTERIM | Lab results read (lab pack) | Available |
| LR VERIFY | Lab result verify (lab pack) | Integration-pending |
| RAD/NUC MED REGISTER | Rad exam register (imaging pack) | Integration-pending |
| DGPM ADT MOVEMENTS | ADT feed (inpatient packs) | Available — needs validation |

---

*Generated for Wave 22. Updated as packs are implemented in P2–P9.*
