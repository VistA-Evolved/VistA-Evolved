# Phase 387 — W21-P10 LOINC/UCUM Normalization — VERIFY

## Verification Gates

### Gate 1: Source files exist

- [ ] `normalization-engine.ts` and `normalization-routes.ts` exist

### Gate 2: Barrel + registration

- [ ] `normalizationRoutes` exported from barrel and registered

### Gate 3: LOINC mappings

- [ ] MDC_TO_LOINC has 13+ vital sign mappings
- [ ] LAB_TO_LOINC has 24+ lab analyte mappings (chem, ABG, heme, coag, POCT)
- [ ] All mappings have valid LOINC codes

### Gate 4: UCUM mappings

- [ ] UNIT_TO_UCUM has 30+ unit mappings
- [ ] Temperature F→C conversion factor correct (5/9, offset -32\*5/9)
- [ ] Identity mappings (already UCUM compliant) have factor=1, offset=0

### Gate 5: Normalization engine

- [ ] `normalizeObservation()` returns structured result
- [ ] `normalizeObservationBatch()` handles arrays
- [ ] QA warnings populated for unmapped codes/units

### Gate 6: 7 REST endpoints

- [ ] POST /devices/normalize (single)
- [ ] POST /devices/normalize/batch
- [ ] GET /devices/normalize/mappings
- [ ] GET /devices/normalize/mappings/loinc
- [ ] GET /devices/normalize/mappings/ucum
- [ ] POST /devices/normalize/validate (QA)
- [ ] GET /devices/normalize/stats

### Gate 7: Evidence

- [ ] `evidence/wave-21/387-normalization/evidence.md` exists
