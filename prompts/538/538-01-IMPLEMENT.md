# Phase 538 — Imaging Capture + Attach (SIC-like)

## Wave 39, P8

### Goal
Browser-based image capture and attachment to patient VistA records
(notes, consults, orders). Mirrors VA SIC (Scanned Image Capture) workflow.

### Implementation

1. **Route Module** -- `apps/api/src/routes/imaging-capture/index.ts`
   - POST /imaging/capture -- Upload image file, store to Orthanc, create attachment record
   - GET  /imaging/capture?dfn=N -- List capture attachments for patient
   - GET  /imaging/capture/:id -- Detail of a capture attachment
   - POST /imaging/capture/:id/link -- Link attachment to VistA note/consult/order
   - All VistA writeback uses integration-pending (MAG4 ADD IMAGE not wired)

2. **Data Model** -- CaptureAttachment interface
   - id, dfn, capturedByDuz, capturedAt, mimeType, originalFilename
   - orthancId, studyInstanceUid (from Orthanc response)
   - attachedToType (note|consult|order|none), attachedToId
   - vistaImageIen (future: ^MAG(2005) IEN)
   - status (captured|attached|filed)

3. **RPC Registry** -- Add MAG capture RPCs (3)
   - MAG4 ADD IMAGE, MAG NEW SO ENTRY, MAG4 IMAGE

4. **Capabilities** -- imaging.capture.upload, imaging.capture.attach, imaging.capture.list

5. **Panel** -- Add 'capture' tab to ImagingPanel.tsx
   - File input with accept="image/*,application/pdf"
   - Capture form (patient DFN, attach type, notes)
   - Capture history list

6. **Store Policy** -- imaging-capture-store entry

7. **Register Routes** -- Wire in register-routes.ts

### Files Touched
- apps/api/src/routes/imaging-capture/index.ts (NEW)
- apps/api/src/server/register-routes.ts
- apps/api/src/vista/rpcRegistry.ts
- apps/api/src/platform/store-policy.ts
- apps/web/src/components/cprs/panels/ImagingPanel.tsx
- config/capabilities.json
