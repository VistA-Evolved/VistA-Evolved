# Phase 22 — Imaging Platform V1 (VERIFY)

> Verification gates for Phase 22 imaging implementation

## Automated Verification

Run from repo root:

```powershell
.\scripts\verify-phase22-imaging.ps1
```

## Manual Verification Steps

### Gate 1: Docker Services

```bash
cd services/imaging
docker compose --profile imaging up -d
# Orthanc health
curl http://localhost:8042/system
# OHIF viewer
curl -s http://localhost:3003 | head -5
```

### Gate 2: API Compilation

```bash
cd apps/api
npx tsc --noEmit
```

### Gate 3: Imaging Health Endpoint

```bash
curl http://localhost:3001/imaging/health
# Should show orthanc.status = connected or disconnected
```

### Gate 4: DICOMweb Proxy (requires auth)

```bash
# Login first, then:
curl -b cookies.txt http://localhost:3001/imaging/dicom-web/studies
# Should return [] or study list from Orthanc
```

### Gate 5: VistA Imaging Status

```bash
curl -b cookies.txt http://localhost:3001/vista/imaging/status
# Should show orthanc.configured = true
```

### Gate 6: UI Build

```bash
cd apps/web
npx next build
# ImagingPanel should compile without errors
```

### Gate 7: File Integrity

- [ ] `services/imaging/docker-compose.yml` exists
- [ ] `services/imaging/orthanc.json` exists
- [ ] `services/imaging/ohif-config.js` exists
- [ ] `apps/api/src/routes/imaging-proxy.ts` exists
- [ ] `apps/web/src/components/cprs/panels/ImagingPanel.tsx` exists
- [ ] `IMAGING_CONFIG` in server-config.ts
- [ ] `imagingProxyRoutes` registered in index.ts
- [ ] `'imaging'` in VALID_TABS
- [ ] `ImagingPanel` in panels/index.ts barrel

### Gate 8: Security

- [ ] All DICOMweb proxy routes require session auth
- [ ] STOW-RS requires admin role
- [ ] Demo upload gated by IMAGING_CONFIG.enableDemoUpload
- [ ] No direct browser-to-Orthanc paths in production

### Gate 9: Audit

- [ ] `imaging.study-view` in AuditAction type
- [ ] `imaging.series-view` in AuditAction type
- [ ] `imaging.dicom-upload` in AuditAction type
- [ ] `imaging.proxy-request` in AuditAction type
