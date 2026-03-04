# Phase 169 — Patient Identity Linking

## Overview

Secure identity verification and linking system connecting OIDC/portal
user accounts to VistA patient records (DFN) with staff-approval workflow.

## Architecture

```
Patient Request → Link Request (pending) → Staff Review → Verify/Reject
                                              ↓
                                    VistA ORWPT ID INFO
                                    (demographics check)
                                              ↓
                                    Identity Link (active)
```

## Endpoints

| Method | Path                                 | Auth    | Description                             |
| ------ | ------------------------------------ | ------- | --------------------------------------- |
| POST   | `/portal/identity/request-link`      | session | Patient requests identity link          |
| GET    | `/portal/identity/my-links`          | session | Patient views their links               |
| DELETE | `/portal/identity/link/:id`          | session | Revoke a link                           |
| GET    | `/admin/identity/pending-requests`   | admin   | Staff views pending requests            |
| GET    | `/admin/identity/request/:id`        | admin   | Staff views request detail + VistA demo |
| POST   | `/admin/identity/request/:id/verify` | admin   | Staff approves link                     |
| POST   | `/admin/identity/request/:id/reject` | admin   | Staff rejects link                      |
| GET    | `/admin/identity/links`              | admin   | Staff views all links                   |

## VistA Grounding

| RPC           | Purpose                                   | Status     |
| ------------- | ----------------------------------------- | ---------- |
| ORWPT ID INFO | Fetch demographics for staff verification | Active     |
| ORWPT SELECT  | Patient lookup by name                    | Referenced |

## Identity Verification Flow

1. Patient submits link request with:
   - `patientDfn` — target patient record
   - `relationship` — self/parent/guardian/spouse/caregiver/legal_rep/POA
   - Optional: `dateOfBirth`, `last4Ssn` (hashed immediately), `fullName`

2. Staff reviews request via admin endpoints:
   - Views requester info + verification data
   - Fetches VistA patient demographics (ORWPT ID INFO)
   - Compares DOB, name, last-4 SSN against VistA data

3. Staff verifies or rejects:
   - Verify → creates IdentityLink, clears verification data
   - Reject → records reason, clears verification data

4. Link is active until revoked by patient or admin.

## PHI Safeguards

- SSN last-4 is hashed immediately on receipt (SHA-256 truncated 16 chars)
- Verification data (DOB, name, SSN hash) is cleared after verify/reject
- Audit entries contain only hashed identifiers, never raw PHI
- Patient DFN exposed only to authenticated staff via admin endpoints

## Data Stores

| Store           | Type                               | Classification |
| --------------- | ---------------------------------- | -------------- |
| `linkRequests`  | `Map<string, IdentityLinkRequest>` | critical       |
| `identityLinks` | `Map<string, IdentityLink>`        | critical       |

Both stores reset on API restart. Integration-pending:

- PG table `portal_patient_identity` (migration v19) for durable links
- OIDC sub mapping when OIDC login flow is active

## Migration Path

```
In-memory Map → PG portal_patient_identity table
Verification data → never persisted (ephemeral)
OIDC sub → portal_patient_identity.oidc_sub column
DFN → portal_patient_identity.patient_dfn column
```

## Testing

```powershell
# Login
$r = Invoke-WebRequest -Uri http://127.0.0.1:3001/auth/login -Method POST `
  -ContentType "application/json" `
  -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' `
  -SessionVariable s -UseBasicParsing

# Request a link
Invoke-WebRequest -Uri http://127.0.0.1:3001/portal/identity/request-link `
  -Method POST -ContentType "application/json" `
  -Body '{"patientDfn":"3","relationship":"self","fullName":"PATIENT,TEST"}' `
  -WebSession $s -UseBasicParsing

# View pending (admin)
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/identity/pending-requests `
  -WebSession $s -UseBasicParsing

# Approve (get request ID from above)
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/identity/request/<ID>/verify `
  -Method POST -WebSession $s -UseBasicParsing

# View my links
Invoke-WebRequest -Uri http://127.0.0.1:3001/portal/identity/my-links `
  -WebSession $s -UseBasicParsing
```

## Gauntlet Gate

G26 checks: route file, types, VistA grounding, PHI safeguards,
staff workflow, immutable audit, store policy, runbook, index.ts wiring.
