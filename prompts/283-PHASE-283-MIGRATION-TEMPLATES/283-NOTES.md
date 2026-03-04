# Phase 283 — Migration Templates Expansion (NOTES)

## Summary

Expanded migration template library from 8 → 22 templates:

- 8 FHIR R4 templates (1 upgraded from placeholder, 7 new)
- 7 vendor C-CDA profiles (Epic, Cerner, athenahealth, eCW, Practice Fusion)
- 6 new SourceFormat values for vendor C-CDA identification

## Key Decisions

1. **FHIR template field names match parser output** — source fields in templates
   use the exact field names returned by `fhir-bundle-parser.ts` extractors,
   not raw FHIR paths. This means templates can validate parser output directly.
2. **Observation maps to problem entity** — until a dedicated vitals/lab entity
   type is added, Observation data maps to the problem entity with LOINC code
   and value/unit fields. Template description documents this mapping.
3. **Vendor C-CDA profiles document OID roots** — each template description
   includes the vendor's known OID root for MRN/facility identification.
4. **Synthetic fixtures are NO PHI** — all identifiers are clearly synthetic
   (TESTPATIENT, 000-00-0001, MRN-SYNTH-001). No real clinical data.

## Template Inventory (22 total)

| ID                             | Source Format       | Entity      | Version |
| ------------------------------ | ------------------- | ----------- | ------- |
| generic-csv-patient            | generic-csv         | patient     | 1.0.0   |
| generic-csv-problem            | generic-csv         | problem     | 1.0.0   |
| generic-csv-medication         | generic-csv         | medication  | 1.0.0   |
| generic-csv-allergy            | generic-csv         | allergy     | 1.0.0   |
| generic-csv-appointment        | generic-csv         | appointment | 1.0.0   |
| openemr-csv-patient            | openemr-csv         | patient     | 1.0.0   |
| openemr-csv-allergy            | openemr-csv         | allergy     | 1.0.0   |
| fhir-bundle-patient            | fhir-bundle         | patient     | 2.0.0   |
| fhir-bundle-allergy            | fhir-bundle         | allergy     | 2.0.0   |
| fhir-bundle-condition          | fhir-bundle         | problem     | 2.0.0   |
| fhir-bundle-observation        | fhir-bundle         | problem     | 2.0.0   |
| fhir-bundle-medication-request | fhir-bundle         | medication  | 2.0.0   |
| fhir-bundle-encounter          | fhir-bundle         | appointment | 2.0.0   |
| fhir-bundle-appointment        | fhir-bundle         | appointment | 2.0.0   |
| fhir-bundle-document-reference | fhir-bundle         | note        | 2.0.0   |
| epic-ccda-patient              | epic-ccda           | patient     | 1.0.0   |
| epic-ccda-problem              | epic-ccda           | problem     | 1.0.0   |
| cerner-ccda-patient            | cerner-ccda         | patient     | 1.0.0   |
| cerner-ccda-allergy            | cerner-ccda         | allergy     | 1.0.0   |
| athena-ccda-patient            | athena-ccda         | patient     | 1.0.0   |
| ecw-ccda-patient               | ecw-ccda            | patient     | 1.0.0   |
| practicefusion-ccda-patient    | practicefusion-ccda | patient     | 1.0.0   |
