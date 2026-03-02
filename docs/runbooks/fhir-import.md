# FHIR Import Runbook

> Phase 456 (W30-P1) — Importing patient data via FHIR R4 Bundles.

## Overview

The FHIR import pipeline accepts FHIR R4 Bundles containing:
- Patient
- Condition
- MedicationRequest
- AllergyIntolerance
- Observation
- Encounter

## Import Flow

```
FHIR Bundle → Validate → Import → Track Batch Status
```

1. POST FHIR Bundle to `/migration/fhir/import`
2. Pipeline validates each resource against required fields
3. Batch status tracked in-memory (resets on API restart)
4. Results include per-resource-type counts and errors

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/migration/fhir/import` | Import a FHIR R4 Bundle |
| GET | `/migration/batches` | List all import batches |
| GET | `/migration/batches/:id` | Get single batch details |
| GET | `/migration/health` | Migration subsystem health |

## Example Import

```bash
curl -X POST http://localhost:3001/migration/fhir/import \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "name": [{"family": "TEST", "given": ["IMPORT"]}],
          "birthDate": "1980-01-01",
          "gender": "male"
        }
      }
    ]
  }'
```

## Batch Status Values

| Status | Meaning |
|--------|---------|
| pending | Batch created, not yet processed |
| validating | Resources being validated |
| importing | Active import in progress |
| completed | All resources imported successfully |
| partial | Some resources imported, some failed |
| failed | No resources imported successfully |

## Notes

- Import batches are in-memory (reset on API restart)
- No PHI in logs -- batch IDs are opaque hex tokens
- VistA write-back is a future enhancement (requires RPC mapping)
- Admin-only access via AUTH_RULES
