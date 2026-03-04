# PhilHealth eClaims 3.0 Enrollment Runbook

> Phase 46 — PH Gateway Pack

## Overview

PhilHealth eClaims 3.0 is mandatory for all Philippine healthcare facilities
from **April 1, 2026**. eClaims 2.5 and earlier versions will be disabled on
March 31, 2026.

Key changes from eClaims 2.x:

- **Electronic SOA only** — scanned PDF SOAs are rejected
- **TLS client certificates** required for API authentication
- **API endpoint migration** to `/api/v3`
- **Digital signatures** on all claim submissions

## Prerequisites

| Item                        | Environment Variable         | Required              |
| --------------------------- | ---------------------------- | --------------------- |
| Facility accreditation code | `PHILHEALTH_FACILITY_CODE`   | Yes                   |
| eClaims 3.0 API token       | `PHILHEALTH_API_TOKEN`       | Yes                   |
| TLS client certificate      | `PHILHEALTH_CERT_PATH`       | Yes                   |
| TLS private key             | `PHILHEALTH_CERT_KEY_PATH`   | Yes                   |
| SOA signing key             | `PHILHEALTH_SOA_SIGNING_KEY` | Recommended           |
| API endpoint                | `PHILHEALTH_API_ENDPOINT`    | No (defaults to v3)   |
| Test mode                   | `PHILHEALTH_TEST_MODE`       | No (defaults to true) |

## Enrollment Steps

### 1. Facility Accreditation

1. Visit https://www.philhealth.gov.ph/partners/providers/
2. Complete facility accreditation application
3. Receive facility code (format: `H########`)
4. Set `PHILHEALTH_FACILITY_CODE=H01028007` in `.env.local`

### 2. eClaims 3.0 API Credentials

1. Contact PhilHealth IT department for eClaims 3.0 API access
2. Complete API usage agreement
3. Receive API token
4. Set `PHILHEALTH_API_TOKEN=<token>` in `.env.local`

### 3. TLS Client Certificate

1. Generate CSR via PhilHealth eClaims 3.0 portal
2. Submit CSR to PhilHealth PKI authority
3. Download signed certificate
4. Store securely:
   ```
   PHILHEALTH_CERT_PATH=/path/to/facility-cert.pem
   PHILHEALTH_CERT_KEY_PATH=/path/to/facility-key.pem
   ```
5. Ensure private key is encrypted at rest

### 4. Electronic SOA Configuration

1. Set up SOA signing key:
   ```
   PHILHEALTH_SOA_SIGNING_KEY=<facility-signing-secret>
   ```
2. Verify SOA generation:
   ```bash
   curl http://localhost:3001/rcm/gateways/readiness | jq '.gateways[] | select(.gatewayId=="ph-philhealth")'
   ```
3. Scanned PDF SOAs are **permanently rejected** by the connector

### 5. Testing

1. Ensure `PHILHEALTH_TEST_MODE=true` (default)
2. Submit test claim via `/rcm/claims` endpoint
3. Verify electronic SOA is generated (not scanned PDF)
4. Check gateway readiness: `GET /rcm/gateways/readiness`
5. All checks should be green before go-live

### 6. Go-Live

1. Set `PHILHEALTH_TEST_MODE=false`
2. Verify all readiness checks pass
3. Submit first production claim
4. Monitor via `/rcm/connectors/philhealth-eclaims/health`

## Deadlines

| Date       | Event                                    |
| ---------- | ---------------------------------------- |
| 2026-03-31 | eClaims 2.5 and earlier DISABLED         |
| 2026-04-01 | eClaims 3.0 REQUIRED for all submissions |

## Troubleshooting

| Issue                 | Solution                                           |
| --------------------- | -------------------------------------------------- |
| SOA_FORMAT_INVALID    | Use electronic SOA generator, not scanned PDFs     |
| TLS handshake failure | Check cert path/key pair; regenerate if expired    |
| 403 Forbidden         | Verify facility code is active and API token valid |
| 429 Too Many Requests | Implement backoff; check rate limit headers        |

## References

- PhilHealth eClaims portal: https://eclaims3.philhealth.gov.ph/
- Provider registration: https://www.philhealth.gov.ph/partners/providers/
- Connector code: `apps/api/src/rcm/connectors/philhealth-connector.ts`
- SOA generator: `apps/api/src/rcm/gateways/soa-generator.ts`
- Gateway readiness: `apps/api/src/rcm/gateways/readiness.ts`
