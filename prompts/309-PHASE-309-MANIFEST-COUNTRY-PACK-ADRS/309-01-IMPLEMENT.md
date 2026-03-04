# Phase 309 — IMPLEMENT: Manifest + Country-Pack ADRs + Market Matrix

> Wave 13–P1 (Regulatory/Compliance + Multi-Country Packaging)

## Objective

Establish the foundational architectural decisions and market analysis for
multi-country deployment of VistA-Evolved.

## Deliverables

### 1. Country Pack Standard

- **File:** `docs/country-packs/COUNTRY_PACK_STANDARD.md`
- Defines what constitutes a country pack (schema, lifecycle, validation)
- values.json schema with all sections: identity, locale, regulatory,
  data residency, terminology, payer, modules, UI, reporting

### 2. Architecture Decision Records (3 ADRs)

- **`docs/adrs/ADR-country-pack-model.md`** — values-driven vs code-driven
  decision; describes JSON config approach leveraging existing module registry
- **`docs/adrs/ADR-data-residency-model.md`** — region labels, enforcement
  points, cross-border transfer controls, tenant immutability
- **`docs/adrs/ADR-terminology-model.md`** — pluggable terminology registry,
  resolver interface, VistA file mapping, passthrough fallback

### 3. Target Markets Matrix

- **File:** `docs/market/target-markets.md`
- US, PH, GH regulatory requirements
- Terminology, payer, and interop comparison
- Implementation priority (P0/P1/P2)

### 4. Wave 13 Manifest

- **File:** `prompts/WAVE_13_MANIFEST.md`
- BASE_PHASE = 309, 8 phases mapped (309–316)

## Acceptance Criteria

- [ ] `COUNTRY_PACK_STANDARD.md` exists with complete values.json schema
- [ ] All 3 ADRs exist in `docs/adrs/` with correct format
- [ ] `target-markets.md` covers US, PH, GH with regulatory + terminology tables
- [ ] `WAVE_13_MANIFEST.md` exists with all 8 phases mapped
- [ ] No compliance claims without evidence references
- [ ] No legal advice — requirements only

## Dependencies

- Phase 37C: Module registry, SKU profiles (referenced in ADRs)
- Phase 38: Payer registry, seed data (referenced in market matrix)
- Phase 109: DB-backed module entitlements (referenced in pack standard)
- Phase 125: Runtime mode, data plane (referenced in residency ADR)
