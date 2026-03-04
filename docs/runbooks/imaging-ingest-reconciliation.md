# Imaging Ingest & Reconciliation — Phase 23 Runbook

## Overview

When Orthanc receives a DICOM study and it becomes "stable" (no new instances
for 60 seconds), a Lua callback sends study metadata to the API. The API
reconciles the study to a worklist order using AccessionNumber and PatientID.

## Architecture

```
Modality → C-STORE → Orthanc → OnStableStudy Lua → POST /imaging/ingest/callback → Reconcile
                                                                                      ↓
                                                                      ┌────────────────┴────────────┐
                                                                      │ Matched → StudyLinkage       │
                                                                      │ Unmatched → Quarantine queue  │
                                                                      └───────────────────────────────┘
```

## Configuration

### Environment variables

| Variable                        | Default                                                    | Description                     |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| `IMAGING_INGEST_WEBHOOK_SECRET` | `dev-imaging-ingest-key-change-in-production`              | Shared secret for X-Service-Key |
| `INGEST_CALLBACK_URL`           | `http://host.docker.internal:3001/imaging/ingest/callback` | API callback URL (in Orthanc)   |
| `INGEST_SERVICE_KEY`            | Same as webhook secret                                     | Service key sent by Lua         |

### Orthanc Lua Script

File: `services/imaging/on-stable-study.lua`
Mounted into Orthanc at `/etc/orthanc/on-stable-study.lua` via docker-compose.

The script:

1. Fires on `OnStableStudy` event
2. Reads study DICOM tags via Orthanc REST API
3. POSTs JSON payload to the API callback
4. Includes `X-Service-Key` header for auth

## Reconciliation Strategies

### Strategy 1: AccessionNumber exact match (preferred)

- DICOM AccessionNumber matches a worklist item's accessionNumber
- PatientID must also match the item's patientDfn (safety check)
- If AccessionNumber matches but patient differs → quarantine (possible data integrity issue)

### Strategy 2: PatientID + Modality + Date fuzzy match

- Same patient, same modality, same day
- Only triggers if exactly one unlinked order matches (no ambiguity)
- Multiple candidates → quarantine

### Strategy 3: Quarantine

- No matching order found → study goes to unmatched queue
- Admin manually links via `POST /imaging/ingest/unmatched/:id/link`

## API Endpoints

### Ingest callback (service auth)

```
POST /imaging/ingest/callback
X-Service-Key: dev-imaging-ingest-key-change-in-production
Content-Type: application/json

{
  "orthancStudyId": "abc-123",
  "studyInstanceUid": "1.2.840.113619...",
  "patientId": "100022",
  "patientName": "PATIENT^TEST",
  "accessionNumber": "VE-20260218-1001",
  "modality": "CT",
  "studyDate": "20260218",
  "studyDescription": "CT CHEST WO",
  "seriesCount": 3,
  "instanceCount": 245
}
```

**Response (matched)**:

```json
{
  "ok": true,
  "reconciled": true,
  "matchType": "accession-exact",
  "linkage": { ... }
}
```

**Response (quarantined)**:

```json
{
  "ok": true,
  "reconciled": false,
  "quarantined": true,
  "reason": "No matching order found...",
  "unmatchedId": "uuid"
}
```

### List unmatched studies (admin)

```
GET /imaging/ingest/unmatched
Authorization: session cookie (admin role)
```

### Manual reconciliation (admin)

```
POST /imaging/ingest/unmatched/:id/link
Content-Type: application/json
Authorization: session cookie (admin role)

{ "orderId": "worklist-item-uuid" }
```

### List all linkages

```
GET /imaging/ingest/linkages?patientDfn=100022
Authorization: session cookie
```

### Linkages by patient

```
GET /imaging/ingest/linkages/by-patient/100022
Authorization: session cookie
```

## Security

- Ingest callback uses `X-Service-Key` header (not session cookie)
- Key is validated with constant-time comparison
- Unmatched queue management requires admin role
- No DICOM body data is logged (only metadata fields)
- PatientID in DICOM is treated as PHI — no verbose logging

## Troubleshooting

| Problem                              | Fix                                                                |
| ------------------------------------ | ------------------------------------------------------------------ |
| 403 on callback                      | Check `IMAGING_INGEST_WEBHOOK_SECRET` matches `INGEST_SERVICE_KEY` |
| Studies not triggering callback      | Check Orthanc `StableAge` (60s). Wait for study to stabilize       |
| Lua script not loaded                | Verify `LuaScripts` in orthanc.json points to correct path         |
| `host.docker.internal` not resolving | On Linux, add `--add-host=host.docker.internal:host-gateway`       |
| Quarantined study                    | Check AccessionNumber in DICOM matches the worklist order          |
| Patient mismatch quarantine          | PatientID in DICOM must equal the worklist item's patientDfn       |

## Migration to VistA

When `MAG4 ADD IMAGE` RPC becomes available, the reconciliation step will
also write an image pointer into `^MAG(2005)` for native VistA Imaging access.
See [imaging-grounding.md](imaging-grounding.md).
