# Imaging Audit Trail — Phase 24

> Hash-chained, tamper-evident, append-only audit log for imaging compliance.

## Overview

The imaging audit trail provides a **separate**, tamper-evident audit log
specifically for imaging operations. It uses SHA-256 hash chaining so that
any modification to historical entries is detectable. It sits alongside
(not replacing) the general `audit.ts` system.

### Why Separate?

- **Regulatory**: HIPAA, FDA 21 CFR Part 11, and DICOM standard (PS3.15)
  require imaging-specific access tracking
- **Tamper evidence**: Hash chain ensures integrity without an external DB
- **VistA alignment**: Mirrors VistA's ^MAG(2005.1) IMAGE AUDIT file

## Hash Chain Design

```
Entry 0:  prevHash = "000...0" (64 zeros, genesis)
          hash = SHA-256(content_0)

Entry 1:  prevHash = hash_of_entry_0
          hash = SHA-256(content_1)

Entry N:  prevHash = hash_of_entry_N-1
          hash = SHA-256(content_N)
```

Each entry's hash covers: `id, seq, timestamp, prevHash, action, outcome,
actorDuz, actorName, actorRole, tenantId, patientDfn, studyInstanceUid,
requestId, sourceIp, detail`.

The `hash` field itself is excluded from its own computation (chicken-egg).

## Audited Actions

| Action                | When Logged                                         |
| --------------------- | --------------------------------------------------- |
| `VIEW_STUDY`          | WADO-RS metadata/instance/frame retrieval           |
| `VIEW_SERIES`         | QIDO-RS series search                               |
| `SEARCH_STUDIES`      | QIDO-RS study search                                |
| `INGEST_STUDY`        | Orthanc OnStableStudy callback                      |
| `LINK_STUDY_TO_ORDER` | Reconciliation: study linked to worklist order      |
| `UNMATCHED_STUDY`     | Study ingested but not matched to any order         |
| `BREAK_GLASS_START`   | Emergency access initiated                          |
| `BREAK_GLASS_STOP`    | Emergency access terminated (manual or auto-expiry) |
| `DEVICE_REGISTER`     | New DICOM device registered                         |
| `DEVICE_UPDATE`       | Device configuration changed                        |
| `DEVICE_DELETE`       | Device decommissioned                               |
| `STOW_UPLOAD`         | DICOM instances stored via STOW-RS                  |
| `VIEWER_LAUNCH`       | OHIF viewer URL generated                           |
| `AUDIT_QUERY`         | Audit log queried (meta-audit)                      |
| `AUDIT_EXPORT`        | Audit log exported to CSV                           |

## API Endpoints

All audit endpoints require `imaging_admin` permission.

### Query Audit Events

```bash
curl 'http://localhost:3001/imaging/audit/events?limit=50&action=VIEW_STUDY' \
  -b 'ehr_session=...'
```

Query parameters:

- `limit` — max entries to return (default: 100)
- `offset` — skip N entries
- `action` — filter by action type
- `actorDuz` — filter by actor DUZ
- `tenantId` — filter by tenant
- `from` — ISO 8601 start timestamp
- `to` — ISO 8601 end timestamp

### Chain Statistics

```bash
curl http://localhost:3001/imaging/audit/stats \
  -b 'ehr_session=...'
```

Response:

```json
{
  "ok": true,
  "stats": {
    "totalEntries": 1234,
    "chainIntact": true,
    "lastEntry": {
      "seq": 1234,
      "timestamp": "2025-01-15T10:30:00.000Z",
      "action": "VIEW_STUDY",
      "hash": "abc123..."
    }
  }
}
```

### Verify Chain Integrity

```bash
curl http://localhost:3001/imaging/audit/verify \
  -b 'ehr_session=...'
```

Response:

```json
{
  "ok": true,
  "verification": {
    "intact": true,
    "entriesChecked": 1234,
    "message": "Chain integrity verified: 1234 entries, all valid"
  }
}
```

If tampering is detected:

```json
{
  "ok": true,
  "verification": {
    "intact": false,
    "entriesChecked": 500,
    "message": "Chain integrity BROKEN at sequence 501"
  }
}
```

### Export to CSV

```bash
curl 'http://localhost:3001/imaging/audit/export?format=csv' \
  -b 'ehr_session=...' \
  -o imaging-audit.csv
```

## Configuration

| Env Variable                | Default | Description                           |
| --------------------------- | ------- | ------------------------------------- |
| `IMAGING_AUDIT_MAX_ENTRIES` | 10000   | Max in-memory entries before eviction |
| `IMAGING_AUDIT_FILE`        | (empty) | Path for JSONL persistence            |

### JSONL Persistence

Set `IMAGING_AUDIT_FILE` to enable file-based persistence:

```bash
IMAGING_AUDIT_FILE=./data/imaging-audit.jsonl
```

Each line is a JSON object representing one audit entry. The file is
append-only — entries are never modified or deleted.

## PHI Safety

The audit trail **sanitizes** all details to prevent PHI/credential leakage:

Blocked fields:

- `pixelData`, `pixel_data` — DICOM pixel data
- `bulkDataURI`, `InlineBinary` — DICOM bulk data
- `hl7Body`, `hl7Message`, `messageBody` — HL7 message content
- `accessCode`, `verifyCode`, `password` — credentials
- `token`, `secret` — authentication tokens
- `ssn`, `socialSecurityNumber` — SSN
- `dateOfBirth` — DOB

These are replaced with `"[REDACTED]"` before hashing.

## Health Endpoint Integration

The `/imaging/health` endpoint now reports audit chain status:

```json
{
  "ok": true,
  "audit": {
    "auditChainLength": 1234,
    "auditChainIntact": true,
    "lastAuditEvent": "2025-01-15T10:30:00.000Z"
  }
}
```

## UI Access

Admin users see an **Audit Log** tab in the Imaging Panel with:

- Filterable event list (sequence, time, action, outcome, actor, study UID)
- Color-coded denied events (red background)
- Color-coded action types (break-glass: amber, device: blue)
- CSV export button
- Refresh button

## Troubleshooting

| Symptom                | Cause                              | Fix                             |
| ---------------------- | ---------------------------------- | ------------------------------- |
| Chain integrity broken | In-memory eviction removed entries | Expected if > `MAX_ENTRIES`     |
| No JSONL file created  | `IMAGING_AUDIT_FILE` not set       | Set env var                     |
| 403 on audit endpoints | Not imaging_admin                  | Login as admin                  |
| Large audit file       | High-volume imaging                | Rotate JSONL files periodically |
