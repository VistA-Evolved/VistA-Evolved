# Phase 97B — PH HMO Deepening Pack v2 Runbook

## Overview

Phase 97B deepens PH HMO coverage from top-5 portal-capable HMOs to ALL 27
Insurance Commission-licensed HMOs, adding:

- **Payer type classification** (L1/L3) across all 27 HMOs
- **Expanded capability matrix** (17 operational keys, up from 7)
- **HMO adapter manifest** (diagnostic view of all 27 HMOs)
- **Per-HMO LOA templates** (required fields, specialty rules, turnaround estimates)
- **Per-HMO claim packet config** (VistA-first field annotations, filing deadlines)
- **Contracting hub** (task management leveraging existing SQLite payerTask table)
- **PH market dashboard** (summary of integration status, capability coverage)
- **QA flows** (2 new: hmo-adapter-manifest, contracting-hub)

## Architecture

```
Phase 97B additions:

apps/api/src/rcm/hmo-portal/
  adapter-manifest.ts     — HMO manifest generator (all 27 IC HMOs)
  loa-templates.ts        — Per-HMO LOA template configurations
  claim-packet-config.ts  — Per-HMO claim packet configs + VistA annotations
  contracting-hub.ts      — Contracting task management (wraps payerTask DB)
  market-dashboard.ts     — PH market summary aggregator
  phase97b-routes.ts      — Phase 97B API routes (15 endpoints)

apps/web/src/app/cprs/admin/
  ph-market/page.tsx       — PH market dashboard UI (3 tabs)
  contracting-hub/page.tsx — Contracting hub UI (payer list + task management)

config/qa-flows/
  16-hmo-adapter-manifest.json — QA flow (9 steps)
  17-contracting-hub.json      — QA flow (3 steps)
```

## New API Endpoints

| Method | Path                                                   | Description                             |
| ------ | ------------------------------------------------------ | --------------------------------------- |
| GET    | `/rcm/hmo/manifest`                                    | Full HMO adapter manifest (all 27 HMOs) |
| GET    | `/rcm/hmo/manifest/:payerId`                           | Single HMO manifest entry               |
| GET    | `/rcm/hmo/loa-templates`                               | All LOA template configurations         |
| GET    | `/rcm/hmo/loa-templates/:payerId`                      | Single HMO LOA template                 |
| GET    | `/rcm/hmo/loa-templates/:payerId/specialty/:specialty` | Specialty-specific LOA fields           |
| GET    | `/rcm/hmo/claim-configs`                               | All claim packet configurations         |
| GET    | `/rcm/hmo/claim-configs/:payerId`                      | Single HMO claim config                 |
| GET    | `/rcm/hmo/claim-configs/:payerId/vista-annotations`    | VistA field annotations                 |
| GET    | `/rcm/hmo/contracting`                                 | Contracting dashboard (all payers)      |
| GET    | `/rcm/hmo/contracting/:payerId`                        | Single payer contracting summary        |
| POST   | `/rcm/hmo/contracting/:payerId/init`                   | Initialize standard contracting tasks   |
| PATCH  | `/rcm/hmo/contracting/tasks/:taskId`                   | Update task status                      |
| GET    | `/rcm/hmo/contracting/tasks/:taskId`                   | Get single task                         |
| GET    | `/rcm/hmo/market-summary`                              | PH market summary dashboard             |

## Manual Testing

```bash
# 1. Start the API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Get manifest
curl -s http://127.0.0.1:3001/rcm/hmo/manifest | jq '.manifest.totalHmos'
# Expected: 27

# 3. Get Maxicare manifest entry
curl -s http://127.0.0.1:3001/rcm/hmo/manifest/PH-MAXICARE | jq '.entry.adapterStatus'
# Expected: "portal_adapter_available"

# 4. Get LOA templates
curl -s http://127.0.0.1:3001/rcm/hmo/loa-templates | jq '.count'
# Expected: 27

# 5. Get claim configs
curl -s http://127.0.0.1:3001/rcm/hmo/claim-configs | jq '.count'
# Expected: 27

# 6. Get market summary
curl -s http://127.0.0.1:3001/rcm/hmo/market-summary | jq '.summary.totalHmos'
# Expected: 27

# 7. Initialize contracting tasks
curl -s -X POST http://127.0.0.1:3001/rcm/hmo/contracting/PH-MAXICARE/init \
  -H "Content-Type: application/json" -d '{"actor":"admin"}' | jq
# Expected: { "ok": true, "created": 10, "skipped": 0 }

# 8. Get contracting dashboard
curl -s http://127.0.0.1:3001/rcm/hmo/contracting | jq '.dashboard.totalTasks'
```

## Key Design Decisions

1. **Payer type classification**: L1 = large HMOs with known portals (8 HMOs),
   L3 = smaller/regional (19 HMOs). Classification based on IC evidence +
   portal availability.

2. **Contracting hub uses existing DB**: Leverages Phase 95B `payerTask` table.
   No new DB tables needed. Standard templates auto-generated per payer type.

3. **LOA templates are config, not clinical**: Templates define what payers
   NEED, not clinical data. VistA remains source of truth for clinical fields.

4. **VistA-first annotations**: Every field that should come from VistA has
   a `vistaStatus` flag (available / integration_pending / empty_in_sandbox).

5. **No credential storage**: Consistent with Phase 97 — all portal interactions
   use manual-assisted mode with deep links and instructions.

## Dependencies

- Phase 95B (platform persistence) — SQLite DB for contracting tasks
- Phase 94 (PH HMO workflow) — LOA types and store
- Phase 97 (HMO portal adapter) — portal adapter registry and ManualAssistedAdapter
- Phase 93 (PH HMO registry) — enriched HMO data from ph-hmo-registry.json
