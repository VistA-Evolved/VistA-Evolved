# Phase 97 — VERIFY: HMO Portal Adapter (LOA + Claim Packet + Portal Interface)

## Verification Gates

### Gate 1: TypeScript Compilation

- `pnpm -C apps/api exec tsc --noEmit` → 0 errors
- `pnpm -C apps/web exec tsc --noEmit` → 0 errors

### Gate 2: Golden-Path LOA Flow

- POST `/rcm/hmo-portal/loa/build` with valid LoaRequest → returns `{ok:true, packet}`
- POST `/rcm/hmo-portal/loa/export` with packetId → returns `{ok:true, exports}`
- POST `/rcm/hmo-portal/loa/submit` with packetId → returns `{ok:true, submissionId, result}`
- Submission record has status `loa_pending`
- PUT `/rcm/hmo-portal/submissions/:id/status` to `loa_approved` → ok

### Gate 3: Golden-Path Claim Flow

- POST `/rcm/hmo-portal/claims/build` with valid Claim → returns `{ok:true, packet}`
- POST `/rcm/hmo-portal/claims/export` with packetId → returns `{ok:true, export}`
- POST `/rcm/hmo-portal/claims/submit` with packetId → returns `{ok:true, submissionId, result}`
- Submission record has status `claim_exported`

### Gate 4: Adapter Registration

- GET `/rcm/hmo-portal/adapters` → returns 5 adapters
- Each adapter has payerId in PORTAL_CAPABLE_HMOS
- GET `/rcm/hmo-portal/adapters/:payerId/health` for each → healthy:true

### Gate 5: Submission Lifecycle

- GET `/rcm/hmo-portal/submissions` → returns list
- GET `/rcm/hmo-portal/submissions/stats` → returns all 12 status keys
- POST `/rcm/hmo-portal/submissions/:id/note` → adds note
- GET `/rcm/hmo-portal/submissions/:id` → timeline + notes present

### Gate 6: Specialty Templates

- GET `/rcm/hmo-portal/specialties` → returns 16 templates
- Each has specialty, requiredFields, recommendedAttachments

### Gate 7: Error Handling

- POST `/rcm/hmo-portal/loa/build` with empty body → 400
- POST `/rcm/hmo-portal/loa/submit` with invalid packetId → 404
- POST `/rcm/hmo-portal/claims/build` with missing claim → 400
- PUT `/rcm/hmo-portal/submissions/:id/status` invalid transition → 400

### Gate 8: Security / PHI Scan

- No `console.log` in Phase 97 files
- No hardcoded credentials (PROV123, etc.)
- No patient PHI in instructions or export filenames
- VaultRef pattern — no credential storage

### Gate 9: Dead-Click Sweep

- All 5 tabs in UI page render without error
- All API calls use `credentials: 'include'`
- No unused imports/exports in Phase 97 files

### Gate 10: Regression Check

- Existing RCM routes still reachable (Phase 38/94/96)
- Auth rules catch-all covers `/rcm/hmo-portal/*`
- Nav layout entry added correctly
- No duplicate route prefixes

## Files Touched

- `apps/api/src/rcm/hmo-portal/types.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/loa-engine.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/submission-tracker.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/portal-adapter.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/index.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/maxicare.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/medicard.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/intellicare.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/philcare.ts` (NEW)
- `apps/api/src/rcm/hmo-portal/adapters/valucare.ts` (NEW)
- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx` (NEW)
- `apps/api/src/index.ts` (MODIFIED — import + register)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED — nav entry)
- `prompts/101-PHASE-97-HMO-PORTAL-ADAPTER/97-01-IMPLEMENT.md` (NEW)
