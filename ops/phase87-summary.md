# Phase 87 VERIFY -- Philippines RCM Foundation (PayerOps core)

## What changed (VERIFY pass)

### Bugs fixed
1. **Encryption health check always truthy (CRITICAL)** --
   `testEncryptionHealth()` returns `{ ok: boolean; error?: string }` (an object),
   but `payerops-routes.ts` line 103 used it as a bare truthy check. Objects are
   always truthy in JS, so `encryption` field always showed `"healthy"` even when
   encryption was broken. Fixed: use `.ok` property.

2. **Duplicate LOA transitions map** --
   `LOA_TRANSITIONS` was exported from `types.ts` but unused; `store.ts` had its
   own identical `LOA_VALID_TRANSITIONS` local constant. Consolidated: store.ts
   now imports `LOA_TRANSITIONS` from types.ts, removing the duplicate.

3. **Route registration order (defensive)** --
   `GET /rcm/payerops/credentials/expiring` (static) was registered AFTER
   `GET /rcm/payerops/credentials/:id` (parametric). Fastify's find-my-way
   handles this correctly, but reordered for clarity and defensiveness.

### Verification results
- TypeScript compilation: API clean, Web clean (before and after fixes)
- Secret scan: No hardcoded credentials in PayerOps files
- console.log audit: Zero occurrences in PayerOps module
- Prompt discipline: folder 93-PHASE-87-PH-RCM has 93-01-IMPLEMENT.md + 93-99-VERIFY.md
- Runbook: docs/runbooks/philippines-rcm-foundation.md exists
- Route wiring: payerOpsRoutes registered in index.ts, nav link in layout.tsx
- Admin layout: PayerOps link gated to moduleId 'rcm'

## How to test manually
```bash
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Health check -- should show encryption: "healthy"
curl http://127.0.0.1:3001/rcm/payerops/health

# Create enrollment
curl -X POST http://127.0.0.1:3001/rcm/payerops/enrollments \
  -H "Content-Type: application/json" \
  -d '{"facilityId":"f1","facilityName":"Test","payerId":"p1","payerName":"PhilHealth"}'

# Create LOA, attempt invalid transition
curl -X POST http://127.0.0.1:3001/rcm/payerops/loa \
  -H "Content-Type: application/json" \
  -d '{"facilityId":"f1","patientDfn":"3","payerId":"p1","payerName":"PhilHealth","requestType":"initial_loa"}'

# Credentials CRUD
curl -X POST http://127.0.0.1:3001/rcm/payerops/credentials \
  -H "Content-Type: application/json" \
  -d '{"facilityId":"f1","docType":"philhealth_accreditation","title":"Test","fileName":"test.pdf"}'

curl http://127.0.0.1:3001/rcm/payerops/credentials/expiring?days=90
```

## Follow-ups
- Gate 2 live test (requires running API + Docker)
- Gate 8 feature flag test (requires toggling RCM module off)
- Gate 9 full UI test (requires running Next.js dev server)
