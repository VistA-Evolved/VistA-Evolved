# Imaging Grounding — VistA-First Linking Plan

> Phase 23: Documents which VistA Imaging RPCs exist in the sandbox,
> which are missing, and the migration path from prototype sidecar
> to production VistA `^MAG(2005)` / Radiology file integration.

## 1. VistA Imaging RPCs — Sandbox Availability

| RPC                     | Purpose                             | Sandbox Status            | Notes                         |
| ----------------------- | ----------------------------------- | ------------------------- | ----------------------------- |
| `MAG4 REMOTE PROCEDURE` | General imaging metadata dispatch   | **Available** (Phase 22)  | Used for IMAGELIST command    |
| `MAGG PAT PHOTOS`       | Patient photo list                  | **Available** (Phase 22)  | Returns photo IEN + metadata  |
| `MAG4 PAT GET IMAGES`   | Full patient image listing          | **Available** (Phase 22)  | All images for a patient      |
| `RA DETAILED REPORT`    | Radiology report text               | **Available** (Phase 14D) | Text body of a rad report     |
| `MAG4 ADD IMAGE`        | Write image pointer to `^MAG(2005)` | **Not available**         | WorldVistA sandbox lacks this |
| `MAGV RAD EXAM LIST`    | List radiology exams                | **Not available**         | Requires VistA Imaging patch  |
| `MAG4 IMAGE INFO`       | Single image metadata               | **Not available**         | Requires VistA Imaging patch  |
| `MAGG IMAGE INFO`       | Alternative image info              | **Not available**         | Older API surface             |

## 2. VistA Radiology Order RPCs — Sandbox Availability

| RPC                    | Purpose                        | Sandbox Status    | Notes                    |
| ---------------------- | ------------------------------ | ----------------- | ------------------------ |
| `ORWDXR NEW ORDER`     | Create new radiology order     | **Not available** | Stub exists in orders.ts |
| `ORWDXR ISREL`         | Check if rad order is released | **Not available** | Stub exists              |
| `RAD/NUC MED REGISTER` | Register exam in Rad package   | **Not available** | —                        |
| `RARTE EXAMS BY DFN`   | List rad exams for patient     | **Not available** | —                        |

## 3. Current Architecture (Phase 23 Prototype)

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│  Web CPRS    │────→│ API /imaging/ │────→│ Orthanc DICOM    │
│  (Orders +   │     │ worklist +    │     │ (DICOMweb +      │
│   Imaging    │     │ ingest +      │     │  C-STORE)        │
│   Tab)       │     │ linkage       │     └──────────────────┘
└──────────────┘     └───────┬───────┘
                             │
                    ┌────────▼────────┐
                    │ In-Memory       │
                    │ Sidecar Store   │
                    │ (orders +       │
                    │  linkages +     │
                    │  quarantine)    │
                    └─────────────────┘
```

**Data flow:**

1. Provider creates imaging order → stored in sidecar with accession number
2. Modality sends DICOM to Orthanc (C-STORE via port 4242)
3. Orthanc OnStableStudy Lua → POST to `/imaging/ingest/callback`
4. Reconciliation matches AccessionNumber + PatientID → creates linkage
5. Chart shows study grouped under originating order

## 4. Migration: Sidecar → VistA

### Step 1: Order creation via VistA (when ORWDXR available)

```
Current:  POST /imaging/worklist/orders  → sidecar store
Target:   POST /imaging/worklist/orders  → ORWDXR NEW ORDER RPC → ^RAD(75.1)
```

- Replace `worklistStore.set()` with `safeCallRpc("ORWDXR NEW ORDER", [...])`
- Accession number comes from `^RA(74)` via VistA, not our generator
- Order shows up natively in CPRS Radiology tab

### Step 2: Worklist read from VistA (when RARTE/RAD RPCs available)

```
Current:  GET /imaging/worklist → sidecar store iteration
Target:   GET /imaging/worklist → RARTE EXAMS BY DFN → parse VistA response
```

- Replace `getAllWorklistItems()` with RPC call + response parsing
- Fallback to sidecar for orders not yet in VistA

### Step 3: Study linkage via VistA `^MAG(2005)` (when MAG4 ADD IMAGE available)

```
Current:  Reconciliation → sidecar linkageStore
Target:   Reconciliation → MAG4 ADD IMAGE → ^MAG(2005) entry
```

- After reconciliation, call `MAG4 ADD IMAGE` to write the image pointer
- Image entry includes: Patient DFN, Study UID, Orthanc location, order IEN
- Linkage persists across restarts (VistA globals vs in-memory)

### Step 4: Remove sidecar

- Once all 3 steps above are VistA-backed, sidecar becomes read cache only
- Can be removed entirely when VistA is the sole source of truth

## 5. File Number Reference

| File           | Number                       | Purpose                                            |
| -------------- | ---------------------------- | -------------------------------------------------- |
| `^MAG(2005)`   | IMAGE                        | Master image record — links DICOM to patient/order |
| `^MAG(2005.1)` | IMAGE AUDIT                  | Access audit trail for PHI compliance              |
| `^MAG(2005.2)` | NETWORK LOCATION             | Storage tier definitions                           |
| `^RAD(75.1)`   | RAD/NUC MED ORDERS           | Radiology order tracking                           |
| `^RA(74)`      | RAD/NUC MED MASTER ACCESSION | Accession number generator                         |
| `^RAD(70)`     | RAD/NUC MED PATIENT          | Patient exam history                               |

## 6. DICOM MWL Migration Path

When ready for real modality integration:

1. Install Orthanc Worklist plugin (`OrthancPluginCreateDicomInstance`)
2. Generate MWL files from worklist items (DICOM dataset → worklist file)
3. Modalities perform C-FIND for MWL → get scheduled procedure info
4. Modalities include AccessionNumber in acquired study → automatic reconciliation

The V1 REST worklist is designed with MWL fields (AccessionNumber, ScheduledProcedureStep)
so the transition adds a DICOM transport layer, not a data model change.
