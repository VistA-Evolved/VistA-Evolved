# SG NPHC Access Runbook

> Phase 46 — SG Gateway Pack

## Overview

NPHC (National Programme for Healthcare Claims) is Singapore's national
healthcare claims gateway managed by MOH. It handles MediShield Life and
MediSave claims for all licensed healthcare institutions.

Authentication uses SingPass CorpPass with named-user authorization.

## Prerequisites

| Item                      | Environment Variable      | Required                         |
| ------------------------- | ------------------------- | -------------------------------- |
| CorpPass client ID        | `NPHC_CORPPASS_CLIENT_ID` | Yes                              |
| CorpPass client secret    | `NPHC_CORPPASS_SECRET`    | Yes                              |
| MOH facility license      | `NPHC_FACILITY_LICENSE`   | Yes                              |
| Authorized user NRIC hash | `NPHC_USER_NRIC_HASH`     | Optional                         |
| API endpoint              | `NPHC_API_ENDPOINT`       | No (defaults to api.nphc.gov.sg) |

## Enrollment Steps

### 1. CorpPass Registration

1. Navigate to https://www.corppass.gov.sg/
2. Register organisation with UEN
3. Assign CorpPass administrator
4. Request NPHC API access scope
5. Record client ID and secret

### 2. MOH Facility License

1. Apply at https://www.moh.gov.sg/ for healthcare institution license
2. Format: `HCI-LIC-#####`
3. Set `NPHC_FACILITY_LICENSE=HCI-LIC-12345`

### 3. Named-User Authorization (Recommended)

CorpPass supports role-based access tied to individual NRIC. This ensures
audit traceability at the user level.

1. Map authorized users in CorpPass admin portal
2. Hash NRIC for local storage (do not store plaintext NRIC)
3. Set `NPHC_USER_NRIC_HASH=<sha256-of-nric>`

### 4. Testing

1. Use CorpPass sandbox environment
2. Submit test MediSave claim
3. Check gateway readiness:
   ```bash
   curl http://localhost:3001/rcm/gateways/readiness | jq '.gateways[] | select(.gatewayId=="sg-nphc")'
   ```

### 5. Go-Live

1. Verify all readiness checks are green
2. Switch from CorpPass sandbox to production
3. Submit first production claim
4. Monitor CorpPass token refresh

## Claim Types

| Type            | Description                      |
| --------------- | -------------------------------- |
| MEDISAVE        | MediSave account claims          |
| MEDISHIELD_LIFE | MediShield Life insurance claims |
| CHAS            | Community Health Assist Scheme   |

## Wire Format

NPHC uses **REST/JSON** with MOH-specific schema, NOT X12. Logical mapping:

| Logical | SG Equivalent                        |
| ------- | ------------------------------------ |
| 837P    | MediSave/CHAS outpatient claim       |
| 837I    | MediShield Life inpatient claim      |
| 270     | MediSave balance / eligibility check |

## Troubleshooting

| Issue                      | Solution                                        |
| -------------------------- | ----------------------------------------------- |
| CorpPass token expired     | Check token refresh; re-authorize if revoked    |
| Facility license not found | Verify license number with MOH portal           |
| 403 role mismatch          | Check CorpPass user-role mapping for NPHC scope |
| MediSave insufficient      | Claim may be partially approved or denied       |

## References

- CorpPass: https://www.corppass.gov.sg/
- MOH Singapore: https://www.moh.gov.sg/
- Connector: `apps/api/src/rcm/connectors/nphc-sg-connector.ts`
- Gateway readiness: `apps/api/src/rcm/gateways/readiness.ts`
