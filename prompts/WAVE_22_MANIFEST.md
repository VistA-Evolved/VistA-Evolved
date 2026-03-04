# Wave 22 — Specialty Clinical Content + CDS + Deep VistA Writeback

> Clinical content packs (installable per specialty/country), inpatient core
> (ADT bedboard + nursing flowsheets + vitals writeback), pharmacy/lab/imaging
> deep workflows with VistA alignment contracts, CDS Hooks + SMART Launch,
> clinical reasoning / measure evaluation, localization + theming engine,
> and a specialty certification runner.

## Phase Map

| Wave Phase | Resolved ID | Title                                                                 | Prompt Folder                     |
| ---------- | ----------- | --------------------------------------------------------------------- | --------------------------------- |
| W22-P1     | 389         | Reservation + Manifest + Specialty Coverage Map + ADRs                | `389-W22-P1-MANIFEST-COVERAGE`    |
| W22-P2     | 390         | Clinical Content Pack Framework v2                                    | `390-W22-P2-CONTENT-PACKS`        |
| W22-P3     | 391         | Inpatient Core (ADT bedboard + nursing flowsheets + vitals writeback) | `391-W22-P3-INPATIENT-CORE`       |
| W22-P4     | 392         | Pharmacy Deep Workflows + VistA Alignment Contracts                   | `392-W22-P4-PHARMACY-DEEP`        |
| W22-P5     | 393         | Lab Deep Workflows + Writeback Contracts                              | `393-W22-P5-LAB-DEEP`             |
| W22-P6     | 394         | Imaging/Radiology Workflows + Writeback Contracts                     | `394-W22-P6-IMAGING-RAD`          |
| W22-P7     | 395         | CDS Hooks + SMART Launch Integration                                  | `395-W22-P7-CDS-HOOKS`            |
| W22-P8     | 396         | Clinical Reasoning + Measures (CQL/Measure eval)                      | `396-W22-P8-CLINICAL-REASONING`   |
| W22-P9     | 397         | Localization + Multi-Country Packs + Theming Engine                   | `397-W22-P9-LOCALIZATION-THEMING` |
| W22-P10    | 398         | Specialty Certification Runner                                        | `398-W22-P10-CERT-RUNNER`         |

## ADR Index

| ADR                 | Path                                      |
| ------------------- | ----------------------------------------- |
| Content Packs       | `docs/decisions/ADR-W22-CONTENT-PACKS.md` |
| CDS Architecture    | `docs/decisions/ADR-W22-CDS-ARCH.md`      |
| Terminology Posture | `docs/decisions/ADR-W22-TERMINOLOGY.md`   |
| Theming Engine      | `docs/decisions/ADR-W22-THEMING.md`       |

## Dependencies & Run Order

```
P1 (manifest+ADRs) ─── P2 (content packs v2)
                   └── P3 (inpatient core)
                   └── P4 (pharmacy deep)
                   └── P5 (lab deep)
                   └── P6 (imaging/rad)
       P2 ─── P7 (CDS hooks)
          └── P8 (clinical reasoning)
          └── P9 (localization + theming)
       ALL ─── P10 (certification runner)
```

P1 is foundational. P2 gates content-dependent phases. P3–P6 are independently
buildable once P1+P2 exist. P7–P9 build on the pack framework. P10 certifies
everything end-to-end.

## Scope

1. Clinical content pack framework v2 — installable packs with templates,
   order sets, flowsheets, inbox rules, dashboards; semver + rollback.
2. Inpatient core — ADT bedboard, nursing flowsheets, vitals writeback at
   posture level. Reuses Wave 17 facility/location hierarchy.
3. Pharmacy deep — full medication lifecycle (order → verify → dispense →
   administer → discontinue) with safety, audit, and VistA contract tests.
4. Lab deep — order entry, specimen tracking, results review/verify, critical
   result alerting with VistA contract tests.
5. Imaging/radiology deep — order scheduling, radiology report workflow
   (draft → sign), study linkage, viewer integration, VistA contracts.
6. CDS Hooks — HL7 CDS Hooks posture (patient-view, order-sign, etc.),
   provider-agnostic adapter, UI trigger points.
7. Clinical reasoning — CQF Ruler sidecar integration posture, measure
   evaluation pipeline with scheduled runs and evidence outputs.
8. Localization + theming — multi-locale UI strings, UCUM unit normalization,
   country packs (address/code system/consent defaults), CSS variable
   theming with legacy/modern/branded modes.
9. Specialty certification runner — scenario-per-pack test suite covering
   all deep workflows + VistA RPC contract fixture checks.

## Upstream Dependencies

- Wave 17: Facility/Department/Location hierarchy (`facility-service.ts`)
- Wave 21: Device ingest (HL7v2, ASTM, POCT1-A, SDC, DICOM), alarm pipeline,
  infusion/BCMA bridge, imaging modality MWL/MPPS
- Phase 158: Template engine (`templates/types.ts`, `template-engine.ts`,
  `pack-validator.ts`)
- Phase 24: Imaging RBAC + audit + DICOMweb proxy
- Phase 38: RCM claim lifecycle + payer connectivity
