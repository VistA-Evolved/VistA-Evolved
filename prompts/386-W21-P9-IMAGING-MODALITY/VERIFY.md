# Phase 386 — W21-P9 Imaging Modality Connectivity — VERIFY

## Verification Gates

### Gate 1: Source files exist

- [ ] `imaging-modality-types.ts`, `imaging-modality-store.ts`, `imaging-modality-routes.ts`

### Gate 2: Barrel + registration

- [ ] `imagingModalityRoutes` exported and registered

### Gate 3: Store policy (4 entries)

- [ ] `imaging-worklist-items`, `imaging-mpps-records`, `imaging-modality-configs`, `imaging-modality-audit-log`

### Gate 4: 15 REST endpoints

- [ ] 4 worklist + 4 MPPS + 5 modality + 2 stats/audit

### Gate 5: MWL auto-link

- [ ] MPPS creation auto-links to worklist by accession number

### Gate 6: AE Title validation

- [ ] Uppercase 1-16 chars, duplicate detection, 409 on conflict

### Gate 7: DICOM UID generation

- [ ] `generateDicomUid()` produces valid 1.2.826... format

### Gate 8: Evidence

- [ ] `evidence/wave-21/386-imaging-modality/evidence.md` exists
