# Phase 44 Summary -- Payer Directory Engine + Jurisdiction Packs

## What Changed

### New Module: Payer Directory Engine (`apps/api/src/rcm/payerDirectory/`)
- **types.ts**: Canonical schema -- DirectoryPayer, PayerImporter interface, ImportResult, DirectoryDiffResult, EnrollmentPacket, RouteSelection, RouteNotFound
- **normalization.ts**: Full pipeline -- normalize, diff, apply to registry, enrollment CRUD, directory stats, refresh history
- **routing.ts**: Claim routing engine -- jurisdiction + payer -> best connector, with ROUTE_NOT_FOUND + remediation steps
- **importers/index.ts**: Central registry -- runAllImporters, runImportersByCountry, listImporters, getImporter

### 6 Authoritative Importers
- `ph-insurance-commission`: 28 PH payers (PhilHealth + 27 IC-registered HMOs)
- `au-apra`: 22 AU payers (Medicare AU + DVA + 20 APRA-registered private insurers)
- `us-clearinghouse`: 8 US payers (3 networks + 5 federal payers) + file-drop CSV/JSON import
- `us-availity`: Availity roster file import
- `us-officeally`: Office Ally roster file import
- `sg-nz-gateways`: 5 payers (3 SG + 2 NZ)

### Reference Source Snapshots
- `reference/payer-sources/philippines/ic-hmo-list.json` -- 27 IC HMOs
- `reference/payer-sources/australia/apra-insurers.json` -- 20 APRA insurers

### 15 New API Endpoints (added to rcm-routes.ts)
- Directory: GET stats, importers, history, payers, payers/:id; POST refresh, import/:id
- Enrollment: GET list, GET/:payerId, POST/:payerId
- Routing: POST claims/:id/route, GET routing/resolve

### 6 New Audit Actions
- directory.refreshed, directory.import_failed
- enrollment.created, enrollment.updated
- route.resolved, route.not_found

### UI: Payer Directory Tab (9th tab in RCM page)
- 4 sub-tabs: Directory Payers, Importers, Enrollment Packets, Refresh History
- Country filter (All/US/PH/AU/SG/NZ)
- Refresh Directory button

### Unit Tests
- `apps/api/tests/payer-directory.test.ts` -- importers, normalization, diff, routing, enrollment, end-to-end refresh

## How to Test Manually

```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Check directory stats
curl -s http://localhost:3001/rcm/directory/stats | jq .

# 3. List directory payers
curl -s http://localhost:3001/rcm/directory/payers | jq .

# 4. Filter by country
curl -s "http://localhost:3001/rcm/directory/payers?country=PH" | jq .

# 5. List importers
curl -s http://localhost:3001/rcm/directory/importers | jq .

# 6. Refresh directory
curl -s http://localhost:3001/rcm/directory/refresh -X POST -H "Content-Type: application/json" -d "{}" | jq .

# 7. Resolve a route
curl -s "http://localhost:3001/rcm/routing/resolve?payerId=PH-PHILHEALTH&jurisdiction=PH" | jq .

# 8. Create enrollment packet
curl -s http://localhost:3001/rcm/enrollment/PH-PHILHEALTH -X POST -H "Content-Type: application/json" -d '{"orgIdentifiers":{"npi":"123"},"enrollmentStatus":"NOT_STARTED"}' | jq .

# 9. Run unit tests
cd apps/api && pnpm exec vitest run tests/payer-directory.test.ts
```

## Follow-ups
- Production importer automation (scheduled directory refresh)
- OPA policy integration for directory admin access
- Real clearinghouse roster file parsing (Availity 271 response)
- Directory payer -> VistA Insurance Company file mapping
