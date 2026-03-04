# Phase 43 — Enterprise RCM Loop: Acks + Remits + Denial Workqueues + Rule Updates

## User Request

Implement the operational loop that reduces rejections:

- Eligibility checks, ack tracking (999/277CA), claim status (276/277)
- Remittance ingestion (835), denial workflow with CARC/RARC normalization
- Configuration-driven payer edits, workqueues for billing ops

## Deliverables

A) ACK + STATUS PIPELINE — models, endpoints, claim history
B) REMITTANCE (835) INGESTION — normalized model, CARC/RARC codes
C) WORKQUEUES — Rejections, Denials, Missing Info queues (UI)
D) PAYER RULE UPDATES — config-driven payer rules, admin UI, audit
E) SAFETY + RELIABILITY — job queue, idempotency, payload limits
F) DOCS — claim-quality.md, acks-status-remits.md, rcm-ops-workqueues.md

## Files to touch

- apps/api/src/rcm/domain/ (new models)
- apps/api/src/rcm/edi/ (ack/status/remit processors)
- apps/api/src/rcm/rcm-routes.ts (new endpoints)
- apps/api/src/rcm/workqueues/ (new)
- apps/api/src/rcm/rules/ (new)
- apps/web/src/app/cprs/admin/rcm/page.tsx (new tabs)
- data/rcm/carc-rarc-reference.json (new)
- data/rcm/payer-rules/ (new)
- docs/rcm/ (new docs)

## Commit

"Phase43: claim quality loop (acks/status/remits/denials/workqueues)"
