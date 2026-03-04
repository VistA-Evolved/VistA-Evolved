# Phase 38 -- RCM + Payer Connectivity Platform (VERIFY)

## Verification Scope

This verification proves the Phase 38 RCM Gateway is correct, secure, and
not pretending. It covers 6 categories across 158 automated gates:

### Part A -- Static Analysis (95 gates)

- Domain model files, exports, interfaces
- Payer registry + JSON seed data validation (US + PH)
- EDI types + pipeline exports
- Validation engine rules (5 categories)
- Connectors (4 types + registry)
- RCM audit hash chain + PHI sanitization
- Route plugin wiring + security AUTH_RULE
- Config (capabilities.json + modules.json)
- UI module existence + tab structure
- Documentation (6 files)
- AGENTS.md gotchas (83-88) + architecture section (7g)
- Code quality (zero console.log)
- Prompt file existence

### Part B -- Live API Tests (30+ gates)

- POST /auth/login
- GET /rcm/payers (non-empty, US, PH, total >= 27)
- POST /rcm/claims/draft (stable schema)
- POST /rcm/claims/:id/validate (edits array, readinessScore)
- POST /rcm/claims/:id/submit (state transition + audit event)
- POST /rcm/claims/:id/transition
- POST /rcm/remittances/import (mock payload)
- GET /rcm/remittances
- GET /rcm/health (subsystem info)
- GET /rcm/connectors + /connectors/health
- GET /rcm/validation/rules
- GET /rcm/claims/stats
- GET /rcm/edi/pipeline
- GET /rcm/audit/verify (chain integrity)
- GET /rcm/claims/:id/timeline
- Unauthenticated 401 enforcement

### Part C -- Security & PHI Scan (9 gates)

- No hardcoded credentials in RCM code
- No hardcoded passwords/secrets
- No SSN patterns
- PHI sanitization: SSN regex, patient name, DOB
- Zero console.log
- Rate limiter covers /rcm
- No database driver imports

### Part D -- UI Dead-Click Audit (10 gates)

- Tab buttons have onClick handlers
- Refresh button with handler
- Search + country filter with onChange
- Fetches all 4 RCM endpoints
- credentials:include on all fetches
- No TODO/FIXME/HACK comments

### Part E -- VistA-First Enforcement (8 gates)

- No SQL INSERT/UPDATE/DELETE
- Map-based persistence only
- vistaChargeIen + vistaArIen grounding fields
- Migration plan documented
- VistA IB + AR file references
- No hidden file persistence (fs.writeFile)

### Part F -- Prompts Ordering Integrity (6 gates)

- No duplicate prefix numbers
- No gaps in sequence
- Phase 38 prompt directory + IMPLEMENT file
- H1 headers match phase numbers
- Phase 37C naming convention check

## How to Run

```powershell
# Static only (no API needed):
powershell -ExecutionPolicy Bypass -File scripts\verify-phase38-rcm.ps1

# Full (API must be running on :3001):
cd apps/api
$env:DEPLOY_SKU="FULL_SUITE"
npx tsx --env-file=.env.local src/index.ts
# In another terminal:
powershell -ExecutionPolicy Bypass -File scripts\verify-phase38-rcm.ps1
```

## Result

158/158 PASS, 0 FAIL.
