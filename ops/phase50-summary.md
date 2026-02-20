# Phase 50 Summary — Data Portability + Migration Toolkit

## What Changed

### New module: `migration` (13 modules total)
Full data portability and migration toolkit with import/export pipelines,
pluggable mapping DSL, CSV/FHIR connectors, and PHI-safe encrypted exports.

### Backend (6 new files)
- `apps/api/src/migration/types.ts` — Domain types (13-state FSM, 14 transforms, 6 entity types)
- `apps/api/src/migration/mapping-engine.ts` — CSV parser, 14 transform functions, field validation
- `apps/api/src/migration/migration-store.ts` — In-memory job/template/rollback stores (sandbox)
- `apps/api/src/migration/import-pipeline.ts` — Validate → dry-run → import orchestration
- `apps/api/src/migration/export-pipeline.ts` — Patient summary/audit/clinical bundles, AES-256-GCM encryption
- `apps/api/src/migration/templates.ts` — 8 built-in mapping templates
- `apps/api/src/migration/migration-routes.ts` — 16 REST endpoints under /migration/*

### Frontend (1 new page)
- `apps/web/src/app/cprs/admin/migration/page.tsx` — Admin migration console (4 tabs)

### Wiring
- `apps/api/src/auth/rbac.ts` — Added migration:read/write/admin permissions (admin role)
- `apps/api/src/middleware/security.ts` — Added /migration/ AUTH_RULE
- `apps/api/src/lib/immutable-audit.ts` — Added 10 migration audit actions
- `apps/api/src/index.ts` — Import + register migrationRoutes
- `config/modules.json` — Added "migration" module definition
- `config/skus.json` — Added "migration" to FULL_SUITE
- `config/capabilities.json` — Added 8 migration.* capabilities

### Documentation
- `docs/migration/migration-toolkit.md` — Architecture, API reference, PHI safety
- `docs/migration/source-connectors.md` — Connector docs + custom connector guide

## How to Test Manually

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Login to get session cookie
curl -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' \
  -c cookies.txt

# 3. Health check
curl -b cookies.txt http://127.0.0.1:3001/migration/health

# 4. List templates (should see 8)
curl -b cookies.txt http://127.0.0.1:3001/migration/templates

# 5. Create import job
curl -X POST -b cookies.txt http://127.0.0.1:3001/migration/jobs/import \
  -H 'Content-Type: application/json' \
  -d '{"entityType":"patient","sourceFormat":"generic-csv","templateId":"generic-csv-patient","rawData":"first_name,last_name,dob,ssn_last4,sex\nJohn,Doe,1990-01-15,1234,M"}'

# 6. Validate → dry-run → import
curl -X POST -b cookies.txt http://127.0.0.1:3001/migration/jobs/<jobId>/validate
curl -X POST -b cookies.txt http://127.0.0.1:3001/migration/jobs/<jobId>/dry-run
curl -X POST -b cookies.txt http://127.0.0.1:3001/migration/jobs/<jobId>/run

# 7. Create export job
curl -X POST -b cookies.txt http://127.0.0.1:3001/migration/jobs/export \
  -H 'Content-Type: application/json' \
  -d '{"bundleType":"patient-summary","options":{"dfn":"3"}}'
```

## Verifier Output
- `tsc --noEmit`: CLEAN (0 errors)
- `vitest run`: 170/184 pass (14 pre-existing integration test failures, no regressions)

## Follow-ups
- FHIR R4 JSON import connector (currently placeholder)
- C-CDA / HL7v2 / Epic / Cerner connectors
- VistA-native import (write to VistA globals via RPCs)
- Production persistence (replace in-memory store)
- Streaming import for large files
- Migration progress WebSocket
