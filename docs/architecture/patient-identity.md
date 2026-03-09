# Patient Identity Model

## Overview

VistA Evolved supports independent patient portal access with secure identity
linking between portal accounts and VistA patient records (DFN).

## Identity Architecture

```
Portal User (OIDC sub / portal account)
    |
    v
portal_patient_identity (PG table, migration v19)
    |--- tenant_id
    |--- oidc_sub (unique per tenant)
    |--- patient_dfn
    |--- verified_at
    |
    v
VistA Patient Record (DFN in File 2)
```

## Identity Model

| Property | Description |
| -------- | ----------- |
| **Per-tenant** | Patient identity is scoped to a single tenant |
| **Staff-verified** | All links require staff approval |
| **OIDC-ready** | Uses `oidc_sub` as the primary identifier |
| **Relationship-typed** | self, parent, guardian, spouse, caregiver, legal_representative, power_of_attorney |
| **Audited** | Every link/unlink is recorded in the immutable audit trail |
| **PHI-safe** | Verification data (SSN, DOB) hashed/cleared after verification |

## Link Request Workflow

1. **Patient initiates**: `POST /portal/identity/request-link`
   - Provides DFN, relationship, DOB/last4SSN for verification
   - Creates a pending request with 7-day TTL

2. **Staff reviews**: `GET /admin/identity/requests`
   - Views pending requests with patient demographics from VistA
   - VistA RPCs: `ORWPT SELECT`, `ORWPT ID INFO` for verification

3. **Staff approves**: `POST /admin/identity/request/:id/verify`
   - Creates verified link in `portal_patient_identity` (PG)
   - Clears verification data
   - Audit trail records approval

4. **Staff rejects**: `POST /admin/identity/request/:id/reject`
   - Records rejection reason
   - Clears verification data

## Record Access Rules

Once linked, a patient can access:
- Demographics (read-only)
- Allergies (read-only)
- Vitals (read-only)
- Medications (read-only)
- Lab results (read-only)
- Appointment history (read-only)
- Messaging (read/write to linked providers)

Access is enforced by:
- Session authentication (portal session cookie)
- Identity link verification (portal_patient_identity lookup)
- Tenant isolation (RLS on PG tables)
- Audit logging (every access recorded)

## Cross-Facility Continuity

Current model: **Siloed per tenant**. Each tenant has its own identity space.

Future option: Cross-tenant identity linking requires:
1. Global patient master index
2. Consent management per organization
3. Record sharing agreements between tenants
4. Audit trail for cross-tenant access

This is not implemented and requires explicit design decisions.

## PG Tables

### portal_patient_identity (v19)
```sql
CREATE TABLE portal_patient_identity (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  oidc_sub TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  display_name TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_ppi_sub ON portal_patient_identity(tenant_id, oidc_sub);
```

### tenant_oidc_mapping (v20)
```sql
CREATE TABLE tenant_oidc_mapping (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  audience TEXT,
  claim_mapping_json TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## API Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | /portal/identity/request-link | session | Patient requests identity link |
| GET | /portal/identity/my-links | session | Patient views their links |
| POST | /portal/identity/revoke/:id | session | Patient revokes a link |
| GET | /admin/identity/requests | admin | Staff views pending requests |
| POST | /admin/identity/request/:id/verify | admin | Staff approves link |
| POST | /admin/identity/request/:id/reject | admin | Staff rejects link |
