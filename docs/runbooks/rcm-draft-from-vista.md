# Runbook: RCM Claim Draft from VistA (Phase 42)

## Overview

Phase 42 adds the ability to generate RCM claim drafts directly from VistA
PCE (Patient Care Encounter) data. The system reads real encounter, diagnosis,
procedure, and insurance data from VistA RPCs and produces claim draft
candidates with honest annotations about missing data.

## Architecture

```
Patient Selection
       |
       v
  ORWPCE VISIT  ------>  Encounter List
       |
       +--> ORWPCE DIAG  ------>  Diagnoses (ICD-10)
       +--> ORWPCE PROC  ------>  Procedures (CPT)
       +--> IBCN INSURANCE QUERY --> Insurance/Coverage
       |
       v
  buildClaimDraftFromVista()
       |
       v
  ClaimDraftCandidate[]
    - claim (draft status)
    - missingFields[]
    - sourceMissing[] (exact VistA source)
    - rpcsCalled[]
       |
       v
  Validation Engine --> Export / Submit
```

## API Endpoints

### GET /rcm/vista/encounters?patientIen=N&from=&to=

Fetches PCE encounters for a patient from VistA.

```bash
curl http://127.0.0.1:3001/rcm/vista/encounters?patientIen=3
```

### POST /rcm/vista/claim-drafts

Generates claim draft candidates from VistA encounter data.

```bash
curl -X POST http://127.0.0.1:3001/rcm/vista/claim-drafts \
  -H "Content-Type: application/json" \
  -d '{"patientIen":"3","encounterId":"100"}'
```

Body parameters:

- `patientIen` (required) -- patient DFN
- `dateFrom` (optional) -- ISO date filter
- `dateTo` (optional) -- ISO date filter
- `encounterId` (optional) -- specific visit IEN
- `payerId` (optional) -- override payer assignment
- `tenantId` (optional) -- tenant context

### GET /rcm/vista/coverage?patientIen=N

Returns patient insurance coverage from VistA.

```bash
curl http://127.0.0.1:3001/rcm/vista/coverage?patientIen=3
```

## How It Works

1. **Encounter Fetch**: Calls `ORWPCE VISIT` to get visit list for patient
2. **Diagnosis Fetch**: Calls `ORWPCE DIAG` for each selected encounter
3. **Procedure Fetch**: Calls `ORWPCE PROC` for CPT codes
4. **Insurance Fetch**: Calls `IBCN INSURANCE QUERY` once per patient
5. **Draft Assembly**: Maps VistA data into Claim domain model
6. **Annotation**: Marks missing fields with exact VistA source needed
7. **Storage**: Stores generated drafts in claim store

## Missing Field Annotations

Each claim draft candidate includes:

- `missingFields[]` -- list of field names that are missing
- `sourceMissing[]` -- detailed entries with:
  - `field` -- the field name
  - `vistaSource` -- the exact VistA RPC or global needed
  - `reason` -- why the field is missing

### Common Missing Fields in Sandbox

| Field          | VistA Source         | Reason                                   |
| -------------- | -------------------- | ---------------------------------------- |
| ibChargeAmount | ^IB(350)             | IB billing empty in WorldVistA sandbox   |
| diagnoses      | ORWPCE DIAG          | Some encounters have no linked diagnoses |
| procedures     | ORWPCE PROC          | Some encounters have no linked CPT codes |
| subscriberId   | IBCN INSURANCE QUERY | Patient may lack insurance               |
| payerName      | IBCN INSURANCE QUERY | No insurance on file                     |

## VistA Wrapper RPC

### VE RCM PROVIDER INFO

Custom wrapper RPC (ZVERCMP.m) that reads provider NPI and facility
identifiers for claim drafts.

Install:

```powershell
.\scripts\install-rcm-wrappers.ps1
```

Returns: `PROVIDER_NAME^NPI^FACILITY_NAME^FACILITY_IEN^STATION_NUMBER`

## UI Flow

The "Draft from VistA" tab in the RCM dashboard provides:

1. **Patient + Date Selection** -- Enter patient IEN, optional date range
2. **Prerequisites Checklist** -- Shows status of required VistA data sources
3. **Encounter Selection** -- Table of encounters with radio selection
4. **Draft Generation** -- Creates claim drafts from selected encounters
5. **Review** -- Shows generated drafts with missing field annotations

## Testing

```bash
cd apps/api
npx vitest run tests/buildClaimDraftFromVista.test.ts
```

25 tests covering:

- Parser functions (encounters, diagnoses, procedures, insurance)
- Builder with full data, partial data, and failures
- Missing field annotations
- No PHI in output
- Graceful error handling

## Troubleshooting

### "VistA credentials not configured"

Ensure `apps/api/.env.local` has VISTA_ACCESS_CODE and VISTA_VERIFY_CODE set.

### "VistA service unavailable"

Check that the WorldVistA Docker container is running on port 9430.

### No encounters returned

Verify the patient DFN exists. Try DFN=3 (CARTER,DAVID) in the sandbox.

### All charges show $0.00

Expected in sandbox. IB charges (^IB(350)) are empty in WorldVistA Docker.
In production with IB module active, charges will be populated.

### Insurance returns empty

Not all sandbox patients have insurance. Try DFN=3 which may have partial
coverage data.

## Production Migration

1. IB charges become available when IB module is configured
2. Replace $0.00 charge placeholders with real IB charge data
3. Provider NPI populated from VE RCM PROVIDER INFO wrapper
4. Remove `ibChargeAmount` from missingFields when ^IB(350) has data
5. Integration-pending markers auto-resolve when VistA subsystems are active
