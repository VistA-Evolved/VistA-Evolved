# Phase 110 -- RCM Core v1: Credential Vault + LOA Engine (IMPLEMENT)

## User Request

Implement the Credentialing & Accreditation Hub + LOA workflow foundation as
a real, durable platform capability above VistA IB/AR/PCE.

## Implementation Steps

### 1. DB Schema (6 new tables: U-Z)
- `credential_artifact` -- Provider/facility credential metadata (NPI, licenses, DEA, etc.)
- `credential_document` -- Object storage pointers for uploaded documents
- `accreditation_status` -- Per-payer accreditation status (active/pending/expiring/denied)
- `accreditation_task` -- Actionable next-steps per payer
- `loa_request` -- LOA request objects tied to encounter/order context
- `loa_attachment` -- Attachments linked to LOA packets

### 2. Repository Layer
- `credential-vault-repo.ts` -- CRUD for credentials + documents + audit
- `accreditation-repo.ts` -- CRUD for accreditation status + tasks
- `loa-repo.ts` -- CRUD for LOA requests + attachments + status transitions

### 3. LOA Engine
- `loa-engine.ts` -- Domain logic: create LOA, generate packet, status FSM
- LOA statuses: draft -> pending_review -> submitted -> approved / denied -> closed

### 4. Payer Adapter Interface
- `loa-adapter.ts` -- Interface: submitLOA(), checkLOAStatus(), getRequirements()
- `stub-loa-adapter.ts` -- Returns contracting_needed with concrete steps

### 5. API Routes
- `credential-vault-routes.ts` -- /rcm/credentials/*, /rcm/accreditation/*
- `loa-routes.ts` -- /rcm/loa/*

### 6. Admin UI (2 new tabs on RCM page)
- Credential Vault tab
- LOA Requests tab

### 7. Docs + Runbook
- `docs/runbooks/phase110-rcm-credential-vault-loa.md`

## Files Touched

- `apps/api/src/platform/db/schema.ts` -- +6 tables
- `apps/api/src/platform/db/migrate.ts` -- +6 CREATE TABLE
- `apps/api/src/rcm/credential-vault/` -- repo + routes
- `apps/api/src/rcm/loa/` -- engine + repo + routes + adapter
- `apps/api/src/index.ts` -- register new routes
- `apps/web/src/app/cprs/admin/rcm/page.tsx` -- +2 tabs
- `docs/runbooks/phase110-rcm-credential-vault-loa.md`

## Verification Steps

See 110-99-VERIFY.md
