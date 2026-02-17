# Phase 22 — Imaging Platform V1 (IMPLEMENT)

> VistA-first, enterprise-grade imaging with Orthanc + OHIF

## User Request

Implement Phase 22 — Imaging Platform V1 with:
- Docker services (Orthanc DICOM server + OHIF Viewer)
- DICOMweb proxy in API (session-gated, no direct browser→Orthanc)
- Enhanced imaging domain endpoints (VistA-first, Orthanc fallback)
- UI integration (CPRS Imaging tab with study list + OHIF viewer)
- Compliance-grade audit logging for all imaging access
- Config, runbooks, verification script

## Implementation Steps

### A. Docker Services
1. Create `services/imaging/docker-compose.yml` (Orthanc + OHIF, `--profile imaging`)
2. Create `services/imaging/orthanc.json` (DICOMweb enabled, AE title, storage)
3. Create `services/imaging/ohif-config.js` (data source pointing to Orthanc)
4. Create `services/imaging/README.md`

### B. API — DICOMweb Proxy
1. Add `IMAGING_CONFIG` to `apps/api/src/config/server-config.ts`
2. Create `apps/api/src/routes/imaging-proxy.ts` with proxied DICOMweb routes
3. Register in `apps/api/src/index.ts`
4. Routes: QIDO-RS, WADO-RS, STOW-RS (admin), demo upload, viewer URL, health

### C. API — Imaging Domain Enhancements
1. Enhance `apps/api/src/services/imaging-service.ts`:
   - Status endpoint: include Orthanc/OHIF config info
   - Studies endpoint: add Orthanc QIDO-RS as source between VistA and registry
   - Viewer URL: default to OHIF from IMAGING_CONFIG when no registry entries
   - Metadata: fallback to Orthanc when no registry DICOMweb

### D. Audit Logging
1. Add new audit actions: `imaging.study-view`, `imaging.series-view`,
   `imaging.dicom-upload`, `imaging.proxy-request`, `imaging.orthanc-health`

### E. UI — Imaging Tab
1. Create `ImagingPanel.tsx` — study list, modality filters, OHIF viewer modal
2. Add to barrel export `panels/index.ts`
3. Add 'imaging' to VALID_TABS in page.tsx
4. Add case in TabContent switch
5. Add to modern sidebar nav

### F. Docs & Verification
1. Prompt file: `24-PHASE-22-IMAGING-PLATFORM/24-01-imaging-platform-IMPLEMENT.md`
2. Verify prompt: `24-PHASE-22-IMAGING-PLATFORM/24-99-imaging-platform-VERIFY.md`
3. Runbook: `docs/runbooks/imaging-orthanc-ohif-local.md`
4. Verification script: `scripts/verify-phase22-imaging.ps1`

## Verification Steps

1. `docker compose --profile imaging up -d` starts Orthanc + OHIF
2. `curl http://localhost:8042/system` returns Orthanc version info
3. `curl http://localhost:3003` returns OHIF viewer HTML
4. API compiles with `tsc --noEmit`
5. `/imaging/health` returns Orthanc connection status
6. `/imaging/dicom-web/studies` proxies to Orthanc
7. `/vista/imaging/status` shows Orthanc cfg info
8. Web compiles with Next.js build 
9. Imaging tab visible in CPRS sidebar

## Files Touched

### Created
- `services/imaging/docker-compose.yml`
- `services/imaging/orthanc.json`
- `services/imaging/ohif-config.js`
- `services/imaging/README.md`
- `apps/api/src/routes/imaging-proxy.ts`
- `apps/web/src/components/cprs/panels/ImagingPanel.tsx`
- `prompts/24-PHASE-22-IMAGING-PLATFORM/24-01-imaging-platform-IMPLEMENT.md`
- `prompts/24-PHASE-22-IMAGING-PLATFORM/24-99-imaging-platform-VERIFY.md`
- `docs/runbooks/imaging-orthanc-ohif-local.md`
- `scripts/verify-phase22-imaging.ps1`

### Modified
- `apps/api/src/config/server-config.ts` — added IMAGING_CONFIG
- `apps/api/src/index.ts` — registered imagingProxyRoutes
- `apps/api/src/services/imaging-service.ts` — Orthanc-aware enhancements
- `apps/api/src/lib/audit.ts` — new imaging audit actions
- `apps/web/src/components/cprs/panels/index.ts` — ImagingPanel export
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — imaging tab wiring
