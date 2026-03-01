# Phase 389 — W22-P1 NOTES

## Decisions Made

- **Phase range**: 389–398 (10 phases). W21 ended at 388; W22 starts at 389.
- **Coverage map location**: `docs/product/` (new directory). Product-level
  documentation that cuts across engineering phases.
- **ADR naming**: `ADR-W22-*` prefix consistent with W21's `ADR-W21-*` convention.

## Upstream Dependencies Identified

- **facility-service.ts** (Wave 17, Phase 347): Facility → Department → Location
  hierarchy. Bedboard (W22-P3) extends Location with bed assignments.
- **templates/types.ts** (Phase 158): ClinicalTemplate, SpecialtyPack,
  TemplateSection. Content packs v2 (W22-P2) extends this.
- **devices/** (Wave 21): HL7v2, ASTM, POCT1-A, SDC ingest + alarm pipeline +
  infusion/BCMA bridge. Inpatient/ICU/pharmacy/lab packs consume these.
- **imaging-proxy.ts** (Phase 24): DICOMweb proxy + OHIF viewer integration.
  Imaging/radiology pack (W22-P6) builds on this.
- **rcm/** (Phases 38-40): Claim store + EDI pipeline. Revenue cycle touchpoints
  in each specialty pack feed into this.
- **outbound-builder.ts** (HL7 engine): ADT message builder for
  admit/transfer/discharge workflows.

## Key Design Choices

1. **ContentPackV2 extends, doesn't replace** — preserves all Phase 158 template
   work while adding order sets, flowsheets, inbox rules, dashboards, CDS rules.
2. **Hybrid CDS** — native engine for latency-critical hooks + CQF Ruler sidecar
   for complex clinical reasoning. CQF Ruler is opt-in.
3. **CPT pass-through** — no AMA-licensed content bundled; consistent with
   Phase 40 decision.
4. **CSS variable theming** — zero-JS mode switching, Tailwind compatible,
   tenant-overridable at runtime.
