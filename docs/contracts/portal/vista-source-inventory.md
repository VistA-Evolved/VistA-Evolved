# VistA Source Inventory — Portal & Telehealth (Phase 26)

> Generated for Phase 26 portal grounding. Documents every VistA RPC,
> route, and M routine available for patient-portal consumption.

---

## 1. Patient-Relevant RPCs (Portal Read Path)

These RPCs are already wired in `apps/api/src/index.ts` and can serve
portal read requests through new `/portal/*` gateway routes.

| RPC Name | Domain | R/W | Portal Relevance | API Route |
|----------|--------|-----|------------------|-----------|
| `ORWPT SELECT` | Patient | Read | Demographics display | `GET /vista/patient-demographics` |
| `ORQQAL LIST` | Allergies | Read | Allergy list view | `GET /vista/allergies` |
| `ORQQVI VITALS` | Vitals | Read | Vitals history view | `GET /vista/vitals` |
| `TIU DOCUMENTS BY CONTEXT` | Notes | Read | Visit summaries (signed only) | `GET /vista/notes` |
| `TIU GET RECORD TEXT` | Notes | Read | Note detail view | `GET /vista/tiu-text` |
| `ORWPS ACTIVE` | Medications | Read | Active medication list | `GET /vista/medications` |
| `ORWCH PROBLEM LIST` | Problems | Read | Problem/diagnosis list | `GET /vista/problems` |
| `ORWLRR INTERIM` | Labs | Read | Lab results view | `GET /vista/labs` |
| `ORQQCN LIST` | Consults | Read | Consult history | `GET /vista/consults` |
| `ORQQCN DETAIL` | Consults | Read | Consult detail | `GET /vista/consults/detail` |
| `ORWSR LIST` | Surgery | Read | Surgery history | `GET /vista/surgery` |
| `TIU DOCUMENTS BY CONTEXT` (class 244) | DC Summaries | Read | Discharge summaries | `GET /vista/dc-summaries` |
| `ORWRP REPORT LISTS` | Reports | Read | Available report definitions | `GET /vista/reports` |
| `ORWRP REPORT TEXT` | Reports | Read | Report content | `GET /vista/reports/text` |

## 2. Write-Back RPCs (Portal Write Path — Future)

These RPCs exist but should be **gated separately** for portal users. Most
require provider authorization; portal writes should be limited to
self-reported data (allergies, vitals from home devices) pending
clinical review workflow.

| RPC Name | Domain | Portal Use Case | Gate Required |
|----------|--------|-----------------|---------------|
| `ORWDAL32 SAVE ALLERGY` | Allergies | Patient self-report (pending review) | Provider countersign |
| `GMV ADD VM` | Vitals | Home device readings | Provider review |
| `ORWDXM AUTOACK` | Medications | Refill request (future) | Provider approval |

## 3. Imaging Integration Points

| Route | Auth | Portal Relevance |
|-------|------|------------------|
| `GET /imaging/dicom-web/studies` | session+perm | View imaging studies |
| `GET /imaging/viewer` | session | OHIF viewer launch |
| `GET /vista/imaging/patient-images` | session | Patient image list |

## 4. HL7/HLO Interop (Admin Only — Not Portal)

These 4 custom interop RPCs (`VE INTEROP *`) are admin-only telemetry
endpoints. They are **not relevant to the patient portal** but document
the full VistA integration surface.

## 5. Auth Model Summary

| Component | Location | Mechanism |
|-----------|----------|-----------|
| Login | `POST /auth/login` | XWB RPC Broker `XUS AV CODE` |
| Session store | `auth/session-store.ts` | In-memory `Map<token, SessionData>` |
| Cookie | `ehr_session` | httpOnly, SameSite=Lax |
| Auth levels | `middleware/security.ts` | none, session, admin, service |
| RBAC | Per-route | `requireRole()`, `requireAdmin()`, permission-based |

**Portal auth** will be a **separate session domain** (`portal_session` cookie)
with its own store, rate limits, and audit trail. Portal users are NOT
clinician users; they authenticate with patient credentials and can only
access their own data (DFN-scoped).

## 6. Summary Statistics

| Category | Count |
|----------|-------|
| Patient-relevant read RPCs | 14 |
| Gated write RPCs (future) | 3 |
| Total live RPCs in system | 35 |
| Total REST endpoints | ~150+ |
| Runbooks documenting RPCs | 44 |
| Custom M routines | 10 |
