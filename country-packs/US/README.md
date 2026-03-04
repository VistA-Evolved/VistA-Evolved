# United States Country Pack

## Overview

Active production pack for US-based VistA-Evolved deployments.

| Field                    | Value               |
| ------------------------ | ------------------- |
| **Country Code**         | US                  |
| **Regulatory Framework** | HIPAA               |
| **Consent Granularity**  | Category-level      |
| **Default Region**       | us-east             |
| **Default Locale**       | en                  |
| **Supported Locales**    | en, es              |
| **Payer Module**         | us_core (12 payers) |
| **Status**               | Active (P0)         |

## Regulatory Notes

- HIPAA requires minimum 6-year medical record retention
- Consent is category-level (treatment, payment, operations may be auto-granted)
- Break-glass access is permitted for emergencies
- No right-to-erasure requirement
- No cross-border data transfer (all data stays in US regions)

## Terminology

- Diagnosis: ICD-10-CM (US Clinical Modification)
- Procedure: CPT (Current Procedural Terminology)
- Lab: LOINC
- Drug: NDC (National Drug Code)

## Claim Formats

- Professional: X12-837P (5010)
- Institutional: X12-837I (5010)
- Remittance: X12-835

## Modules Enabled

All 13 operational modules enabled (kernel always active).
