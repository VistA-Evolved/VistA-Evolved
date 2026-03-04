# Wave 38 — Clinical E2E Scenarios (Phase 529 / W38-C8)

> **Purpose**: Maps end-to-end clinical workflows across all 5 domains
> (ED, OR, ICU, Devices, Radiology) to PG-backed durability,
> proving restart resilience and VistA alignment.

---

## 1. ED: Door-to-Disposition

| Step | Actor        | Action                        | Store/PG Table               | VistA RPC Target |
| ---- | ------------ | ----------------------------- | ---------------------------- | ---------------- |
| 1    | Triage Nurse | Patient arrives, create visit | `ed_visit` (v53)             | EDIS LOGREG      |
| 2    | Triage Nurse | Assign triage acuity (ESI)    | `ed_visit.triageJson`        | EDPF TRIAGE      |
| 3    | Charge Nurse | Assign bed                    | `ed_bed` (v53)               | EDIS TRACKING    |
| 4    | Attending MD | Begin evaluation              | `ed_visit.attendingProvider` | —                |
| 5    | Attending MD | Order labs/imaging            | (via CPRS orders)            | ORWDX SAVE       |
| 6    | Attending MD | Disposition: admit/discharge  | `ed_visit.disposition`       | EDIS DISPO       |

**Restart test**: Kill API after step 3. Restart. Verify visit + bed assignment survive in PG.

**VistA alignment**: EDIS RPCs are not present in WorldVistA sandbox. Integration-pending responses include `vistaGrounding` metadata.

---

## 2. OR: Surgical Case Lifecycle

| Step | Actor        | Action                 | Store/PG Table                | VistA RPC Target     |
| ---- | ------------ | ---------------------- | ----------------------------- | -------------------- |
| 1    | Surgeon      | Schedule case          | `or_case` (v54)               | ORWDX SAVE (consult) |
| 2    | Scheduler    | Assign room + block    | `or_room`, `or_block` (v54)   | SR SURG SCHED        |
| 3    | Pre-op Nurse | Pre-op checklist       | `or_case.milestonesJson`      | —                    |
| 4    | Anesthesia   | Assign anesthesia type | `or_case.anesthesiaJson`      | —                    |
| 5    | Circulator   | Patient in room        | `or_case.status: in_progress` | —                    |
| 6    | Surgeon      | Case complete          | `or_case.status: completed`   | SR SURG COMPLETE     |

**Restart test**: Kill API during step 5. Restart. Verify case is still `in_progress` with all milestones.

**VistA alignment**: Surgery File 130 exists but scheduling RPCs are limited in sandbox.

---

## 3. ICU: Admission through Discharge

| Step | Actor     | Action                | Store/PG Table                     | VistA RPC Target |
| ---- | --------- | --------------------- | ---------------------------------- | ---------------- |
| 1    | Attending | Admit to ICU unit     | `icu_admission` (v55)              | —                |
| 2    | Nurse     | Assign bed            | `icu_bed` (v55)                    | —                |
| 3    | Nurse     | Chart vitals (q1h)    | `icu_flowsheet_entry` (v55)        | GMRV MARK VITALS |
| 4    | RT        | Record vent settings  | `icu_vent_record` (v55)            | —                |
| 5    | Nurse     | Record I/O            | `icu_io_record` (v55)              | —                |
| 6    | Attending | Calculate SOFA score  | `icu_score` (v55)                  | —                |
| 7    | Attending | Discharge disposition | `icu_admission.status: discharged` | —                |

**Restart test**: Kill API after step 4. Restart. Verify admission, bed, all flowsheet entries, and vent records survive.

**VistA alignment**: GMRV VITALS (File 120.5) is the target for vital observations. GMRV MARK VITALS is callable in sandbox.

---

## 4. Device Integration: Registration to Patient Association

| Step | Actor    | Action                        | Store/PG Table                             | VistA RPC Target |
| ---- | -------- | ----------------------------- | ------------------------------------------ | ---------------- |
| 1    | Biomed   | Register device               | `managed_device` (v56)                     | —                |
| 2    | Biomed   | Map to location               | `device_location_mapping` (v56)            | —                |
| 3    | Nurse    | Associate to patient          | `device_patient_association` (v56)         | —                |
| 4    | Device   | Send observation via gateway  | `device-observation-pipeline.ts`           | —                |
| 5    | Pipeline | Validate + enrich observation | Pipeline stages 1-3                        | —                |
| 6    | Pipeline | Persist to audit log          | `device_audit_log` (v56)                   | —                |
| 7    | System   | Evaluate alarm thresholds     | `alarm-store.ts`                           | —                |
| 8    | Nurse    | Dissociate device             | `device_patient_association.status: ended` | —                |

**Restart test**: Kill API after step 3. Restart. Verify device + association survive. New observations from gateway re-validate against PG-backed registry.

**VistA alignment**: Equipment Management File 6914 is the target for device identity grounding. No RPC exists in sandbox.

---

## 5. Radiology: Order to Verified Report

| Step | Actor         | Action                          | Store/PG Table                              | VistA RPC Target  |
| ---- | ------------- | ------------------------------- | ------------------------------------------- | ----------------- |
| 1    | Ordering MD   | Place radiology order           | `radiology_order` (v57)                     | ORWDX SAVE        |
| 2    | Rad Tech      | Assign protocol                 | `radiology_order.protocolName`              | —                 |
| 3    | PACS          | Study appears on worklist       | `reading_worklist_item` (v57)               | —                 |
| 4    | Radiologist   | Begin reading                   | `reading_worklist_item.status: in_progress` | —                 |
| 5    | Radiologist   | Draft report                    | `rad_report` (v57)                          | —                 |
| 6    | Radiologist   | Prelim sign                     | `rad_report.status: preliminary`            | —                 |
| 7    | Attending Rad | Verify report                   | `rad_report.status: verified`               | TIU CREATE RECORD |
| 8    | System        | Record dose                     | `dose_registry_entry` (v57)                 | —                 |
| 9    | System        | Critical finding alert (if any) | `rad_critical_alert` (v57)                  | —                 |
| 10   | QA            | Peer review                     | `peer_review` (v57)                         | —                 |

**Restart test**: Kill API after step 6. Restart. Verify order, worklist item, and prelim-signed report all survive.

**VistA alignment**: Rad/Nuc Med file 70 is the target. `ORWDXR NEW ORDER` and `RAD/NUC MED REGISTER` are not available in WorldVistA sandbox.

---

## 6. Cross-Domain Scenario: ED Trauma → OR → ICU

| Step | Domain    | Action                                         | PG Tables Involved                                        |
| ---- | --------- | ---------------------------------------------- | --------------------------------------------------------- |
| 1    | ED        | Trauma patient arrives ESI-1                   | `ed_visit`, `ed_bed`                                      |
| 2    | Radiology | Trauma CT ordered                              | `radiology_order`                                         |
| 3    | Radiology | CT read — critical finding (aortic dissection) | `rad_report`, `rad_critical_alert`                        |
| 4    | OR        | Emergency case created                         | `or_case` (priority: emergency)                           |
| 5    | OR        | Surgery begins, devices attached               | `or_case`, `managed_device`, `device_patient_association` |
| 6    | ICU       | Post-op ICU admission                          | `icu_admission`, `icu_bed`                                |
| 7    | ICU       | Continuous monitoring via devices              | `icu_flowsheet_entry`, `icu_vent_record`                  |

**Restart test**: Kill API at any point. Restart. All domain state across ED, OR, ICU, Radiology, and Devices survives in PG.

---

## 7. Verification Checklist

| #   | Gate                                 | Verification Method                                         |
| --- | ------------------------------------ | ----------------------------------------------------------- |
| G1  | PG tables exist (21 total)           | `SELECT tablename FROM pg_tables WHERE schemaname='public'` |
| G2  | RLS policies applied                 | Check `pg_policies` for all 21 tenant-scoped tables         |
| G3  | Store-policy updated                 | No `critical` + `in_memory_only` for target domain stores   |
| G4  | PG repos compile                     | `tsc --noEmit` passes for all 5 repo files                  |
| G5  | Observation pipeline processes batch | Unit test: 10-obs batch, 8 succeed, 2 fail validation       |
| G6  | Restart resilience                   | Insert data → kill API → restart → data still in PG         |
| G7  | VistA grounding documented           | Each domain has identified target RPCs/files                |
| G8  | Indexes present                      | Each table has tenant_id + domain-specific indexes          |
