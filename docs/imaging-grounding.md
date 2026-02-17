# Imaging Grounding — VistA Imaging Architecture × Build Strategy

> **Phase 20 — VistA-First Grounding**
> VistA Imaging is a **VA-regulated medical device** with proprietary client 
> components. This document defines what we build, what we don't, and how the
> open-source stack (OHIF + Orthanc + dcm4chee) integrates with VistA's
> imaging metadata.

---

## 1. What VistA Imaging Actually Is

VistA Imaging is **not** just a PACS. It is a four-layer system:

| Layer | What | Open Source? |
|-------|------|-------------|
| **M routines** (MAG*, ZMAG*) | FileMan metadata, RPC entry points, business rules | **Yes** — published in OSEHRA/WorldVistA |
| **Image archive** | Network shares (RAID jukebox / SAN) storing actual image files | N/A (storage infrastructure) |
| **Clinical Display / VistARad** | Delphi thick-client viewers (diagnostic quality, annotations) | **No** — proprietary VA builds, AccuSoft ImageGear licensed |
| **DICOM Gateway** | Java service for modality worklist, image ingest, HL7 | Partially open (old Laurel Bridge components are proprietary) |

### Key principle

> **We do NOT rebuild the proprietary clients.**
> We build a modern web viewer stack that reads VistA metadata via RPCs and
> serves images via standards (DICOMweb). VistA remains the source of truth
> for imaging metadata (what was captured, when, for whom, by whom).

---

## 2. VistA Imaging FileMan Files

| File # | Name | Global | Purpose |
|--------|------|--------|---------|
| **2005** | IMAGE | ^MAG(2005) | **Master image record**: patient pointer, procedure pointer, image type, acquisition date, status flags, Abstract/Full/Big paths, StudyInstanceUID |
| **2005.1** | IMAGE AUDIT | ^MAG(2005.1) | Audit trail: who accessed/modified image records |
| **2005.2** | NETWORK LOCATION | ^MAG(2005.2) | Storage tier definitions: archive paths, share credentials |
| **2006.034** | IMAGING SITE PARAMETERS | ^MAG(2006.034) | Site-level config: default storage, retention policies, DICOM AE titles |
| **2006.1** | MAG WORK ITEM | ^MAG(2006.1) | Background processing queue: image conversion, replication tasks |
| **2006.531** | MAG RAD PROCEDURE | ^MAG(2006.531) | Radiology-specific imaging parameters |
| **74** | RAD/NUC MED REPORTS | ^RARPT(74) | Radiology report text (referenced by imaging for rad studies) |
| **70** | RAD/NUC MED PATIENT | ^RADPT(70) | Patient radiology file — exams, orders, status |

---

## 3. VistA Imaging RPCs

These RPCs are the **sanctioned API** for accessing VistA Imaging data:

| RPC | Package | Purpose | Status in VE |
|-----|---------|---------|-------------|
| `MAG4 REMOTE PROCEDURE` | MAG | Gateway RPC — dispatch various imaging sub-commands | **wired** (status probe) |
| `MAG4 PAT GET IMAGES` | MAG | Get patient image list (IEN, type, date, description) | **gap** |
| `MAG4 IMAGE INFO` | MAG | Get metadata for specific image (class, type, capture date, procedure) | **gap** |
| `MAGG PAT PHOTOS` | MAG | Get patient photograph (ID photo for banner) | **gap** |
| `MAGG CAPTURE` | MAG | Capture new image record (associates image with patient/procedure) | **gap** |
| `MAG4 REMOTE IMAGE VIEWS` | MAG | Cross-site image access (VIX-like remote data) | **gap** |
| `MAG DICOM LOOKUP` | MAG | Find imaging studies by DICOM attributes | **gap** |
| `RA DETAILED REPORT` | RA | Get radiology report text by case ID | **wired** |
| `MAGV RAD EXAM LIST` | MAG/RA | Get radiology exam worklist for a patient | **gap** |
| `MAGG GROUP IMAGES` | MAG | Get image groups (multi-image studies) | **gap** |
| `MAG4 GET IMAGE INFO` | MAG | Extended metadata (series, instance, DICOM tags) | **gap** |

---

## 4. Build Strategy: OHIF + Orthanc + dcm4chee

Instead of rebuilding Clinical Display / VistARad, we use an **open-source
DICOM stack** that reads from VistA and serves standards-based imaging:

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (OHIF Viewer)                                       │
│  - Diagnostic-quality web viewing                            │
│  - DICOM annotations, measurements                          │
│  - MPR, 3D reconstruction                                    │
└──────────────┬───────────────────────────────────────────────┘
               │ DICOMweb (WADO-RS, QIDO-RS, STOW-RS)
┌──────────────▼───────────────────────────────────────────────┐
│  Orthanc DICOM Server                                        │
│  - Receives images from modalities (C-STORE)                 │
│  - Serves DICOMweb API                                       │
│  - Stores images in local/cloud storage                      │
│  - Forwards metadata to VistA via HL7 / RPC                  │
└──────────────┬───────────────────────────────────────────────┘
               │ DICOM C-STORE / C-FIND / C-MOVE
               │ HL7 ORM/ORU
┌──────────────▼───────────────────────────────────────────────┐
│  dcm4chee Archive (optional, for enterprise scale)           │
│  - Long-term DICOM archive                                   │
│  - Lifecycle management                                      │
│  - DICOM federation                                          │
└──────────────────────────────────────────────────────────────┘
               │
       VistA Imaging ← metadata sync →
       File #2005 → study/series/instance pointers
       File #70/74 → radiology orders/reports
```

### Data flow

1. **Modality → Orthanc**: Modality sends DICOM images via C-STORE
2. **Orthanc → VistA**: Metadata (patient ID, study UID, modality, date) posted to VistA via custom RPC or HL7 ORM
3. **VistA → Platform**: Platform reads imaging metadata via `MAG4 PAT GET IMAGES` RPC
4. **Platform → OHIF**: Generates viewer URL with StudyInstanceUID, OHIF fetches images via DICOMweb from Orthanc
5. **Audit**: All image access logged via VistA file #2005.1 + platform audit log

---

## 5. Current Implementation State

| Component | Status | Code Location |
|-----------|--------|---------------|
| Imaging status probe | **wired** | `apps/api/src/services/imaging-service.ts` → `MAG4 REMOTE PROCEDURE` |
| Radiology report | **wired** | Same file → `RA DETAILED REPORT` |
| Patient study list | **scaffolded** | Same file → attempts `MAG4 REMOTE PROCEDURE` with IMAGELIST sub-command |
| OHIF viewer URL | **wired** | Same file → `buildOhifViewerUrl()` uses integration registry config |
| DICOMweb proxy | **scaffolded** | Same file → fetches from configured DICOMweb endpoint |
| Image metadata | **scaffolded** | Same file → parses metadata from DICOMweb or VistA response |
| Registry integration | **wired** | Uses `integration-registry.ts` for PACS/VNA entries |

---

## 6. Why We Don't Rebuild VA's Proprietary Components

| VA Component | Why NOT to rebuild | What we do instead |
|-------------|-------------------|-------------------|
| **Clinical Display** (Delphi) | Proprietary; AccuSoft ImageGear license; FDA 510(k) regulated | Use OHIF web viewer (open source, actively maintained) |
| **VistARad** (Delphi) | Proprietary diagnostic workstation; regulatory burden | OHIF has diagnostic-grade viewing capabilities |
| **DICOM Gateway** (Java) | Contains Laurel Bridge proprietary transcoding | dcm4chee / Orthanc handle all DICOM services |
| **VIX** (VA Image Exchange) | VA-internal service for cross-site federation | Build DICOMweb federation using Orthanc peer sync |
| **Capture client** | Requires modality-specific integration | Orthanc receives C-STORE from modalities directly |

---

## 7. DICOM / HL7 Conformance Posture

### DICOM Conformace Statement (via Orthanc)

| SOP Class | Role | Status |
|-----------|------|--------|
| Verification (C-ECHO) | SCP/SCU | Supported via Orthanc |
| CT Image Storage | SCP | Supported via Orthanc |
| MR Image Storage | SCP | Supported via Orthanc |
| CR/DX Image Storage | SCP | Supported via Orthanc |
| US Image Storage | SCP | Supported via Orthanc |
| Secondary Capture | SCP | Supported via Orthanc |
| Query/Retrieve (C-FIND/C-MOVE) | SCP/SCU | Supported via Orthanc |
| Modality Worklist (MWL) | SCP | Orthanc plugin available |

### IHE Profile Awareness

| Profile | Relevance | Implementation |
|---------|-----------|---------------|
| **SWF** (Scheduled Workflow) | Order → acquisition → report | VistA orders + Orthanc worklist + dcm4chee storage |
| **PIR** (Patient Info Reconciliation) | Match DICOM patient to VistA patient | Platform maps MRN from DICOM to VistA DFN |
| **XDS-I.b** (Cross-Enterprise Document Sharing for Imaging) | Multi-site image exchange | Future: DICOMweb federation |
| **ATNA** (Audit Trail and Node Authentication) | Security/audit | Platform audit log + VistA file #2005.1 |

---

## 8. FDA / Regulatory Considerations

VistA Imaging components that interpret images for diagnosis are **FDA Class II
medical devices** (510(k) cleared). Our build strategy avoids this:

- **OHIF** is a viewer, not a diagnostic device (unless used for primary interpretation — site policy decides)
- **Orthanc** is a storage/routing server, not a diagnostic device  
- **Our platform** does not perform image analysis, AI-based diagnosis, or measurement
- Any future AI image analysis (e.g., MedGemma radiology) must go through the **AI Gateway** (`docs/ai-gateway-plan.md`) with human-in-the-loop governance

---

## 9. Implementation Roadmap

| Step | Description | Priority | Dependency |
|------|-------------|----------|------------|
| 1 | Ground imaging architecture in this doc | **Done** | Phase 20 |
| 2 | Wire `MAG4 PAT GET IMAGES` for patient study list | HIGH | VistA MAG routines available |
| 3 | Wire `MAG4 IMAGE INFO` for metadata display | HIGH | Step 2 |
| 4 | Wire `MAGG PAT PHOTOS` for patient banner photo | MEDIUM | VistA MAG routines |
| 5 | Deploy Orthanc in Docker for dev imaging | HIGH | Docker Compose update |
| 6 | Configure OHIF to use Orthanc's DICOMweb endpoint | HIGH | Step 5 |
| 7 | Sync Orthanc metadata to VistA file #2005 | MEDIUM | Custom RPC or HL7 bridge |
| 8 | Wire `MAGV RAD EXAM LIST` for radiology worklist | MEDIUM | VistA RAD routines |
| 9 | Add cross-site image exchange (DICOMweb federation) | LOW | Multi-site deployment |
| 10 | Evaluate OHIF annotations for clinical use | LOW | Clinical workflow requirements |
