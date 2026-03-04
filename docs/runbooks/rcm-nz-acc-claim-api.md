# NZ ACC Claim API Runbook

> Phase 46 — NZ Gateway Pack

## Overview

ACC (Accident Compensation Corporation) is New Zealand's universal no-fault
accident compensation scheme. The ACC Claim API v2 provides REST/JSON
access for claim lodgement, status checking, and payment enquiry.

Authentication uses OAuth2 client_credentials flow.

## Prerequisites

| Item                 | Environment Variable      | Required                               |
| -------------------- | ------------------------- | -------------------------------------- |
| OAuth2 client ID     | `ACC_NZ_CLIENT_ID`        | Yes                                    |
| OAuth2 client secret | `ACC_NZ_CLIENT_SECRET`    | Yes                                    |
| ACC provider ID      | `ACC_NZ_PROVIDER_ID`      | Yes                                    |
| API endpoint         | `ACC_NZ_API_ENDPOINT`     | No (defaults to api.acc.co.nz)         |
| Sandbox endpoint     | `ACC_NZ_SANDBOX_ENDPOINT` | No (defaults to sandbox.api.acc.co.nz) |

## Enrollment Steps

### 1. Provider Registration

1. Visit https://www.acc.co.nz/for-providers/
2. Register as treatment provider
3. Receive ACC provider ID
4. Set `ACC_NZ_PROVIDER_ID=NZ-PROV-12345`

### 2. API Access

1. Apply for API access at https://developer.acc.co.nz/
2. Receive OAuth2 client credentials
3. Set:
   ```
   ACC_NZ_CLIENT_ID=<client-id>
   ACC_NZ_CLIENT_SECRET=<client-secret>
   ```

### 3. Sandbox Testing

1. Sandbox endpoint: `https://sandbox.api.acc.co.nz`
2. Use sandbox credentials for integration testing
3. Create test claims using create/park/submit workflow

### 4. Go-Live

1. Verify all readiness checks are green:
   ```bash
   curl http://localhost:3001/rcm/gateways/readiness | jq '.gateways[] | select(.gatewayId=="nz-acc")'
   ```
2. Switch to production endpoint
3. Submit first production claim
4. Monitor OAuth2 token refresh

## Create/Park/Submit Workflow

ACC uses a 3-step claim workflow:

```
1. POST /claims/v2              → Creates draft (status: parked)
2. PUT  /claims/v2/{claimNo}    → Updates/enriches parked claim
3. POST /claims/v2/{claimNo}/submit → Submits for ACC processing
```

This allows building a claim incrementally before final submission.
Parked claims can be updated multiple times before submission.

## Rate Limiting

ACC enforces **50 requests/minute** per client. The connector implements:

- Request counting per minute window
- Exponential backoff on 429 responses
- Maximum 3 retries with base delay 1000ms
- Backoff formula: `baseDelay * 2^(attempt-1)`

## Wire Format

ACC uses **REST/JSON**, NOT X12. Logical mapping:

| Logical | NZ Equivalent               |
| ------- | --------------------------- |
| 837P    | Injury claim lodgement      |
| 276     | Claim status enquiry        |
| 277     | Claim status response       |
| 835     | Payment advice / remittance |

## NHI Numbers

Patients are identified by National Health Index (NHI) number:

- Format: 3 letters + 4 digits (e.g., `ZAA1234`)
- Never store in audit logs or analytics

## Troubleshooting

| Issue                   | Solution                                                   |
| ----------------------- | ---------------------------------------------------------- |
| OAuth2 token expired    | Auto-refresh via client_credentials; check secret validity |
| 429 rate limited        | Backoff and retry; check request volume                    |
| Invalid NHI             | Verify format: 3 letters + 4 digits                        |
| Duplicate claim         | ACC returns existing claim reference                       |
| Provider not registered | Verify provider ID with ACC portal                         |

## References

- ACC for providers: https://www.acc.co.nz/for-providers/
- ACC developer portal: https://developer.acc.co.nz/
- Connector: `apps/api/src/rcm/connectors/acc-nz-connector.ts`
- Gateway readiness: `apps/api/src/rcm/gateways/readiness.ts`
