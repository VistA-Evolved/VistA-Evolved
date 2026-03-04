# Competitive Baseline — Patient Portal Feature Matrix (Phase 26)

> What features do modern patient portals offer? This is the target
> feature set VistA-Evolved Portal must eventually match, mapped to
> VistA data sources.

---

## Feature Categories

### 1. Health Record Access

| Feature             | MyChart | HealtheMe | Ottehr | VistA Source                           | Phase 26 Status |
| ------------------- | ------- | --------- | ------ | -------------------------------------- | --------------- |
| Demographics        | Yes     | Yes       | Yes    | `ORWPT SELECT`                         | Skeleton        |
| Allergies           | Yes     | Yes       | No     | `ORQQAL LIST`                          | Skeleton        |
| Active Medications  | Yes     | Yes       | No     | `ORWPS ACTIVE`                         | Skeleton        |
| Problem List        | Yes     | Yes       | No     | `ORWCH PROBLEM LIST`                   | Skeleton        |
| Vitals History      | Yes     | Yes       | No     | `ORQQVI VITALS`                        | Skeleton        |
| Lab Results         | Yes     | No        | No     | `ORWLRR INTERIM`                       | Skeleton        |
| Imaging Studies     | Yes     | No        | No     | DICOMweb proxy                         | Skeleton        |
| Visit Summaries     | Yes     | Yes       | Yes    | `TIU DOCUMENTS BY CONTEXT`             | Skeleton        |
| Discharge Summaries | Yes     | No        | No     | `TIU DOCUMENTS BY CONTEXT` (class 244) | Skeleton        |
| Clinical Reports    | Yes     | No        | No     | `ORWRP REPORT TEXT`                    | Skeleton        |

### 2. Secure Messaging

| Feature            | MyChart | HealtheMe | Ottehr     | VistA Source   | Phase 26 Status |
| ------------------ | ------- | --------- | ---------- | -------------- | --------------- |
| Provider messaging | Yes     | No        | Yes (chat) | Future: SM API | Placeholder     |
| Message history    | Yes     | No        | Yes        | Future         | Placeholder     |
| Attachment support | Yes     | No        | No         | Future         | Placeholder     |

### 3. Medication Management

| Feature            | MyChart | HealtheMe | Ottehr    | VistA Source                        | Phase 26 Status |
| ------------------ | ------- | --------- | --------- | ----------------------------------- | --------------- |
| View active meds   | Yes     | Yes       | Yes (eRx) | `ORWPS ACTIVE`                      | Skeleton        |
| Refill request     | Yes     | No        | No        | Future: `ORWDXM AUTOACK` + approval | Placeholder     |
| Pharmacy selection | Yes     | No        | No        | Future                              | Not planned     |

### 4. Scheduling & Appointments

| Feature           | MyChart | HealtheMe | Ottehr | VistA Source    | Phase 26 Status |
| ----------------- | ------- | --------- | ------ | --------------- | --------------- |
| View appointments | Yes     | Calendar  | Yes    | Future: SD RPCs | Placeholder     |
| Book appointment  | Yes     | No        | Yes    | Future: SD RPCs | Placeholder     |
| Cancel/reschedule | Yes     | No        | Yes    | Future: SD RPCs | Placeholder     |
| Check-in          | Yes     | No        | Yes    | Future          | Not planned     |

### 5. Telehealth

| Feature          | MyChart | HealtheMe | Ottehr       | VistA Source   | Phase 26 Status |
| ---------------- | ------- | --------- | ------------ | -------------- | --------------- |
| Video visit      | Yes     | No        | Yes (WebRTC) | N/A (external) | Placeholder     |
| Waiting room     | Yes     | No        | Yes          | N/A            | Placeholder     |
| Pre-visit intake | Yes     | No        | Yes          | N/A            | Not planned     |

### 6. Patient Self-Service

| Feature               | MyChart | HealtheMe | Ottehr              | VistA Source      | Phase 26 Status |
| --------------------- | ------- | --------- | ------------------- | ----------------- | --------------- |
| Profile management    | Yes     | Yes       | Yes                 | Patient file      | Placeholder     |
| Emergency contacts    | Yes     | Yes       | No                  | Patient file      | Placeholder     |
| Insurance info        | Yes     | No        | Yes                 | Future            | Not planned     |
| Care team view        | Yes     | No        | No                  | Future: PCMM RPCs | Not planned     |
| Proxy/delegate access | Yes     | No        | Yes (multi-patient) | Future            | Not planned     |

### 7. Document Export

| Feature              | MyChart  | HealtheMe    | Ottehr | VistA Source                | Phase 26 Status |
| -------------------- | -------- | ------------ | ------ | --------------------------- | --------------- |
| CCD/CCR export       | Yes      | Yes (import) | No     | Future: `ORWRP REPORT TEXT` | Placeholder     |
| Blue Button download | Yes (VA) | No           | No     | Future                      | Not planned     |
| Print-friendly views | Yes      | Yes          | No     | N/A                         | Placeholder     |

---

## Status Legend

| Status          | Meaning                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **Skeleton**    | Panel exists in Phase 26 UI, backed by VistA RPC, shows data-source badge |
| **Placeholder** | Panel exists with "Coming Soon" / "Integration Pending" state             |
| **Not planned** | Not in scope for Phase 26; may be added in later phases                   |

---

## VistA-First Principle

Every feature that reads clinical data **MUST** use VistA as the
source of truth. No parallel clinical data store. No shadow database.
The portal reads from VistA RPCs through the existing API gateway.

Portal-specific data (preferences, notification settings, portal
session state) may use a local store, but clinical data always
flows from VistA.
