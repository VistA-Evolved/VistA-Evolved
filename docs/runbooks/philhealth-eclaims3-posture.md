# PhilHealth eClaims 3.0 Posture -- Runbook

> **Phase 90 -- NOT CERTIFIED**
>
> This module generates eClaims 3.0-structured export packages for
> review and facility readiness assessment. It does NOT submit claims
> to PhilHealth. Facility certification with PhilHealth is required
> before real submission can occur.
>
> **eClaims 3.0 Deadline: April 1, 2026**
>
> - Admissions on or after April 1, 2026: electronic SOA mandatory
> - Scanned PDF SOA: REJECTED for admissions >= April 2026
> - TCN (Transmittal Control Number): issued after successful upload
>   to PhilHealth eClaims portal (not available in this posture module)

---

## 1. What This Module Does

| Capability                                             | Status        |
| ------------------------------------------------------ | ------------- |
| Claim draft CRUD (create/read/update/list)             | Live          |
| eClaims 3.0 validation engine (CF1-CF4 + eSOA rules)   | Live          |
| Export pipeline (manifest + claim bundle + eSOA JSON)  | Live          |
| Test upload simulator (simulated TCN, SIMULATED label) | Live          |
| Facility setup + readiness checklist                   | Live          |
| Provider accreditation tracking                        | Live          |
| Real PhilHealth API submission                         | NOT AVAILABLE |
| Real TCN acquisition                                   | NOT AVAILABLE |
| PhilHealth eClaims 3.0 certification                   | NOT AVAILABLE |

## 2. Architecture

```
apps/api/src/rcm/payerOps/
  philhealth-types.ts       -- Domain types (claim draft, SOA, manifest, facility)
  philhealth-store.ts       -- In-memory store + export pipeline + test upload sim
  philhealth-validator.ts   -- Validation engine (eSOA rules, PIN format, CF1-CF4)
  philhealth-routes.ts      -- REST endpoints (CRUD + validate + export + test-upload)

apps/web/src/app/cprs/admin/
  philhealth-setup/page.tsx   -- Facility setup + readiness checklist UI
  philhealth-claims/page.tsx  -- Claim draft management + validation + export UI
```

### Data Flow

```
Create Draft (POST /rcm/philhealth/claims)
  -> In-memory store
  -> Validate (POST /rcm/philhealth/claims/:id/validate)
     -> Returns errors/warnings + eClaims 3.0 compliance check
  -> Mark Ready (PUT /rcm/philhealth/claims/:id/status {status: "ready_for_submission"})
  -> Export (POST /rcm/philhealth/claims/:id/export)
     -> Generates: manifest.json + claim-bundle.json + soa-electronic.json
     -> Auto-transitions to "exported"
  -> Test Upload (POST /rcm/philhealth/claims/:id/test-upload)
     -> Simulated only -- returns SIMULATED-TCN-XXXX
     -> Auto-transitions to "test_uploaded"
  -> STOP: Cannot advance beyond test_uploaded without real integration
```

## 3. API Endpoints

| Method | Path                                      | Description                                                |
| ------ | ----------------------------------------- | ---------------------------------------------------------- |
| GET    | `/rcm/philhealth/stats`                   | Subsystem stats                                            |
| POST   | `/rcm/philhealth/claims`                  | Create claim draft                                         |
| GET    | `/rcm/philhealth/claims`                  | List claim drafts (filter: facilityId, patientDfn, status) |
| GET    | `/rcm/philhealth/claims/:id`              | Get claim detail                                           |
| PATCH  | `/rcm/philhealth/claims/:id`              | Patch draft fields                                         |
| PUT    | `/rcm/philhealth/claims/:id/status`       | Transition status                                          |
| POST   | `/rcm/philhealth/claims/:id/validate`     | Validate against eClaims 3.0 rules                         |
| POST   | `/rcm/philhealth/claims/:id/export`       | Generate export package                                    |
| POST   | `/rcm/philhealth/claims/:id/test-upload`  | Simulated test upload                                      |
| GET    | `/rcm/philhealth/setup`                   | Get facility setup                                         |
| PATCH  | `/rcm/philhealth/setup`                   | Update facility setup                                      |
| POST   | `/rcm/philhealth/setup/providers`         | Add provider accreditation                                 |
| DELETE | `/rcm/philhealth/setup/providers/:prc`    | Remove provider accreditation                              |
| PUT    | `/rcm/philhealth/setup/readiness/:itemId` | Toggle readiness checklist item                            |

## 4. Claim Status FSM

```
draft -> ready_for_submission -> exported -> test_uploaded
                                                  |
       (REQUIRES REAL INTEGRATION)                v
                                          submitted_pending
                                           /     |     \
                              returned_to_hospital  paid  denied
                                      |                     |
                                      v                     v
                                    draft                 draft
```

Statuses requiring real integration (`submitted_pending`, `returned_to_hospital`, `paid`, `denied`) are **blocked** unless:

- `PHILHEALTH_API_TOKEN` is set
- `PHILHEALTH_TEST_MODE=false`

## 5. Validation Rules

### Required Fields (errors block ready_for_submission)

- Patient: lastName, firstName, philhealthPin, admissionDate, patientType, memberRelationship
- Clinical: at least one PRIMARY diagnosis (ICD-10)
- Charges: description non-empty, quantity > 0, netAmount >= 0
- Professional fees (if present): physicianName, physicianLicense, feeAmount > 0

### eClaims 3.0 Compliance

- **Admission >= April 1, 2026**: electronic SOA is REQUIRED
- **Scanned PDF detected**: ERROR (rejected for >= April 2026), WARNING (deprecated for earlier)
- **PhilHealth PIN format**: XX-XXXXXXXXX-X (12+ digits)

### Warnings (do not block submission)

- Missing DOB, sex, discharge date (inpatient), professional fees (inpatient)

## 6. Facility Setup

### Readiness Checklist (8 items)

1. Facility Accreditation -- PhilHealth facility accreditation number current
2. Provider Accreditations -- At least one provider with valid PhilHealth accreditation
3. eClaims 3.0 API Access -- Registered for eClaims 3.0 API access
4. TLS Client Certificate -- Enrolled with PhilHealth PKI
5. SOA Signing Key -- HMAC-SHA256 or RSA signing key configured
6. Test Claim Submitted -- At least one test claim exported and validated locally
7. Test Upload Verified -- Test upload to PhilHealth sandbox returns valid TCN
8. Staff Training -- Billing staff trained on eClaims 3.0 workflow

## 7. Environment Variables

| Variable                      | Default      | Description                                                  |
| ----------------------------- | ------------ | ------------------------------------------------------------ |
| `PHILHEALTH_FACILITY_CODE`    | `DEFAULT`    | Default facility ID for single-tenant                        |
| `PHILHEALTH_SOA_SIGNING_KEY`  | (none)       | HMAC-SHA256 key for SOA signing                              |
| `PHILHEALTH_API_TOKEN`        | (none)       | Real PhilHealth API token (blocks real submission if absent) |
| `PHILHEALTH_TEST_MODE`        | `true`       | Must be `false` for real submission                          |
| `PHILHEALTH_ESOA_CUTOFF_DATE` | `2026-04-01` | eSOA cutoff (configurable for testing)                       |

## 8. Security

- All routes under `/rcm/` prefix -- covered by existing session auth catch-all
- All mutations wired to `appendRcmAudit` (hash-chained, PHI-sanitized)
- Patient DFN never stored in audit trail (sanitized to `[DFN]`)
- No PHI in log output
- No real PhilHealth credentials in codebase

## 9. Migration Path

Current: in-memory Map store (resets on API restart).

1. **Phase N+1**: VistA IB file-backed (when IB/AR data available)
2. **Phase N+2**: PostgreSQL persistence (when SaaS multi-tenant needed)
3. **Phase N+3**: Real PhilHealth API integration (after facility certification)

## 10. Troubleshooting

| Symptom                                | Cause                                       | Fix                                                   |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Cannot transition to submitted_pending | Real integration not configured             | Set PHILHEALTH_API_TOKEN + PHILHEALTH_TEST_MODE=false |
| Scanned PDF error on validation        | Admission >= April 2026 with PDF attachment | Remove PDF attachment, use electronic SOA             |
| PIN format error                       | PhilHealth PIN not in XX-XXXXXXXXX-X format | Use 12+ digit format with dashes                      |
| Export fails                           | Claim not in ready_for_submission status    | Transition to ready_for_submission first              |
| Test upload fails                      | Claim not in exported status                | Export the claim first                                |
