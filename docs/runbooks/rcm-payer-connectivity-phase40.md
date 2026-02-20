# Phase 40 -- Payer Connectivity Platform Runbook

## Overview

Phase 40 adds submission safety, X12 wire-format serialization, PhilHealth eClaims bundle generation, CSV payer import, export artifacts, and authorization validation rules to the RCM subsystem built in Phase 38.

## Key Principle: CLAIM_SUBMISSION_ENABLED=false by default

**No claim is ever submitted to a real payer unless explicitly enabled.** The default behavior is export-only mode, where claims are serialized to X12 wire format and written to `data/rcm-exports/` as review artifacts.

To enable live submission:
```bash
CLAIM_SUBMISSION_ENABLED=true
```

## New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/submission-safety` | Returns current submission safety status |
| POST | `/rcm/claims/:id/export` | Export claim as X12 artifact (always works) |
| PATCH | `/rcm/payers/:id` | Partial update a payer record |
| POST | `/rcm/payers/import` | Import payers from CSV text |

## Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/rcm/claims/:id/submit` | Now safety-gated. If CLAIM_SUBMISSION_ENABLED=false, exports artifact and transitions to `ready_to_submit` instead of submitting |

## New Claim States

- `ready_to_submit` -- Claim validated and exported but not submitted (export-only mode)
- Valid transitions: `ready_to_submit` -> `submitted`, `validated`, `draft`, `closed`

## New Claim Fields

- `isDemo: boolean` -- True for sandbox/demo claims. Demo claims are permanently blocked from live submission.
- `submissionSafetyMode: 'live' | 'export_only'` -- Resolved at claim creation time from CLAIM_SUBMISSION_ENABLED env var.
- `exportArtifactPath?: string` -- Path to the exported X12 bundle file.

## X12 Serializer

The scaffold serializer (`x12-serializer.ts`) generates structurally correct X12 5010 wire format:
- `serialize837(claim, options)` -- Generates 837P or 837I with ISA/GS/ST/SE/GE/IEA envelope
- `serialize270(inquiry, options)` -- Generates 270 eligibility inquiry
- `exportX12Bundle(payload, claimId, txSet)` -- Writes to `data/rcm-exports/`

Default `usageIndicator` is `'T'` (test) -- never `'P'` (production) unless explicitly set.

## PhilHealth eClaims Serializer

`ph-eclaims-serializer.ts` transforms EdiClaim837 to PhilHealth CF1-CF4 JSON bundles:
- CF1: Facility + patient info
- CF2: Outpatient (837P) or inpatient (837I) claim details
- CF3: Professional fees (inpatient only)
- CF4: Medicines/supplies detail

## CSV Payer Import

POST `/rcm/payers/import` with body:
```json
{
  "csv": "payerId,name,country,integrationMode,status\nTEST01,Test Payer,US,clearinghouse_edi,active"
}
```

Required columns: `payerId`, `name`. Optional: `country`, `status`, `integrationMode`, etc.

## Validation Rules (Phase 40 additions)

| Rule ID | Category | Description |
|---------|----------|-------------|
| AUTH-001 | authorization | Prior auth check for high-cost procedures |
| AUTH-002 | authorization | Demo claim submission block |
| AUTH-003 | authorization | Submission safety mode indicator |

## Audit Actions (Phase 40 additions)

- `claim.exported` -- Claim exported as X12 artifact
- `claim.ready_to_submit` -- Claim transitioned to ready_to_submit
- `claim.submission_blocked` -- Submission blocked (demo or safety)
- `edi.x12_serialized` -- X12 wire format generated
- `payer.csv_imported` -- Payers imported from CSV
- `safety.export_only` -- Export-only mode event
- `safety.live_enabled` -- Live submission enabled event

## UI Changes

- Submission safety banner (yellow) when CLAIM_SUBMISSION_ENABLED=false
- `ready_to_submit` status color (teal #17a2b8)
- DEMO badge on demo claims
- EXPORTED indicator for claims with export artifacts
- Phase indicator updated to Phase 40

## Testing

```powershell
# Run Phase 40 verifier
.\scripts\verify-phase40-payer-connectivity.ps1

# Manual: check submission safety status
curl http://localhost:3001/rcm/submission-safety

# Manual: create and export a claim
curl -X POST http://localhost:3001/rcm/claims/draft -H "Content-Type: application/json" \
  -d '{"patientDfn":"3","payerId":"BCBS","dateOfService":"2025-01-15","totalCharge":150}'

curl -X POST http://localhost:3001/rcm/claims/{id}/validate
curl -X POST http://localhost:3001/rcm/claims/{id}/export
```

## Verification

```powershell
.\scripts\verify-phase40-payer-connectivity.ps1
# Expected: 53/53 gates PASS
```
