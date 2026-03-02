# Phase 442 — IMPLEMENT: Export Packaging Pipeline (W28 P4)

## Goal
Build a regulatory-compliant data export pipeline that enforces framework
constraints (cross-border transfer, PHI classification, retention) before
producing export packages with SHA-256 manifests.

## Files Created
- `apps/api/src/regulatory/export-pipeline.ts` — Export pipeline engine

## Files Modified
- `apps/api/src/regulatory/index.ts` — Re-exported export types + functions
- `apps/api/src/platform/store-policy.ts` — Registered 2 stores

## Key Decisions
- 3 constraint checks: cross-border transfer, PHI classification, retention acknowledgement
- Blocked exports are stored but never produce content
- SHA-256 content hash in manifests for integrity
- Scaffold export content — real data query integration pending
- Hash-chained audit per export operation
