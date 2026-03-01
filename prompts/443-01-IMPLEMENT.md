# Phase 443 — IMPLEMENT: Country-Specific Validation (W28 P5)

## Goal
Per-country validation rules for clinical/billing/demographic data.
Three built-in validators (US/PH/GH) with extensible registry.

## Files Created
- `apps/api/src/regulatory/country-validation.ts` — Country validator engine

## Files Modified
- `apps/api/src/regulatory/index.ts` — Re-exported validation types + functions

## Key Decisions
- 8 validation domains: demographics, diagnosis, procedure, medication, billing, consent, identifier, encounter
- US: ICD-10-CM, CPT, NDC, NPI, SSN format checks
- PH: ICD-10-WHO, PhilHealth PIN, PHIC facility code, DPA consent requirement
- GH: ICD-10-WHO, NHIA membership, G-DRG for inpatient, Ghana Card format
- Extensible via registerCountryValidator() for new markets
- validateAllDomains() runs all applicable domain validators for a country
