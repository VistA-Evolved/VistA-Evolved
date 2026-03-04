# Phase 283 — Migration Templates Expansion (VERIFY)

## Gate Checks

### G1: SourceFormat type includes all vendor C-CDA values

```bash
grep -c "ccda" apps/api/src/migration/types.ts
# Expected: >= 6 (ccda, epic-ccda, cerner-ccda, athena-ccda, ecw-ccda, practicefusion-ccda)
```

### G2: Template count is 22

```bash
grep -c "MappingTemplate = {" apps/api/src/migration/templates.ts
# Expected: 22
```

### G3: ALL_TEMPLATES array has 22 entries

```bash
# Count non-comment, non-empty entries between ALL_TEMPLATES declaration and ];
```

### G4: FHIR_PATIENT is v2.0.0 (not placeholder)

```bash
grep "version.*2.0.0" apps/api/src/migration/templates.ts | head -1
# Expected: match
grep "placeholder" apps/api/src/migration/templates.ts
# Expected: no match
```

### G5: All 8 FHIR resource types have templates

- fhir-bundle-patient
- fhir-bundle-allergy
- fhir-bundle-condition
- fhir-bundle-observation
- fhir-bundle-medication-request
- fhir-bundle-encounter
- fhir-bundle-appointment
- fhir-bundle-document-reference

### G6: All 5 vendor C-CDA families represented

- epic-ccda (patient, problem)
- cerner-ccda (patient, allergy)
- athena-ccda (patient)
- ecw-ccda (patient)
- practicefusion-ccda (patient)

### G7: Synthetic FHIR fixture exists and is valid JSON

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/api/src/migration/__fixtures__/synthetic-fhir-bundle.json','utf8')); console.log('PASS')"
```

### G8: Synthetic CCDA fixture exists and contains expected sections

```bash
grep -c "code code=" apps/api/src/migration/__fixtures__/synthetic-ccda.xml
# Expected: > 0 (LOINC section codes)
```

### G9: No PHI in fixtures

```bash
# No real SSN, DOB, patient names, MRN
grep -i "SYNTH\|TESTPATIENT\|000-00-" apps/api/src/migration/__fixtures__/synthetic-fhir-bundle.json
# Expected: synthetic identifiers only
```

### G10: TypeScript compiles clean

```bash
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
```

## Results

- [ ] G1: SourceFormat — PASS/FAIL
- [ ] G2: Template count — PASS/FAIL
- [ ] G3: ALL_TEMPLATES — PASS/FAIL
- [ ] G4: No placeholder — PASS/FAIL
- [ ] G5: FHIR templates — PASS/FAIL
- [ ] G6: Vendor CCDA — PASS/FAIL
- [ ] G7: FHIR fixture valid — PASS/FAIL
- [ ] G8: CCDA fixture valid — PASS/FAIL
- [ ] G9: No PHI — PASS/FAIL
- [ ] G10: TS clean — PASS/FAIL
