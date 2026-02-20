# PhilHealth Electronic SOA Guide

> Phase 46 — PH Gateway Pack

## Overview

eClaims 3.0 requires **electronic Statement of Account (SOA)** for all claims.
Scanned PDF SOAs are permanently rejected. The SOA generator in
`apps/api/src/rcm/gateways/soa-generator.ts` produces structured JSON SOA
artifacts from canonical claim data.

## Architecture

```
Claim Data → validateSoaInput() → generateElectronicSoa() → ElectronicSoa JSON
                                         ↓
                              HMAC-SHA256 signing (optional)
                                         ↓
                              Attach to CF1-CF4 bundle
                                         ↓
                              Submit via PhilHealth connector
```

## Key Rules

1. **No scanned PDFs** — `isScannedPdf()` detects %PDF magic bytes and
   base64-encoded PDFs. Any attempt to submit scanned SOA returns error
   code `PH-SOA-FORMAT-INVALID`.

2. **Digital signatures** — SOAs are signed with HMAC-SHA256 using
   `PHILHEALTH_SOA_SIGNING_KEY`. Verification via `verifySoaSignature()`.

3. **Encryption at rest** — SOA artifacts containing financial totals
   must be stored encrypted. The signing key must not be in version control.

4. **One SOA per claim** — Each claim submission includes exactly one
   electronic SOA tied to the claim's accession number.

## SOA Line Items

Each SOA consists of line items with:

| Field | Type | Description |
|-------|------|-------------|
| description | string | Service/item description |
| cptCode | string? | CPT procedure code |
| quantity | number | Number of units |
| unitCharge | number | Charge per unit (PHP) |
| discount | number | Discount amount (PHP) |
| netAmount | number | Net amount after discount |
| phicCoverage | number | PhilHealth coverage amount |
| patientShare | number | Patient out-of-pocket |

## Totals

The SOA generator automatically computes:
- Total charges (sum of unitCharge * quantity)
- Total discount
- Total net amount
- Total PHIC coverage
- Total patient share

All totals are rounded to 2 decimal places.

## Signature Verification

```typescript
import { verifySoaSignature } from '../rcm/gateways/soa-generator.js';

const valid = verifySoaSignature(soa, signingKey);
// true if signature matches, false otherwise
```

Uses constant-time comparison to prevent timing attacks.

## API Usage

```
GET /rcm/gateways/readiness
```

The PhilHealth gateway readiness check includes SOA signing capability status.

## References

- SOA generator: `apps/api/src/rcm/gateways/soa-generator.ts`
- PhilHealth connector: `apps/api/src/rcm/connectors/philhealth-connector.ts`
- Conformance: `apps/api/src/rcm/conformance/gateway-conformance.ts`
