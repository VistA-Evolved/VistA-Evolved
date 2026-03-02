# Phase 538 — VERIFY — Imaging Capture + Attach (SIC-like)

## Gates (12)

| # | Gate | Check |
|---|------|-------|
| G1 | Route file exists | `imaging-capture/index.ts` present |
| G2 | POST /imaging/capture route | Upload endpoint in route file |
| G3 | GET /imaging/capture list route | List endpoint present |
| G4 | POST /imaging/capture/:id/link route | Link endpoint present |
| G5 | CaptureAttachment interface | Type defined with required fields |
| G6 | integration-pending for VistA writeback | MAG4 ADD IMAGE pending pattern |
| G7 | rpcRegistry has MAG capture RPCs | At least 2 MAG RPCs added |
| G8 | capabilities.json entries | imaging.capture.* capabilities |
| G9 | ImagingPanel.tsx has capture tab | 'capture' in tab union |
| G10 | store-policy entry | imaging-capture-store in store-policy |
| G11 | register-routes.ts wired | Import + register |
| G12 | No PHI in route | No hardcoded patient data |
