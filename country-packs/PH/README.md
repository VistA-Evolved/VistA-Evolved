# Philippines Country Pack

## Overview

Active production pack for Philippine-based VistA-Evolved deployments.

| Field                    | Value                                |
| ------------------------ | ------------------------------------ |
| **Country Code**         | PH                                   |
| **Regulatory Framework** | DPA 2012 (R.A. 10173)                |
| **Consent Granularity**  | All-or-nothing                       |
| **Default Region**       | ph-mnl                               |
| **Default Locale**       | fil                                  |
| **Supported Locales**    | fil, en                              |
| **Payer Module**         | ph_hmos (15 payers incl. PhilHealth) |
| **Status**               | Active (P0)                          |

## Regulatory Notes

- Data Privacy Act of 2012 (Republic Act No. 10173)
- All-or-nothing consent model -- patient grants or denies all categories
- Right to erasure is supported
- Data portability is required
- Cross-border transfer allowed with explicit patient consent
- Minimum 5-year retention, maximum 10-year retention
- National Privacy Commission (NPC) oversight

## Terminology

- Diagnosis: ICD-10-WHO (World Health Organization version)
- Procedure: CPT (borrowed from US standard)
- Lab: LOINC
- Drug: Passthrough (no standardized national drug code)

## Claim Formats

- PhilHealth eClaims: CF1 (Facility), CF2 (Claim), CF3 (Professional Fees), CF4 (Medicines/Supplies)
- HMO claims: Portal batch upload per payer

## Modules Enabled

10 of 13 operational modules. Excluded: imaging (infrastructure not yet deployed), fhir (not required by PH regulation), ai (opt-in only), migration.
