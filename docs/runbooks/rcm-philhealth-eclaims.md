# PhilHealth eClaims Integration Guide

> Phase 38 — RCM + Payer Connectivity (Philippines Market)

## Overview

PhilHealth (Philippine Health Insurance Corporation) is the national
universal health insurer. All accredited healthcare facilities submit
claims through the PhilHealth eClaims system.

## PhilHealth Claim Forms

| Form | Purpose | Mapping |
|------|---------|---------|
| CF1 | Member/patient data | `Claim.subscriber` fields |
| CF2 | Diagnosis + procedures | `Claim.diagnosisCodes` + `serviceLines` |
| CF3 | Hospital charges (institutional) | `Claim.serviceLines` with revenue codes |
| CF4 | Professional fees | Rendering provider fee lines |

## Integration Architecture

```
VistA Claim → RCM Gateway → PhilHealth Connector → eClaims REST API
                                                    ↓
                                      Status polling / Remittance
```

The PhilHealth connector (`philhealth-connector.ts`) implements the
`RcmConnector` interface and handles:

1. **Member eligibility** — PIN validation via eClaims member API
2. **Claim submission** — CF1-CF4 transformation and POST to eClaims
3. **Status tracking** — Polling claim reference numbers
4. **Remittance** — Payment notification processing

## Configuration

```env
PHILHEALTH_API_ENDPOINT=https://eclaims.philhealth.gov.ph/api/v1
PHILHEALTH_FACILITY_CODE=<your-facility-code>
PHILHEALTH_API_TOKEN=<your-api-token>
PHILHEALTH_TEST_MODE=true
```

## Payer Seed Data

The Philippines payer seed (`data/payers/ph_hmos.json`) includes:

| Payer ID | Name | Mode |
|----------|------|------|
| PH-PHIC | PhilHealth | `government_portal` |
| PH-MAXICARE | Maxicare Healthcare | `portal_batch` |
| PH-INTELLICARE | Intellicare | `portal_batch` |
| PH-MEDICARD | Medicard Philippines | `portal_batch` |
| PH-PHILAM-CARE | PhilamCare (AIA) | `portal_batch` |
| PH-VALUCARE | ValuCare | `portal_batch` |
| PH-ASIANLIFE | Asian Life | `portal_batch` |
| PH-CARITAS | Caritas Health Shield | `portal_batch` |
| PH-INSULAR | Insular Health Care | `portal_batch` |
| PH-LACSON-LACSON | Lacson & Lacson | `portal_batch` |
| PH-PACIFIC-CROSS | Pacific Cross | `portal_batch` |
| PH-COCOLIFE | Cocolife Healthcare | `portal_batch` |
| PH-ETIQA | Etiqa Philippines | `portal_batch` |
| PH-KAISER-INTL | Kaiser International | `portal_batch` |
| PH-FORTUNE-MEDICARE | Fortune Medicare | `portal_batch` |

## PhilHealth-Specific Workflow

1. **Accreditation** — Facility must be PhilHealth-accredited (one-time)
2. **Member Check** — Verify PhilHealth membership + PIN before claim
3. **Claim Preparation** — Generate CF1-CF4 from VistA clinical data
4. **Submission** — POST to eClaims API (or batch upload)
5. **Tracking** — Poll for claim status using reference number
6. **Payment** — Remittance via PhilHealth payment schedule

## HMO Claims (Non-PhilHealth)

Philippine HMOs use `portal_batch` Integration mode. Claims are:
1. Generated in batch format (CSV/XML per HMO spec)
2. Queued in the Portal/Batch Connector
3. Uploaded manually or via RPA to each HMO's provider portal

The portal-batch connector tracks upload status and can be marked
as confirmed after portal acknowledgment.

## Future Enhancements

- [ ] Direct PhilHealth eClaims API integration (REST)
- [ ] CF1-CF4 auto-generation from VistA encounter data
- [ ] HMO portal RPA automation (Maxicare, Intellicare)
- [ ] PhilHealth ICD-10/RVS code mapping
- [ ] PhilHealth case rate package auto-detection
