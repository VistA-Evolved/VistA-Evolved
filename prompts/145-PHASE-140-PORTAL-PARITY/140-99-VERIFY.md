# Phase 140 — Portal Parity Closure — VERIFY

## Verification Gates

### Gate 1: TSC Clean
- `pnpm -C apps/api exec tsc --noEmit` — 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` — 0 errors (or next build succeeds)

### Gate 2: Builds
- `pnpm -C apps/web build` — clean
- `pnpm -C apps/portal build` — clean

### Gate 3: PG Migration
- v17 applies cleanly (patient_consent + patient_portal_pref tables)
- Both tables in tenantTables for RLS

### Gate 4: API Routes
- GET /portal/documents returns document types
- POST /portal/documents/generate returns signed token
- GET /portal/documents/download/:token returns PDF
- GET /portal/consents returns consent list
- POST /portal/consents records consent

### Gate 5: Portal Pages
- /dashboard/documents renders
- /dashboard/consents renders
- /dashboard/immunizations already works (Phase 65)

### Gate 6: Nav + i18n
- Nav has immunizations, documents, consents entries
- All 3 locales (en, fil, es) have new keys

### Gate 7: Audit
- New audit actions exist in ImmutableAuditAction type
- Document generate/download/consent events logged

### Gate 8: Gauntlet
- FAST: no regressions
- RC: no regressions
