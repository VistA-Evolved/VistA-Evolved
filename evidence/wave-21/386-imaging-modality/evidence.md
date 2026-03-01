# Evidence: Phase 386 — W21-P9 Imaging Modality Connectivity

## Phase ID
386

## Wave
21 — Device + Modality Integration Platform

## Title
Imaging Modality Connectivity (DICOM MWL/MPPS + Modality AE Registration)

## Artifacts Created
| File | Lines | Purpose |
|------|-------|---------|
| `imaging-modality-types.ts` | ~160 | Types: WorklistItem, MppsRecord, ModalityAeConfig, DoseReport |
| `imaging-modality-store.ts` | ~300 | Stores + MPPS auto-link + DICOM UID gen |
| `imaging-modality-routes.ts` | ~230 | 15 REST endpoints |

## Wiring Changes
| File | Change |
|------|--------|
| `devices/index.ts` | Added `imagingModalityRoutes` export |
| `register-routes.ts` | Import + `server.register(imagingModalityRoutes)` |
| `store-policy.ts` | 4 entries: worklist, mpps, modality-configs, audit |

## Endpoint Inventory (15 endpoints)
| Method | Path | Auth |
|--------|------|------|
| POST | `/devices/imaging/worklist` | admin |
| GET | `/devices/imaging/worklist` | admin |
| GET | `/devices/imaging/worklist/:id` | admin |
| PATCH | `/devices/imaging/worklist/:id/status` | admin |
| POST | `/devices/imaging/mpps` | admin |
| GET | `/devices/imaging/mpps` | admin |
| GET | `/devices/imaging/mpps/:id` | admin |
| PATCH | `/devices/imaging/mpps/:id/status` | admin |
| POST | `/devices/imaging/modalities` | admin |
| GET | `/devices/imaging/modalities` | admin |
| GET | `/devices/imaging/modalities/:id` | admin |
| PATCH | `/devices/imaging/modalities/:id/status` | admin |
| POST | `/devices/imaging/modalities/:id/echo` | admin |
| GET | `/devices/imaging/stats` | admin |
| GET | `/devices/imaging/audit` | admin |

## Store Policy
- `imaging-worklist-items` — 10K max
- `imaging-mpps-records` — 20K max
- `imaging-modality-configs` — 500 max
- `imaging-modality-audit-log` — 20K max

## Commit
Pending — `phase(386): W21-P9 Imaging Modality Connectivity`
