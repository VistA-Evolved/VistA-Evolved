# Ghana Country Pack

## Overview

Draft pack for Ghana-based VistA-Evolved deployments.

| Field                    | Value              |
| ------------------------ | ------------------ |
| **Country Code**         | GH                 |
| **Regulatory Framework** | DPA 2012 (Act 843) |
| **Consent Granularity**  | All-or-nothing     |
| **Default Region**       | gh-acc (planned)   |
| **Default Locale**       | en                 |
| **Supported Locales**    | en                 |
| **Payer Module**         | None (NHIA direct) |
| **Status**               | Draft (P1)         |

## Regulatory Notes

- Data Protection Act 2012 (Act 843)
- All-or-nothing consent model
- Right to erasure is supported
- Data portability is required
- Cross-border transfer allowed with consent
- Data Protection Commission (DPC) oversight
- gh-acc region is planned -- use local for initial deployments

## Terminology

- Diagnosis: ICD-10-WHO
- Procedure: Passthrough (no standardized national procedure code)
- Lab: Passthrough
- Drug: Passthrough

## Claim Formats

- NHIA Ghana Diagnosis-Related Grouping (G-DRG)
- No X12 or eClaims integration

## Modules Enabled

8 of 13 operational modules. Core clinical + portal + scheduling.
Excluded: telehealth, imaging, fhir, ai, rcm (Phase 1 -- will expand).
