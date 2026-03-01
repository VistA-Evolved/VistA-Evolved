# Phase 389 — W22-P1 IMPLEMENT: Reservation + Manifest + Specialty Coverage Map + ADRs

## User Request

Reserve the Wave 22 phase range, create the manifest, produce a comprehensive
specialty clinical coverage map, and author 4 architectural decision records
covering content packs, CDS architecture, terminology posture, and theming.

## Implementation Steps

1. **Reserve phase range 389–398** (10 phases, contiguous after W21 388)
   - Update `docs/qa/prompt-phase-range-reservations.json`
2. **Create `/prompts/WAVE_22_MANIFEST.md`**
   - Phase map table with resolved IDs 389–398
   - ADR index
   - Dependency graph
   - Scope summary
   - Upstream dependency references (Wave 17, 21, Phase 158, 24, 38)
3. **Create `/docs/product/specialty-coverage-map.md`**
   - 8 specialty areas: outpatient primary care, inpatient med/surg, ICU,
     ED, OR/anesthesia, pharmacy, lab+POCT, imaging/radiology
   - Revenue cycle touchpoints (cross-cutting handoff summary)
   - Per-specialty: workflows, templates, order sets, flowsheets, CDS hooks,
     VistA RPCs, Wave 21 links, RCM touchpoints
   - Pack status matrix
   - VistA RPC coverage summary
4. **Create 4 ADRs:**
   - `ADR-W22-CONTENT-PACKS.md` — ContentPackV2 schema, semver versioning,
     install/rollback lifecycle, governance model
   - `ADR-W22-CDS-ARCH.md` — hybrid native + CQF Ruler, CDS Hooks posture,
     provider-agnostic adapter interface
   - `ADR-W22-TERMINOLOGY.md` — LOINC/UCUM full adoption, SNOMED/ICD/CPT
     reference-only, pass-through for proprietary, terminology service interface
   - `ADR-W22-THEMING.md` — CSS variable theming, legacy/modern/high-contrast
     presets, tenant branding overrides
5. **Create prompt folder** `389-W22-P1-MANIFEST-COVERAGE/`
   - IMPLEMENT.md, VERIFY.md, NOTES.md

## Files Touched

- `docs/qa/prompt-phase-range-reservations.json` — add W22 reservation
- `prompts/WAVE_22_MANIFEST.md` — new
- `docs/product/specialty-coverage-map.md` — new
- `docs/decisions/ADR-W22-CONTENT-PACKS.md` — new
- `docs/decisions/ADR-W22-CDS-ARCH.md` — new
- `docs/decisions/ADR-W22-TERMINOLOGY.md` — new
- `docs/decisions/ADR-W22-THEMING.md` — new
- `prompts/389-W22-P1-MANIFEST-COVERAGE/389-01-IMPLEMENT.md` — new
- `prompts/389-W22-P1-MANIFEST-COVERAGE/389-99-VERIFY.md` — new
- `prompts/389-W22-P1-MANIFEST-COVERAGE/NOTES.md` — new
- `evidence/wave-22/389-manifest-coverage/evidence.md` — new
