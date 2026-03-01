# Phase 443 — VERIFY: Country-Specific Validation (W28 P5)

## Gates
1. `country-validation.ts` exists in `apps/api/src/regulatory/`
2. 3 built-in validators registered: US, PH, GH
3. US validator covers: diagnosis (ICD-10-CM), procedure (CPT), medication (NDC), billing (NPI), identifier (SSN)
4. PH validator covers: diagnosis (ICD-10-WHO), billing (PhilHealth PIN), consent (DPA)
5. GH validator covers: diagnosis (ICD-10-WHO), billing (NHIA), identifier (Ghana Card)
6. Barrel re-export from regulatory/index.ts
7. QA lint: 0 FAIL
