# AU ECLIPSE Enrollment Runbook

> Phase 46 — AU Gateway Pack

## Overview

ECLIPSE (Electronic Claim Lodgement and Information Processing Service
Environment) is operated by Services Australia for Medicare and DVA claiming.
Authentication uses PRODA (Provider Digital Access) with PKI certificates.

## Prerequisites

| Item | Environment Variable | Required |
|------|---------------------|----------|
| PRODA organisation ID | `ECLIPSE_PRODA_ORG_ID` | Yes |
| PRODA device name | `ECLIPSE_DEVICE_NAME` | Yes |
| PKI device certificate | `ECLIPSE_CERT_PATH` | Yes |
| Medicare provider number | `ECLIPSE_PROVIDER_NUMBER` | Yes |
| HPI-I | `ECLIPSE_HPI_I` | Optional |
| API endpoint | `ECLIPSE_API_ENDPOINT` | No (defaults to PRODA) |

## Enrollment Steps

### 1. PRODA Organisation Registration

1. Navigate to https://www.servicesaustralia.gov.au/proda
2. Create individual PRODA account
3. Link to organisation (ABN required)
4. Add devices within organisation portal
5. Record organisation ID

### 2. PKI Device Certificate

1. In PRODA, navigate to Devices section
2. Generate device certificate (CSR-based)
3. Download signed certificate
4. Store securely:
   ```
   ECLIPSE_CERT_PATH=/path/to/proda-device-cert.pem
   ```

### 3. Medicare Provider Number

1. Apply via Services Australia provider registration
2. Format: 7 digits + 1 letter (e.g., `1234567A`)
3. Set `ECLIPSE_PROVIDER_NUMBER=1234567A`

### 4. HPI-I (Optional)

1. Register with Australian Digital Health Agency
2. Obtain Healthcare Provider Identifier - Individual
3. Set `ECLIPSE_HPI_I=<identifier>`

### 5. Testing

1. Use ECLIPSE test environment
2. Submit test claim with MBS item numbers
3. Check gateway readiness:
   ```bash
   curl http://localhost:3001/rcm/gateways/readiness | jq '.gateways[] | select(.gatewayId=="au-eclipse")'
   ```

### 6. Go-Live

1. Verify all readiness checks are green
2. Submit first production Medicare claim
3. Monitor PRODA token refresh cycle

## Wire Format Notes

ECLIPSE uses **AU proprietary format** (HL7v2/XML), NOT X12. The connector
maps logical transaction types to AU-specific claim structures:

| Logical | AU Equivalent |
|---------|--------------|
| 837P | Medicare bulk-bill / patient claim |
| 837I | Hospital claim (DRG-based) |
| 270 | Medicare benefit enquiry |
| 276 | Claim status enquiry |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PRODA token failure | Check org ID + device name; regenerate cert if expired |
| Invalid MBS item | Verify item number against current MBS schedule |
| Provider number mismatch | Ensure provider number matches PRODA org |
| TLS handshake error | Certificate may have been revoked; regenerate via PRODA |

## References

- PRODA portal: https://www.servicesaustralia.gov.au/proda
- ECLIPSE docs: https://www.servicesaustralia.gov.au/eclipse-online-claiming
- Connector: `apps/api/src/rcm/connectors/eclipse-au-connector.ts`
- Gateway readiness: `apps/api/src/rcm/gateways/readiness.ts`
