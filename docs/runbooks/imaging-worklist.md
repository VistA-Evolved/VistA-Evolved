# Imaging Worklist — Phase 23 Runbook

## Overview
The imaging worklist provides a REST-based modality worklist backed by imaging orders.
Orders flow: Provider → Order → Worklist → Modality acquires → Study ingested → Reconciled.

## Architecture
- **Source**: In-memory sidecar store (prototype). Target: VistA `^RAD(75.1)`.
- **Endpoints**: Session-authenticated (non-admin users can view/create).
- **Accession numbers**: Generated locally as `VE-YYYYMMDD-NNNN`. Target: VistA `^RA(74)`.

## API Endpoints

### List worklist items
```
GET /imaging/worklist?facility=&modality=CT&date=2026-02-18&status=ordered
Authorization: session cookie
```

### Create imaging order
```
POST /imaging/worklist/orders
Content-Type: application/json
Authorization: session cookie

{
  "patientDfn": "100022",
  "patientName": "PATIENT,TEST",
  "scheduledProcedure": "CT Chest without contrast",
  "modality": "CT",
  "scheduledTime": "2026-02-18T10:00:00Z",
  "facility": "MAIN",
  "location": "Radiology Room 1",
  "clinicalIndication": "Chest pain, rule out PE",
  "priority": "stat"
}
```

**Response** (201):
```json
{
  "ok": true,
  "source": "prototype-sidecar",
  "order": {
    "id": "uuid",
    "accessionNumber": "VE-20260218-1001",
    "status": "ordered",
    ...
  }
}
```

### Get worklist item detail
```
GET /imaging/worklist/:id
```

### Update worklist item status
```
PATCH /imaging/worklist/:id/status
Content-Type: application/json

{ "status": "scheduled" }
```

Valid statuses: `ordered`, `scheduled`, `in-progress`, `completed`, `cancelled`, `discontinued`.

### Worklist statistics
```
GET /imaging/worklist/stats
```

## Valid Modalities
CR, CT, MR, US, XA, NM, PT, MG, DX, RF, OT

## Migration to VistA
See [imaging-grounding.md](imaging-grounding.md) for the full migration plan.

When VistA Radiology RPCs become available:
1. Replace order creation with `ORWDXR NEW ORDER`
2. Replace worklist read with `RARTE EXAMS BY DFN`
3. Accession numbers from `^RA(74)` instead of local generator

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 401 on worklist | Ensure session cookie is sent (`credentials: 'include'`) |
| Order creation fails | Check required fields: patientDfn, scheduledProcedure, modality |
| Invalid modality error | Use uppercase DICOM modality codes (CT, MR, etc.) |
| Orders disappear after restart | Expected — in-memory sidecar. Will persist when VistA-backed |
