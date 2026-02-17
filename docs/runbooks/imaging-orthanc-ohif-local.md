# Imaging — Orthanc + OHIF Local Setup

> Phase 22 runbook: Local imaging stack with DICOM server + web viewer

## Prerequisites

- Docker Desktop running
- VistA-Evolved repo cloned
- API server running on port 3001

## Quick Start

### 1. Start Imaging Services

```powershell
cd services\imaging
docker compose --profile imaging up -d
```

This starts:
- **Orthanc** on port 8042 (HTTP/DICOMweb) and 4242 (DICOM C-STORE)
- **OHIF Viewer** on port 3003

### 2. Verify Services

```powershell
# Check Orthanc
curl.exe http://localhost:8042/system
# Should return: {"ApiVersion":"...","Version":"25.12.3",...}

# Check OHIF
curl.exe -s http://localhost:3003 | Select-String "<title>"
# Should return OHIF Viewer HTML
```

### 3. Upload Demo DICOM Data

```powershell
# Upload a single DICOM file
curl.exe -X POST http://localhost:8042/instances `
  -H "Content-Type: application/dicom" `
  --data-binary "@path/to/sample.dcm"

# Or use Orthanc's web UI at http://localhost:8042/app/explorer.html
# Click "Upload" and drag-drop DICOM files

# Verify upload
curl.exe http://localhost:8042/studies
```

### 4. API Integration

With the API server running (`npx tsx --env-file=.env.local src/index.ts`):

```powershell
# Check imaging health
curl.exe http://localhost:3001/imaging/health

# List studies via DICOMweb proxy (requires auth session)
curl.exe -b cookies.txt http://localhost:3001/imaging/dicom-web/studies

# Get patient studies (VistA + Orthanc merged)
curl.exe -b cookies.txt "http://localhost:3001/vista/imaging/studies?dfn=1"
```

### 5. OHIF Viewer

- Direct: http://localhost:3003
- Via API: `GET /imaging/viewer?studyUid=<StudyInstanceUID>` returns URL
- In CPRS: Click "Open in OHIF Viewer" from the Imaging tab

## Architecture

```
Browser (CPRS Imaging Tab)
    │
    ├── /imaging/dicom-web/*  ────→  API Proxy  ────→  Orthanc (8042)
    │   (session-gated DICOMweb)
    │
    ├── /vista/imaging/studies ───→  VistA MAG4 RPCs
    │                                  └── fallback → Orthanc QIDO-RS
    │
    └── OHIF Viewer (iframe)   ───→  Orthanc DICOMweb (direct for dev)
```

## Configuration

### Environment Variables (apps/api/.env.local)

```bash
# Orthanc connection (defaults work for local Docker)
ORTHANC_URL=http://localhost:8042
OHIF_URL=http://localhost:3003
ORTHANC_DICOMWEB_ROOT=/dicom-web

# Proxy settings
IMAGING_PROXY_TIMEOUT_MS=30000
IMAGING_QIDO_CACHE_TTL_MS=30000

# Demo upload (auto-enabled in non-production)
IMAGING_ENABLE_DEMO_UPLOAD=true
IMAGING_MAX_UPLOAD_BYTES=536870912
```

### Orthanc Config

Edit `services/imaging/orthanc.json` for:
- AE title (default: `VISTAEVOLVED`)
- DICOM port (default: 4242)
- DICOMweb root path (default: `/dicom-web/`)
- Storage location

### OHIF Config

Edit `services/imaging/ohif-config.js` for:
- DICOMweb data source URLs
- Viewer features/modes

## Stopping Services

```powershell
cd services\imaging
docker compose --profile imaging down

# To also remove persistent data:
docker compose --profile imaging down -v
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Port 8042 refused | Orthanc not running | `docker compose --profile imaging up -d` |
| OHIF shows no studies | No DICOM data uploaded | Upload test data via Orthanc UI |
| 502 from proxy | Orthanc container down | Check `docker ps`, restart if needed |
| 504 from proxy | Orthanc slow to respond | Increase `IMAGING_PROXY_TIMEOUT_MS` |
| CORS errors in OHIF | Config mismatch | Check `ohif-config.js` data source URLs |

## Security Notes

- **Development**: Orthanc ports (8042, 4242) are exposed on localhost
- **Production**: Orthanc should NOT be directly accessible from browsers
  - All DICOMweb goes through the API proxy (`/imaging/dicom-web/*`)
  - API enforces session auth on every request
  - STOW-RS (upload) requires admin role
  - Demo upload endpoint is disabled when `NODE_ENV=production`
