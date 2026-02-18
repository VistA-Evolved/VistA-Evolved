# 25-01 — Phase 23: Imaging Workflow — IMPLEMENT

## User Request
Phase 23 — Imaging Workflow V2 (VistA-first radiology workflow scaffolding).
Turn Phase 22 into a clinically realistic Order→Acquire→View imaging workflow.

## Implementation Steps

### A) Worklist Service
- `apps/api/src/services/imaging-worklist.ts` — Fastify plugin with:
  - GET /imaging/worklist — filterable by facility, modality, date, status
  - POST /imaging/worklist/orders — create imaging order (worklist item)
  - GET /imaging/worklist/:id — single worklist item detail
  - PATCH /imaging/worklist/:id/status — update item status
- In-memory store (sidecar) labeled "prototype order source"
- VistA RPC stubs for ORWDXR migration path

### B) Ingest Reconciliation
- `services/imaging/on-stable-study.lua` — Orthanc Lua callback
- `apps/api/src/services/imaging-ingest.ts` — Fastify plugin:
  - POST /imaging/ingest/callback — Orthanc OnStableStudy webhook
  - GET /imaging/ingest/unmatched — quarantine queue
  - POST /imaging/ingest/unmatched/:id/link — manual reconciliation
- Service auth via X-Service-Key header
- Accession/PatientID reconciliation logic

### C) Chart Integration
- Enhance ImagingPanel.tsx: order grouping, unmatched banner
- Enhance imaging-service.ts: order-linked study queries
- Order detail view with "View Images" link

### D) VistA-First Linking
- MAG RPC capability probes
- Stub functions for VistA #2005 metadata linking
- imaging-grounding.md update

### E) Audit Events
- New AuditAction literals for Phase 23
- Audit calls in all new endpoints

### F) Security
- Service auth (X-Service-Key) for ingest callbacks
- AUTH_RULES update for /imaging/ingest/*

### G) Config + Orthanc
- IMAGING_CONFIG additions: webhookSecret, worklistPollIntervalMs
- orthanc.json: LuaScripts + OnStableStudy handler
- Orthanc AE Title config templates

### H) Runbooks
- imaging-worklist.md
- imaging-ingest-reconciliation.md
- imaging-device-onboarding.md

## Files to Create/Modify
### New files:
- apps/api/src/services/imaging-worklist.ts
- apps/api/src/services/imaging-ingest.ts
- services/imaging/on-stable-study.lua
- services/imaging/ae-title-template.json
- docs/runbooks/imaging-worklist.md
- docs/runbooks/imaging-ingest-reconciliation.md
- docs/runbooks/imaging-device-onboarding.md
- docs/runbooks/imaging-grounding.md
- prompts/25-PHASE-23-IMAGING-WORKFLOW/25-01-imaging-workflow-IMPLEMENT.md
- prompts/25-PHASE-23-IMAGING-WORKFLOW/25-99-imaging-workflow-VERIFY.md

### Modified files:
- apps/api/src/index.ts — register new plugins
- apps/api/src/middleware/security.ts — service auth
- apps/api/src/config/server-config.ts — new config
- apps/api/src/lib/audit.ts — new audit actions
- apps/api/src/services/imaging-service.ts — order linkage
- services/imaging/orthanc.json — Lua callback
- services/imaging/docker-compose.yml — volume mount for Lua
- apps/web/src/components/cprs/panels/ImagingPanel.tsx — V2 UI
- AGENTS.md — new gotchas
- docs/BUG-TRACKER.md — if needed
