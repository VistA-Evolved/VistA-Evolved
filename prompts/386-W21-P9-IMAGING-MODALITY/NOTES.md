# Phase 386 — W21-P9 Imaging Modality Connectivity — NOTES

## Design Decisions

- MWL and MPPS stores live in the devices module (not services/imaging) to
  align with the Wave 21 device integration scope.
- MPPS auto-links to worklist by accession number on creation.
- Modality AE registration reuses the Phase 24 validation pattern (uppercase,
  1-16 chars, duplicate check returns 409).
- DICOM UIDs generated with org root 1.2.826.0.1.3680043.8.498 + random suffix.
- All imaging routes fall under /devices/imaging/\* which is covered by the
  existing `/devices/` admin catch-all AUTH_RULE.

## VistA Integration Targets

- `RA ASSIGN ACC#` — accession number generation
- `ORWDXR NEW ORDER` — radiology order placement
- `RAD/NUC MED REGISTER` — radiology registration
- VistA files: Rad/Nuc Med Orders (75.1), Radiology Procedures (71)

## Orthanc Plugin Integration (future)

- Worklist plugin: items would be served as C-FIND SCP responses
- MPPS plugin: N-CREATE/N-SET forwarded to API store
- Config additions to orthanc.json for MWL/MPPS
