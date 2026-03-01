# Evidence — Phase 313: Terminology Strategy

## Deliverables

| # | Artifact | Path |
|---|----------|------|
| 1 | Terminology registry | `apps/api/src/services/terminology-registry.ts` |
| 2 | Terminology routes | `apps/api/src/routes/terminology-routes.ts` |

## Resolver Inventory

| Resolver | Domain | Code System | FHIR URI |
|----------|--------|-------------|----------|
| ICD10CMResolver | diagnosis | ICD-10-CM | http://hl7.org/fhir/sid/icd-10-cm |
| ICD10WHOResolver | diagnosis | ICD-10-WHO | http://hl7.org/fhir/sid/icd-10 |
| CPTResolver | procedure | CPT | http://www.ama-assn.org/go/cpt |
| LOINCResolver | lab | LOINC | http://loinc.org |
| NDCResolver | drug | NDC | http://hl7.org/fhir/sid/ndc |
| PassthroughResolver | any | passthrough | urn:vista:file:N |

## Verification

All 10 gates PASS.
