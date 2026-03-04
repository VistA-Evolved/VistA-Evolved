# Phase 87 — Philippines RCM Foundation (PayerOps core) — VERIFY

> Prompt 93-99 | Phase 87 | 2025-01-XX

## Verification Gates

### Gate 1 — TypeScript Compilation

- [ ] `cd apps/api && npx tsc --noEmit` exits clean
- [ ] `cd apps/web && npx tsc --noEmit` exits clean (or Next.js build check)

### Gate 2 — API Health

- [ ] `GET /rcm/payerops/health` returns `{ ok: true, module: "payerops", phase: 87 }`
- [ ] `encryption` field is `"healthy"` (not `"degraded"`)
- [ ] `adapters` array contains `["manual", "portal"]`

### Gate 3 — Enrollment CRUD

- [ ] `POST /rcm/payerops/enrollments` with valid body returns 201
- [ ] `GET /rcm/payerops/enrollments` returns list
- [ ] `PUT /rcm/payerops/enrollments/:id/status` transitions status

### Gate 4 — LOA Lifecycle

- [ ] `POST /rcm/payerops/loa` creates draft LOA case
- [ ] `PUT /rcm/payerops/loa/:id/status` with `{ status: "pending_submission" }` succeeds
- [ ] Invalid transition (e.g., draft -> approved) returns 422
- [ ] `POST /rcm/payerops/loa/:id/pack` generates submission pack with checklist

### Gate 5 — Credential Vault

- [ ] `POST /rcm/payerops/credentials` creates entry
- [ ] `GET /rcm/payerops/credentials` lists entries
- [ ] `DELETE /rcm/payerops/credentials/:id` removes entry
- [ ] `GET /rcm/payerops/credentials/expiring` filters by days

### Gate 6 — Adapter Behavior

- [ ] `GET /rcm/payerops/adapters` lists manual + portal
- [ ] `POST /rcm/payerops/loa/:id/submit` returns `status: "manual_required"` (not `"success"`)
- [ ] No adapter ever returns `status: "success"` for any operation

### Gate 7 — Security

- [ ] Encryption roundtrip test passes (health endpoint shows "healthy")
- [ ] `PAYEROPS_CREDENTIAL_KEY` env var configures master key
- [ ] Without env var, dev fallback generates ephemeral key with warning

### Gate 8 — Feature Flag

- [ ] When RCM module is disabled, `/rcm/payerops/*` routes return 403

### Gate 9 — UI

- [ ] PayerOps link appears in admin nav (when RCM module enabled)
- [ ] /cprs/admin/payerops renders 4 tabs
- [ ] Enrollments tab shows create form + table
- [ ] LOA tab shows create form + submission pack modal
- [ ] Credentials tab shows expiring credentials banner
- [ ] Adapters tab shows manual + portal with capabilities

### Gate 10 — Documentation

- [ ] `docs/runbooks/philippines-rcm-foundation.md` exists with complete content
- [ ] `prompts/93-PHASE-87-PH-RCM/93-01-IMPLEMENT.md` exists
- [ ] `prompts/93-PHASE-87-PH-RCM/93-99-VERIFY.md` exists
- [ ] `config/modules.json` includes payerops data stores

### Gate 11 — No Fake Success

- [ ] All PayerOpsResult statuses are one of: `manual_required`, `not_supported`, `error`
- [ ] No adapter operation returns a pretend-resolved IEN or tracking number
- [ ] Integration-pending surfaces clearly state what is needed
