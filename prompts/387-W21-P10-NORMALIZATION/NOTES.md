# Phase 387 — W21-P10 LOINC/UCUM Normalization — NOTES

## Design Decisions

- Static mapping tables (no external terminology server) for determinism.
- Two-tier LOINC lookup: exact system|code match first, then wildcard \*|CODE.
- UCUM lookup is case-insensitive on source unit string.
- Temperature F→C conversion is the only non-trivial unit conversion.
- No store-policy entries needed — mapping tables are static constants, not stores.
- QA validation endpoint compares a batch of observations against the mapping
  tables and returns per-observation warnings for unmapped codes/units.

## Coverage

- Vitals domain: 13 MDC codes (SpO2, HR, ECG HR, NIBP sys/dia/mean, ABP,
  temp, resp rate, EtCO2)
- Lab domain: 24 analyte codes across 5 categories (chemistry 9, blood gas 5,
  hematology 5, coagulation 3, POCT 2)
- Unit domain: 30 unit mappings covering standard and non-standard representations

## Future Extensions

- Add vendor-specific code mappings (Siemens, Roche, Abbott)
- Add SNOMED CT mapping for observation interpretation
- Connect to VistA Lab (63/63.04) for order-result linkage
