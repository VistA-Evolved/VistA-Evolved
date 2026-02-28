# Phase 95 — Payer Registry Persistence + Audit + Evidence Update Workflow (VERIFY)

## Verification Gates

### Sanity
- [ ] `npx tsc --noEmit` from apps/api — exit 0
- [ ] `npx tsc --noEmit` from apps/web — exit 0 (or IDE diagnostics clean)
- [ ] API starts without error

### Persistence
- [ ] POST /admin/payers/import loads 27 HMOs + PhilHealth (28 total)
- [ ] Registry survives simulated restart (data on disk)
- [ ] GET /admin/payers returns all 28 payers
- [ ] GET /admin/payers/:id returns full detail

### Audit
- [ ] PATCH /admin/payers/:id/capabilities writes audit event
- [ ] PATCH /admin/payers/:id/tasks writes audit event
- [ ] GET /admin/payers/:id/audit returns timeline
- [ ] Audit includes actor, timestamp, before/after, reason

### Evidence
- [ ] Evidence file hashes computed and stored
- [ ] Import records provenance (source_type, source_url, retrieved_at, hash)

### Tenant Isolation
- [ ] Global payer defs separate from tenant overrides
- [ ] Tenant overrides don't affect global baseline

### Regression
- [ ] Existing ph-hmo-registry consumers still work
- [ ] Phase 93 routes return same data shape
- [ ] Phase 94 LOA/Claims/Remittance workflows unbroken

### UI
- [ ] Admin page renders payer list
- [ ] Detail view shows capabilities, tasks, evidence, audit

### Prompt Ordering
- [ ] verify-prompt-ordering.ps1 passes
