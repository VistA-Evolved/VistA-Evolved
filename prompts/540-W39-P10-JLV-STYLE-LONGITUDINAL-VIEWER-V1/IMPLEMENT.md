# Phase 540 — JLV-style Longitudinal Viewer v1 (IMPLEMENT)

Wave 39 P10. Build a longitudinal clinical viewer that aggregates
existing VistA data endpoints into a unified, chronological timeline.

## Context

18 live clinical READ endpoints exist. CoverSheetPanel demonstrates
the aggregation pattern via DataCacheProvider. Remote Data Viewer
scaffolds cross-facility data. JLV surfaces at 0-17% in gap report.

## Deliverables

### 1. Aggregation API route

File: `apps/api/src/routes/longitudinal/index.ts`

Endpoints:

- `GET /vista/longitudinal/timeline?dfn=N` — chronological event stream
  from allergies, problems, vitals, notes, meds, labs, consults, surgery
- `GET /vista/longitudinal/summary?dfn=N` — domain-level summary counts
- `GET /vista/longitudinal/meds-summary?dfn=N` — medication-focused
  longitudinal view with active/discontinued/pending groups

All endpoints call existing VistA RPCs via the existing inline routes
pattern (safeCallRpc or adapter). No new VistA RPCs needed.

### 2. LongitudinalPanel.tsx

File: `apps/web/src/components/cprs/panels/LongitudinalPanel.tsx`

Three sections:

- **Timeline** — sorted event list with domain badges (allergy, lab, med, etc.)
- **Domain Summary** — count cards per domain
- **Medication Longitudinal** — active vs historical meds view

### 3. Capabilities

- clinical.longitudinal.timeline (live)
- clinical.longitudinal.summary (live)
- clinical.longitudinal.meds (live)

### 4. Gap report updates

- jlv-timeline: not-started -> scaffold 50%
- jlv-meds-summary: not-started -> scaffold 50%
- jlv-labs-aggregate: not-started -> scaffold 33%

### 5. Wiring

- register-routes.ts: import + register
- config/modules.json: add route pattern
- panels/index.ts: export LongitudinalPanel
- store-policy.ts: 2 entries (timeline-cache, summary-cache)

## Files touched

- apps/api/src/routes/longitudinal/index.ts (new)
- apps/web/src/components/cprs/panels/LongitudinalPanel.tsx (new)
- apps/api/src/server/register-routes.ts
- apps/web/src/components/cprs/panels/index.ts
- config/capabilities.json
- config/modules.json
- data/ui-estate/ui-gap-report.json
- apps/api/src/platform/store-policy.ts
