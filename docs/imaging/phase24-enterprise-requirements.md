# Phase 24 — Imaging Enterprise Requirements

> Phase 24: Gap analysis for enterprise-grade imaging. Confirms VistA-first architecture,
> maps what is implemented vs missing, and lists target VistA RPCs and files.

## 1. Architecture Confirmation (VistA-First)

| Principle                             | Status        | Evidence                                                                                                                                    |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| VistA holds imaging metadata/pointers | **Partially** | Phase 22 calls MAG4 REMOTE PROCEDURE, MAG4 PAT GET IMAGES, MAGG PAT PHOTOS. Phase 23 sidecar stores orders/linkages pending VistA Rad RPCs. |
| Archive stores binaries               | **Yes**       | Orthanc is the DICOM archive (Phase 22). C-STORE on port 4242.                                                                              |
| Viewer uses DICOMweb via API proxy    | **Yes**       | `/imaging/dicom-web/*` proxy routes in imaging-proxy.ts (Phase 22). No direct Orthanc exposure to browser.                                  |
| OHIF viewer integration               | **Yes**       | `/imaging/viewer` generates OHIF URL with study UID. OHIF on port 3003 reads DICOMweb.                                                      |

## 2. Existing Endpoints

### Imaging Service (imaging-service.ts — Phase 14D/22)

| Route                            | Method | Auth    | Purpose                                            |
| -------------------------------- | ------ | ------- | -------------------------------------------------- |
| `/vista/imaging/status`          | GET    | session | Composite status (VistA + Orthanc + OHIF)          |
| `/vista/imaging/studies`         | GET    | session | Patient studies (VistA → Orthanc → DICOMweb chain) |
| `/vista/imaging/report`          | GET    | session | Radiology report text                              |
| `/vista/imaging/patient-photos`  | GET    | session | Patient photos from VistA                          |
| `/vista/imaging/patient-images`  | GET    | session | Full image list from VistA                         |
| `/vista/imaging/viewer-url`      | GET    | session | OHIF viewer URL                                    |
| `/vista/imaging/metadata`        | GET    | session | WADO-RS metadata                                   |
| `/vista/imaging/registry-status` | GET    | session | Integration registry health                        |

### DICOMweb Proxy (imaging-proxy.ts — Phase 22)

| Route                                                    | Method | Auth    | Purpose                           |
| -------------------------------------------------------- | ------ | ------- | --------------------------------- |
| `/imaging/dicom-web/studies`                             | GET    | session | QIDO-RS study search (cached 30s) |
| `/imaging/dicom-web/studies/:uid/series`                 | GET    | session | QIDO-RS series                    |
| `/imaging/dicom-web/studies/:uid/metadata`               | GET    | session | WADO-RS metadata                  |
| `/imaging/dicom-web/studies/:uid/series/:suid/instances` | GET    | session | QIDO-RS instances                 |
| `/imaging/dicom-web/.../frames/:frameList`               | GET    | session | WADO-RS pixel data                |
| `/imaging/dicom-web/studies`                             | POST   | admin   | STOW-RS upload                    |
| `/imaging/orthanc/studies`                               | GET    | session | Orthanc REST study list           |
| `/imaging/demo/upload`                                   | POST   | admin   | Dev DICOM upload                  |
| `/imaging/viewer`                                        | GET    | session | OHIF URL gen                      |
| `/imaging/health`                                        | GET    | session | Orthanc connectivity              |

### Worklist (imaging-worklist.ts — Phase 23)

| Route                          | Method | Auth    | Purpose              |
| ------------------------------ | ------ | ------- | -------------------- |
| `/imaging/worklist`            | GET    | session | List worklist items  |
| `/imaging/worklist/orders`     | POST   | session | Create imaging order |
| `/imaging/worklist/:id`        | GET    | session | Single item detail   |
| `/imaging/worklist/:id/status` | PATCH  | session | Status transition    |
| `/imaging/worklist/stats`      | GET    | session | Worklist statistics  |

### Ingest Reconciliation (imaging-ingest.ts — Phase 23)

| Route                                      | Method | Auth                    | Purpose               |
| ------------------------------------------ | ------ | ----------------------- | --------------------- |
| `/imaging/ingest/callback`                 | POST   | service (X-Service-Key) | Orthanc webhook       |
| `/imaging/ingest/unmatched`                | GET    | admin                   | Quarantine queue      |
| `/imaging/ingest/unmatched/:id/link`       | POST   | admin                   | Manual reconciliation |
| `/imaging/ingest/linkages`                 | GET    | session                 | All linkages          |
| `/imaging/ingest/linkages/by-patient/:dfn` | GET    | session                 | Patient linkages      |

## 3. Current RBAC Model

| Auth Level | Who             | How Enforced                                 |
| ---------- | --------------- | -------------------------------------------- |
| `none`     | anyone          | health, ready, auth endpoints                |
| `session`  | logged-in user  | cookie-based session (ehr_session)           |
| `admin`    | admin role only | session + `role === "admin"` check           |
| `service`  | Orthanc webhook | X-Service-Key header (constant-time compare) |

**Gaps:**

- No imaging-specific roles (imaging_view, imaging_diagnostic, imaging_admin)
- No break-glass mechanism
- All authenticated users have full imaging access (should be gated by imaging_view)

## 4. Current Audit Model

Existing audit actions (from audit.ts):

- `imaging.study-view`, `imaging.series-view`, `imaging.dicom-upload`, `imaging.proxy-request`
- `imaging.orthanc-health`, `imaging.order-create`, `imaging.order-status-change`
- `imaging.worklist-view`, `imaging.study-linked`, `imaging.study-quarantined`, `imaging.study-ingested`

**Gaps:**

- No hash-chaining for tamper evidence
- No tenant-scoped audit queries
- No compliance admin UI
- No CSV export
- No dedicated imaging audit stream (uses general audit sink)

## 5. Target VistA Imaging RPCs

### Available in WorldVistA Sandbox

| RPC                     | Purpose                  | Used By                                |
| ----------------------- | ------------------------ | -------------------------------------- |
| `MAG4 REMOTE PROCEDURE` | General imaging dispatch | imaging-service.ts (IMAGELIST command) |
| `MAG4 PAT GET IMAGES`   | Full patient image list  | imaging-service.ts                     |
| `MAGG PAT PHOTOS`       | Patient photos           | imaging-service.ts                     |
| `RA DETAILED REPORT`    | Radiology report text    | imaging-service.ts                     |

### Not Available (Target for VistA-Native Migration)

| RPC                    | Purpose                      | VistA File             |
| ---------------------- | ---------------------------- | ---------------------- |
| `MAG4 ADD IMAGE`       | Write image pointer to #2005 | ^MAG(2005)             |
| `MAG4 IMAGE INFO`      | Single image metadata        | ^MAG(2005)             |
| `MAGG IMAGE INFO`      | Alternative image info       | ^MAG(2005)             |
| `MAGV RAD EXAM LIST`   | Radiology exam listing       | ^RAD(70)               |
| `MAG3 TIU IMAGE`       | Link image to TIU document   | ^MAG(2005), ^TIU(8925) |
| `ORWDXR NEW ORDER`     | Create radiology order       | ^RAD(75.1)             |
| `RAD/NUC MED REGISTER` | Register exam                | ^RAD(70)               |
| `RA ASSIGN ACC#`       | Native accession number      | ^RA(74)                |

## 6. VistA Imaging Files (Conceptual Grounding)

| File # | Global       | Purpose                                              |
| ------ | ------------ | ---------------------------------------------------- |
| 2005   | ^MAG(2005)   | IMAGE — Master record linking DICOM to patient/order |
| 2005.1 | ^MAG(2005.1) | IMAGE AUDIT — PHI access audit trail                 |
| 2005.2 | ^MAG(2005.2) | NETWORK LOCATION — Storage tier definitions          |
| 75.1   | ^RAD(75.1)   | RAD/NUC MED ORDERS — Radiology order tracking        |
| 74     | ^RA(74)      | RAD/NUC MED MASTER ACCESSION — Accession counter     |
| 70     | ^RAD(70)     | RAD/NUC MED PATIENT — Patient exam history           |
| 79     | ^RA(79)      | IMAGING TYPE — Modality/procedure definitions        |

## 7. Phase 24 Gap Summary — What to Build

| Feature                    | Status       | Phase 24 Action                                               |
| -------------------------- | ------------ | ------------------------------------------------------------- |
| Imaging-specific RBAC      | Missing      | Add imaging_view, imaging_diagnostic, imaging_admin roles     |
| Break-glass                | Missing      | POST /security/break-glass/start + /stop with TTL + audit     |
| Hash-chained audit         | Missing      | Append-only store with sha256 chaining per entry              |
| Compliance audit UI        | Missing      | Admin panel with filters + CSV export                         |
| Device registry            | Missing      | CRUD API + in-memory store for AE titles/allowlists           |
| DICOMweb rate limiting     | Partial      | Add imaging-specific rate bucket (separate from general)      |
| QIDO caching               | Exists (30s) | Already implemented — confirm + document                      |
| WADO-RS streaming timeout  | Partial      | Add strict abort controller timeouts                          |
| /imaging/health composite  | Exists       | Already in imaging-proxy.ts — enhance with ingest status      |
| Multi-tenant config        | Partial      | tenantId exists on session; need facility→Orthanc URL mapping |
| Per-facility AE allowlists | Missing      | Add to device registry / tenant config                        |
| dcm4chee VNA docs          | Missing      | Document upgrade path                                         |
