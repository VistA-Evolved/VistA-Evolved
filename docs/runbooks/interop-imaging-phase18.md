# Enterprise Interop + Imaging Platform Integration — Phase 18 Runbook

## Overview

Phase 18 adds enterprise-grade interoperability and imaging platform integration:

- **Integration Registry** — central model for all external system connections
  (VistA RPC, FHIR, C0FHIR, DICOMweb, HL7v2, LIS, PACS/VNA, devices)
- **Admin Integration Console** — UI for managing, probing, and monitoring integrations
- **Device Onboarding** — config-not-code approach for modalities and bedside devices
- **Imaging Integration Service** — VistA-first imaging with DICOMweb/OHIF fallback
- **Remote Data Viewer Upgrade** — registry-aware external data sources
- **Metrics + Audit** — integration health in `/metrics`, 5 new audit actions

VistA-first: all data queries start with VistA RPCs; external systems augment,
never replace, the VistA source of truth.

## Architecture

### API (`apps/api/src/`)

| File                             | Purpose                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `config/integration-registry.ts` | IntegrationEntry model, in-memory per-tenant store, health monitoring, seeded defaults |
| `routes/interop.ts`              | Admin CRUD for registry, probe, toggle, health-summary, device onboarding              |
| `services/imaging-service.ts`    | Enhanced imaging routes (studies, viewer-url, metadata, registry-status)               |
| `routes/imaging.ts`              | Original Phase 14D imaging (preserved for reference)                                   |
| `lib/audit.ts`                   | 5 new AuditAction types for integration + imaging operations                           |
| `index.ts`                       | Registers interop routes, integration health in `/metrics`                             |

### Web (`apps/web/src/`)

| File                                      | Purpose                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `app/cprs/admin/integrations/page.tsx`    | Integration Console (3 tabs: Registry, Device Onboarding, Legacy Connectors) |
| `components/cprs/panels/ReportsPanel.tsx` | Imaging status, study list, viewer launch in Reports tab                     |
| `app/cprs/remote-data-viewer/page.tsx`    | External sources populated from integration registry                         |

## Integration Types

| Type          | Description                | Transport  | Probe Method                       |
| ------------- | -------------------------- | ---------- | ---------------------------------- |
| `vista-rpc`   | Direct XWB RPC Broker      | TCP/9430   | XWB handshake via `probeConnect()` |
| `fhir`        | Generic FHIR R4 endpoint   | HTTPS      | HTTP GET `/metadata`               |
| `fhir-c0fhir` | WorldVistA C0FHIR Suite    | RPC → HTTP | HTTP GET (Apache→MUMPS)            |
| `fhir-vpr`    | VPR GET PATIENT DATA JSON  | RPC        | XWB handshake                      |
| `dicom`       | Raw DICOM (C-STORE/C-FIND) | TCP        | TCP socket connect                 |
| `dicomweb`    | DICOMweb (WADO/STOW/QIDO)  | HTTPS      | HTTP GET qidoRsPath                |
| `hl7v2`       | HL7v2 MLLP feeds           | TCP        | TCP socket connect                 |
| `lis`         | Lab Information System     | TCP        | TCP socket connect                 |
| `pacs-vna`    | PACS/VNA archive           | TCP/HTTPS  | TCP or HTTP fetch                  |
| `device`      | Modality / bedside device  | TCP        | TCP socket connect                 |
| `external`    | Other external system      | HTTPS      | HTTP fetch baseUrl                 |

## Admin API Endpoints

All `/admin/registry/` endpoints require admin role.

### Registry CRUD

- `GET /admin/registry/:tenantId` — list all integrations for tenant
- `GET /admin/registry/:tenantId/:integrationId` — get single integration
- `PUT /admin/registry/:tenantId/:integrationId` — create or update integration
- `DELETE /admin/registry/:tenantId/:integrationId` — delete integration

### Operations

- `POST /admin/registry/:tenantId/:integrationId/toggle` — enable/disable
- `POST /admin/registry/:tenantId/:integrationId/probe` — probe single integration
- `POST /admin/registry/:tenantId/probe-all` — probe all enabled integrations
- `GET /admin/registry/:tenantId/health-summary` — aggregated health summary
- `GET /admin/registry/:tenantId/error-log/:integrationId` — error log (last 20)

### Device Onboarding

- `POST /admin/registry/:tenantId/onboard-device` — onboard new device/modality

## Imaging Endpoints

| Route                                     | Auth    | Description                                |
| ----------------------------------------- | ------- | ------------------------------------------ |
| `GET /vista/imaging/status`               | Session | Imaging system status (MAG4/RA + registry) |
| `GET /vista/imaging/report`               | Session | Radiology report text for a case           |
| `GET /vista/imaging/studies?dfn=`         | Session | Patient study list (VistA + DICOMweb)      |
| `GET /vista/imaging/viewer-url?studyUid=` | Session | OHIF viewer URL for a study                |
| `GET /vista/imaging/metadata?studyUid=`   | Session | WADO-RS metadata for a study               |
| `GET /vista/imaging/registry-status`      | Session | Integration registry imaging entries       |

## Device Onboarding Workflow

### Required Fields

```json
{
  "id": "ct-scanner-01",
  "label": "CT Scanner — Radiology Room 1",
  "host": "192.168.1.50",
  "port": 104,
  "manufacturer": "GE Healthcare",
  "model": "Revolution CT",
  "serialNumber": "SN-12345",
  "modalityCode": "CT",
  "aeTitle": "CT_SCANNER_01",
  "location": "Radiology — Room 1"
}
```

### Steps

1. Navigate to Admin → Integrations → Device Onboarding tab
2. Fill out the form fields (all required)
3. Click "Onboard Device"
4. The device appears in the Registry tab as type `device`, initially enabled
5. Use "Probe" to verify TCP connectivity
6. Device is now available for Modality Worklist query

### Optional fields in DeviceConfig

- `worklistAeTitle` — separate AE title for worklist queries
- `conformanceClasses` — DICOM Conformance Classes supported (string array)

## C0FHIR Suite Configuration

The WorldVistA C0FHIR Suite provides FHIR R4 via MUMPS-native RPC.

### Environment Variables

```bash
# Add to apps/api/.env.local
C0FHIR_HOST=localhost
C0FHIR_PORT=8001
```

### How It Works

1. On startup, if `C0FHIR_HOST` is set, `seedDefaultIntegrations()` creates
   a `fhir-c0fhir` entry in the registry
2. The RPC `C0FHIR GET FULL BUNDLE` returns FHIR R4 JSON for a patient
3. The context `C0FHIR CONTEXT` must be assigned to the user in VistA
4. Apache serves as the HTTP front-end; MUMPS M web server is the backend

### Manual Test

```bash
# If C0FHIR is installed in Docker:
curl http://localhost:8001/fhir?dfn=3
```

## DICOMweb Configuration

### Adding an Orthanc Server

```bash
curl -X PUT -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "Orthanc DICOM Archive",
    "type": "dicomweb",
    "enabled": true,
    "host": "orthanc.local",
    "port": 8042,
    "typeConfig": {
      "qidoRsPath": "/dicom-web",
      "wadoRsPath": "/dicom-web",
      "stowRsPath": "/dicom-web",
      "authMethod": "basic",
      "authToken": "b3J0aGFuYzpvcnRoYW5j"
    }
  }' \
  http://127.0.0.1:3001/admin/registry/default/orthanc-primary
```

### Adding dcm4chee

```bash
curl -X PUT -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "dcm4chee Archive",
    "type": "dicomweb",
    "enabled": true,
    "host": "dcm4chee.local",
    "port": 8080,
    "typeConfig": {
      "qidoRsPath": "/dcm4chee-arc/aets/DCM4CHEE/rs",
      "wadoRsPath": "/dcm4chee-arc/aets/DCM4CHEE/rs",
      "stowRsPath": "/dcm4chee-arc/aets/DCM4CHEE/rs"
    }
  }' \
  http://127.0.0.1:3001/admin/registry/default/dcm4chee-primary
```

### OHIF Viewer

The imaging service generates OHIF viewer URLs when DICOMweb is configured.
Set the OHIF viewer base URL in the viewer config:

```
OHIF_VIEWER_URL=http://localhost:3000
```

Generated URL format: `{OHIF_VIEWER_URL}/viewer?StudyInstanceUIDs={uid}`

## Seeded Defaults

On startup, `seedDefaultIntegrations("default")` creates:

| ID              | Type        | Description                                                |
| --------------- | ----------- | ---------------------------------------------------------- |
| `vista-primary` | vista-rpc   | Primary VistA RPC Broker (from env: VISTA_HOST/VISTA_PORT) |
| `vista-imaging` | vista-rpc   | VistA Imaging (MAG4/RA RPCs) — same host                   |
| `fhir-c0fhir`   | fhir-c0fhir | C0FHIR Suite (only if C0FHIR_HOST env is set)              |

## Audit Actions

| Action                       | When                                              |
| ---------------------------- | ------------------------------------------------- |
| `integration.config-change`  | Integration created, updated, deleted, or toggled |
| `integration.probe`          | Integration probed (single or probe-all)          |
| `integration.dashboard-view` | Admin views integration console                   |
| `integration.device-onboard` | New device onboarded                              |
| `imaging.viewer-launch`      | Viewer URL generated for a study                  |

## Health Monitoring

### Health Summary Structure

```typescript
{
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
}
```

### Health in /metrics

The `/metrics` endpoint now includes:

```json
{
  "integrations": { "total": 3, "healthy": 2, "degraded": 0, "down": 0, "unknown": 1 }
}
```

### Error Log

Each integration keeps a ring buffer of the last 20 errors:

```typescript
{
  timestamp: string;
  message: string;
  code?: string;
}
```

## Testing Manually

### 1. List integrations (admin)

```bash
curl -b cookies.txt http://127.0.0.1:3001/admin/registry/default
```

### 2. Probe all integrations

```bash
curl -X POST -b cookies.txt \
  http://127.0.0.1:3001/admin/registry/default/probe-all
```

### 3. Check health summary

```bash
curl -b cookies.txt \
  http://127.0.0.1:3001/admin/registry/default/health-summary
```

### 4. Onboard a device

```bash
curl -X POST -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "us-01",
    "label": "Ultrasound Unit 01",
    "host": "192.168.1.60",
    "port": 104,
    "manufacturer": "Philips",
    "model": "EPIQ 7",
    "serialNumber": "PH-US-001",
    "modalityCode": "US",
    "aeTitle": "US_01",
    "location": "OB/GYN — Room 3"
  }' \
  http://127.0.0.1:3001/admin/registry/default/onboard-device
```

### 5. Check imaging studies

```bash
curl -b cookies.txt \
  "http://127.0.0.1:3001/vista/imaging/studies?dfn=3"
```

### 6. Get viewer URL

```bash
curl -b cookies.txt \
  "http://127.0.0.1:3001/vista/imaging/viewer-url?studyUid=1.2.3.4.5"
```

### 7. Check integration health in metrics

```bash
curl http://127.0.0.1:3001/metrics | jq .integrations
```

## Admin Console UI

Navigate to `/cprs/admin/integrations` (requires admin role).

### Three tabs:

1. **Integration Registry** — All registered integrations with health status,
   enable/disable toggles, probe buttons, queue metrics, error logs
2. **Device Onboarding** — Form to add new devices/modalities (config-not-code)
3. **Legacy Connectors** — Phase 17 connector data (backward compatibility)

### Health summary bar shows: total / healthy / degraded / down / unknown

## VistA RPCs Used

| RPC                         | Context                 | Purpose                       |
| --------------------------- | ----------------------- | ----------------------------- |
| `MAG4 REMOTE PROCEDURE`     | `MAG WINDOWS`           | Patient imaging study list    |
| `RA DETAILED REPORT`        | `RA GUI LOCALONLY`      | Radiology report text         |
| `C0FHIR GET FULL BUNDLE`    | `C0FHIR CONTEXT`        | FHIR R4 bundle (C0FHIR Suite) |
| `VPR GET PATIENT DATA JSON` | `VPR APPLICATION PROXY` | VPR patient data as JSON      |

## External Tool References

| Tool                                                                 | Purpose                      | License    |
| -------------------------------------------------------------------- | ---------------------------- | ---------- |
| [Orthanc](https://www.orthanc-server.com/)                           | Open-source DICOM server     | GPLv3      |
| [OHIF](https://ohif.org/)                                            | Open-source DICOM web viewer | MIT        |
| [dcm4chee](https://www.dcm4che.org/)                                 | Enterprise DICOM archive     | Apache 2.0 |
| [WorldVistA C0FHIR](https://github.com/WorldVistA/VistA-FHIR-Server) | MUMPS-native FHIR R4         | Apache 2.0 |

## Notes

- Integration registry is in-memory per tenant; production should back with DB.
- Device onboarding creates `type: "device"` entries; no code changes needed per device.
- The verifier script (`scripts/verify-phase18-interop-imaging.ps1`) runs 120+ checks.
- Phase 14D `routes/imaging.ts` is preserved but `index.ts` now imports from `services/imaging-service.ts`.
- The imaging service plugin interface (`registerImagingPlugin`) allows custom viewer integration.
