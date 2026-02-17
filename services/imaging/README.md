# Imaging Services — Phase 22

Local Docker stack for medical imaging:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **Orthanc** | `orthancteam/orthanc:24.12.1` | 8042 (HTTP), 4242 (DICOM) | DICOM server, DICOMweb API |
| **OHIF Viewer** | `ohif/app:v3.9.2` | 3003 | Web-based DICOM viewer |

## Quick Start

```bash
cd services/imaging
docker compose --profile imaging up -d
```

## Architecture

- Orthanc receives DICOM images via C-STORE (port 4242)
- Orthanc serves DICOMweb API (QIDO-RS, WADO-RS, STOW-RS) on port 8042
- OHIF viewer displays images using DICOMweb from Orthanc
- **API server proxies** all DICOMweb requests (browser never talks to Orthanc directly)

## Loading Demo Data

Use the Orthanc REST API to upload DICOM files:

```bash
# Upload a DICOM file
curl -X POST http://localhost:8042/instances -H "Content-Type: application/dicom" --data-binary @sample.dcm

# Check uploaded studies
curl http://localhost:8042/studies
```

## Configuration Files

- `orthanc.json` — Orthanc server config (DICOMweb enabled, AE title, storage)
- `ohif-config.js` — OHIF viewer config (DICOMweb data source pointing to Orthanc)

## Volumes

- `orthanc-data` — Persists DICOM data across restarts. Use `docker compose down -v` to reset.
