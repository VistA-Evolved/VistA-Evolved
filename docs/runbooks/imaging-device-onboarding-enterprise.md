# Imaging Device Onboarding (Enterprise) — Phase 24

> DICOM device registry, AE Title management, C-ECHO testing, and
> IP allowlist configuration.

## Overview

The device onboarding framework manages DICOM endpoints (modalities,
PACS, workstations) that communicate with the VistA-Evolved imaging
infrastructure. Each device is registered with an AE Title, network
address, modality type, and optional IP allowlist.

**VistA-first**: This is a platform-level device registry. When VistA
Radiology's Device file (^DIC(78.1)) becomes available, registered
devices can be synced to VistA's native device management.

## Prerequisites

- API server running (`npx tsx --env-file=.env.local src/index.ts`)
- Admin session (PROV123 / PROV123!! maps to admin role)
- Orthanc running (for C-ECHO tests): `cd services/imaging && docker compose up -d`

## Device Registration

### Register a New Device

```bash
curl -X POST http://localhost:3001/imaging/devices \
  -H 'Content-Type: application/json' \
  -b 'ehr_session=...' \
  -d '{
    "aeTitle": "CT_SCANNER_01",
    "hostname": "192.168.1.100",
    "port": 11112,
    "description": "Main CT scanner, Radiology Dept",
    "modality": "CT",
    "facility": "MAIN_CAMPUS",
    "location": "Radiology Room 3",
    "manufacturer": "GE Healthcare",
    "modelName": "Revolution CT",
    "tlsMode": "optional",
    "ipAllowlist": ["192.168.1.0/24"]
  }'
```

### AE Title Rules

- 1–16 characters
- Uppercase letters, digits, underscore, space only
- Must be unique across all devices
- Pattern: `/^[A-Z0-9_ ]{1,16}$/`

### Supported Modality Types

```
CR  CT  DX  ES  GM  IO  MG  MR  NM  OT
PT  PX  RF  RG  SM  US  XA  XC  DOC
RTIMAGE  RTDOSE  RTPLAN  RTSTRUCT  SEG  KO  PR
```

### TLS Modes

| Mode | Description |
|---|---|
| `off` | No TLS (development only) |
| `optional` | Accept both TLS and plain connections |
| `required` | Enforce TLS for all DICOM communication |

## Device Lifecycle

```
[Register] → testing → active → inactive → decommissioned
                ↕                    ↕
              active              testing
```

### List All Devices

```bash
curl http://localhost:3001/imaging/devices \
  -b 'ehr_session=...'

# Filter by status
curl 'http://localhost:3001/imaging/devices?status=active' \
  -b 'ehr_session=...'

# Filter by modality
curl 'http://localhost:3001/imaging/devices?modality=CT' \
  -b 'ehr_session=...'
```

### Update a Device

```bash
curl -X PATCH http://localhost:3001/imaging/devices/<device-id> \
  -H 'Content-Type: application/json' \
  -b 'ehr_session=...' \
  -d '{"status": "active", "description": "Updated description"}'
```

### Decommission a Device (Soft Delete)

```bash
curl -X DELETE http://localhost:3001/imaging/devices/<device-id> \
  -b 'ehr_session=...'
```

The device is **not** physically deleted — it's set to `status: decommissioned`
with a `decommissionedAt` timestamp. This preserves audit trail integrity.

## C-ECHO Connectivity Test

Test DICOM network connectivity to a registered device using Orthanc
as the SCU (Service Class User):

```bash
curl -X POST http://localhost:3001/imaging/devices/<device-id>/echo \
  -b 'ehr_session=...'
```

### Response

```json
{
  "ok": true,
  "echo": {
    "success": true,
    "aeTitle": "CT_SCANNER_01",
    "hostname": "192.168.1.100",
    "port": 11112,
    "responseTimeMs": 45,
    "testedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### How C-ECHO Works

1. API sends a POST to Orthanc's `/modalities/<device>/echo`
2. Orthanc issues a DICOM C-ECHO to the target device
3. Device responds with C-ECHO-RSP
4. API records success/failure + response time

**Note**: The device must be reachable from Orthanc's Docker network.
For devices on the host network, use the Docker host IP (not localhost).

## IP Allowlist

Devices can be restricted to specific CIDR ranges:

```json
{
  "ipAllowlist": ["192.168.1.0/24", "10.0.0.0/8"]
}
```

Currently **advisory** — enforced at the application layer when VistA
DICOM Gateway integration is available. The allowlist is validated
for CIDR format on registration.

## Audit Trail

All device operations are logged to the imaging audit trail:

| Action | Trigger |
|---|---|
| `DEVICE_REGISTER` | POST /imaging/devices |
| `DEVICE_UPDATE` | PATCH /imaging/devices/:id |
| `DEVICE_DELETE` | DELETE /imaging/devices/:id |

These entries are hash-chained and tamper-evident.

## Future VistA Integration

1. **Sync to ^DIC(78.1)**: Map device AE Titles to VistA Device file entries
2. **Import from VistA**: Read existing VistA devices and create platform entries
3. **DICOM Gateway**: Integrate with VistA DICOM Gateway for C-STORE routing
4. **RA MODIFIERS**: Map device capabilities to VistA Radiology modifiers

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 400 on device create | Invalid AE Title format | Ensure uppercase, 1-16 chars |
| 409 on device create | Duplicate AE Title | Use unique AE Title |
| C-ECHO fails | Device unreachable from Orthanc | Check Docker networking |
| 403 on device endpoints | Not imaging_admin | Login as admin role |
