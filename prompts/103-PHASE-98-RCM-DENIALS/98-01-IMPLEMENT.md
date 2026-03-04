# Phase 98 — RCM Denials & Appeals Loop (IMPLEMENT)

## Goal

Create a full Denials + Appeals workflow (VistA-first, enterprise posture):
denial intake (manual + EDI 835 import), CARC/RARC classification,
work queue with SLA tracking, appeal packet builder, resubmission tracking,
resolution metrics. Durable SQLite persistence, RBAC, PHI-safe audit.

## Persistence

Extend existing platform DB (SQLite via better-sqlite3 + drizzle-orm):

- `denial_case` — main denial entity with FSM lifecycle
- `denial_action` — append-only action history per denial
- `denial_attachment` — reference-only (no raw PHI stored)
- `resubmission_attempt` — appeal/correction submission tracking

## Files Created

- `apps/api/src/rcm/denials/types.ts` — domain model + Zod schemas (8-state FSM, CARC/RARC codes)
- `apps/api/src/rcm/denials/denial-store.ts` — SQLite CRUD via platform DB (with provenance variant)
- `apps/api/src/rcm/denials/appeal-packet.ts` — HTML appeal packet builder (print-ready)
- `apps/api/src/rcm/denials/edi-import.ts` — 835 remittance → denial intake (structured JSON)
- `apps/api/src/rcm/denials/denial-routes.ts` — Fastify routes (13 endpoints)
- `apps/web/src/app/cprs/admin/denial-cases/page.tsx` — Denial Cases & Appeals UI (4 tabs)
- `docs/runbooks/rcm-denials-phase98.md` — runbook

## Files Modified

- `apps/api/src/platform/db/schema.ts` — add 4 denial tables (denialCase, denialAction, denialAttachment, resubmissionAttempt)
- `apps/api/src/platform/db/migrate.ts` — add CREATE TABLE + 10 indexes
- `apps/api/src/rcm/audit/rcm-audit.ts` — add 13 denial audit actions
- `apps/api/src/index.ts` — import + register denialRoutes

## Verification

See `98-99-VERIFY.md`
