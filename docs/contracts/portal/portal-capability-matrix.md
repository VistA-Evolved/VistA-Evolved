# Portal Capability Matrix — Phase 26

> Module → Screen/Action → VistA Source → Status → Notes

---

## Auth Module

| Screen / Action  | VistA Source           | API Route                  | Status   | Notes                       |
| ---------------- | ---------------------- | -------------------------- | -------- | --------------------------- |
| Login (dev mode) | Patient file (DFN map) | `POST /portal/auth/login`  | Skeleton | Dev-only DFN mapping        |
| Logout           | —                      | `POST /portal/auth/logout` | Skeleton | Destroys portal session     |
| Session check    | —                      | `GET /portal/auth/session` | Skeleton | Returns portal session data |

## Dashboard Module

| Screen / Action      | VistA Source  | API Route      | Status   | Notes                      |
| -------------------- | ------------- | -------------- | -------- | -------------------------- |
| Health summary cards | Multiple RPCs | Multiple reads | Skeleton | Aggregates from 6+ domains |

## Health Records Module

| Screen / Action     | VistA Source                     | API Route                        | Status   | Notes                      |
| ------------------- | -------------------------------- | -------------------------------- | -------- | -------------------------- |
| Allergies list      | `ORQQAL LIST`                    | `GET /vista/allergies`           | Skeleton | Read-only, DFN-scoped      |
| Problem list        | `ORWCH PROBLEM LIST`             | `GET /vista/problems`            | Skeleton | Read-only, DFN-scoped      |
| Vitals history      | `ORQQVI VITALS`                  | `GET /vista/vitals`              | Skeleton | Read-only, date-ranged     |
| Lab results         | `ORWLRR INTERIM`                 | `GET /vista/labs`                | Skeleton | Read-only                  |
| Imaging studies     | DICOMweb proxy                   | `GET /imaging/dicom-web/studies` | Skeleton | Requires imaging_view perm |
| Consult history     | `ORQQCN LIST`                    | `GET /vista/consults`            | Skeleton | Read-only                  |
| Surgery history     | `ORWSR LIST`                     | `GET /vista/surgery`             | Skeleton | Read-only                  |
| Discharge summaries | `TIU DOCUMENTS BY CONTEXT` (244) | `GET /vista/dc-summaries`        | Skeleton | Signed docs only           |
| Clinical reports    | `ORWRP REPORT TEXT`              | `GET /vista/reports/text`        | Skeleton | Cached 30s (Phase 25)      |

## Medications Module

| Screen / Action    | VistA Source                     | API Route                | Status      | Notes                   |
| ------------------ | -------------------------------- | ------------------------ | ----------- | ----------------------- |
| Active medications | `ORWPS ACTIVE` + `ORWORR GETTXT` | `GET /vista/medications` | Skeleton    | Multi-line `~` grouped  |
| Medication detail  | `ORWORR GETTXT`                  | `GET /vista/medications` | Skeleton    | Per-order text          |
| Refill request     | `ORWDXM AUTOACK` (future)        | —                        | Placeholder | Needs provider approval |

## Messages Module

| Screen / Action | VistA Source   | API Route | Status      | Notes     |
| --------------- | -------------- | --------- | ----------- | --------- |
| Message inbox   | Future: SM API | —         | Placeholder | Not wired |
| Compose message | Future: SM API | —         | Placeholder | Not wired |

## Appointments Module

| Screen / Action  | VistA Source    | API Route | Status      | Notes     |
| ---------------- | --------------- | --------- | ----------- | --------- |
| View upcoming    | Future: SD RPCs | —         | Placeholder | Not wired |
| View past        | Future: SD RPCs | —         | Placeholder | Not wired |
| Book appointment | Future: SD RPCs | —         | Placeholder | Not wired |

## Telehealth Module

| Screen / Action  | VistA Source   | API Route | Status      | Notes                   |
| ---------------- | -------------- | --------- | ----------- | ----------------------- |
| Join video visit | N/A (external) | —         | Placeholder | WebRTC-based (future)   |
| Waiting room     | N/A (external) | —         | Placeholder | Status polling (future) |

## Profile Module

| Screen / Action | VistA Source   | API Route                         | Status      | Notes             |
| --------------- | -------------- | --------------------------------- | ----------- | ----------------- |
| Demographics    | `ORWPT SELECT` | `GET /vista/patient-demographics` | Skeleton    | Read-only         |
| Contact info    | `ORWPT SELECT` | `GET /vista/patient-demographics` | Skeleton    | Read-only         |
| Preferences     | Local store    | —                                 | Placeholder | Non-clinical data |

---

## Status Legend

| Status          | Meaning                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| **Skeleton**    | UI panel + data-source badge rendered; wiring to VistA RPC exists in API |
| **Placeholder** | UI panel + "Integration Pending" badge; no backend wiring yet            |
| **Future**      | Not in Phase 26; documented for planning                                 |
