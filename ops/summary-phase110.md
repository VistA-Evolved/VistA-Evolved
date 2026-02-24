# Phase 110 — RCM Core v1 (Credential Vault + LOA Engine) — Summary

## What Changed

### DB Schema (6 new tables U-Z)
- `credential_artifact` -- Provider/facility credential metadata with status/expiration tracking
- `credential_document` -- Document upload pointers linked to credentials
- `accreditation_status` -- Per-payer enrollment/accreditation status with notes
- `accreditation_task` -- Next-steps task lists per accreditation record
- `loa_request` -- LOA/pre-auth requests with FSM lifecycle
- `loa_attachment` -- LOA supporting document references

### API Routes (~22 new endpoints)
- `/rcm/credential-vault/*` -- 10 endpoints: CRUD + verify + stats + expiring + documents
- `/rcm/accreditation/*` -- 12 endpoints: CRUD + verify + notes + stats + tasks

### LOA Engine (DB Layer)
- `loa-repo.ts` -- DB-backed CRUD for LOA requests and attachments
- `loa-engine.ts` -- FSM (draft->pending_review->submitted->approved|denied->appealed->expired->closed)
- `loa-adapter.ts` -- LoaAdapter interface + StubLoaAdapter + registry (env: LOA_ADAPTER)

### Admin UI
- 2 new tabs on `/cprs/admin/rcm`: Credential Vault and Accreditation

## Verifier Output

- tsc --noEmit: PASS (0 errors)
- next build: PASS (all pages compiled)
- All 12 Phase 110 endpoint tests: PASS (200 OK)
- Regression (claims/payers/edi): All 200

## Follow-ups
1. Wire DB-backed LOA repos into existing Phase 94 LOA routes
2. Wire DB-backed credential vault into Phase 87 PayerOps routes
3. Real payer LOA adapters
4. Document upload storage backend
5. Credential expiration alerts
