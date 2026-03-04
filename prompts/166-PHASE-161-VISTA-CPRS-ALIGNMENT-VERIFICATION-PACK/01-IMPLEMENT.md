# Phase 161 — VistA + CPRS Alignment Verification Pack (IMPLEMENT)

## User Request

Build a comprehensive VistA + CPRS alignment verification system that validates
every RPC call site against the registry, generates golden trace snapshots,
provides RPC tripwire monitoring, and produces alignment depth scores.

## Implementation Steps

1. Create `apps/api/src/vista/alignment/` module:
   - `types.ts` — AlignmentTrace, RpcTripwire, AlignmentScore, GoldenSnapshot
   - `golden-tracer.ts` — Capture and compare RPC call golden traces
   - `tripwire-monitor.ts` — Detect unexpected RPC behavior changes
   - `alignment-scorer.ts` — Calculate per-panel and global alignment scores
   - `index.ts` — Barrel export

2. Create alignment routes:
   - `apps/api/src/routes/alignment-routes.ts` — 10+ alignment endpoints

3. Wire routes in index.ts

4. Create admin UI page:
   - `apps/web/src/app/cprs/admin/alignment/page.tsx`

5. Add store policy entries for alignment stores

6. Create runbook

## Verification Steps

1. TypeScript clean compile (API + web)
2. Store policy entries present
3. Routes wired in index.ts
4. Golden tracer captures snapshot structure
5. Alignment scorer produces per-panel scores
6. All 20 panels in vista-panel-wiring.ts have scores

## Files Touched

- apps/api/src/vista/alignment/types.ts (NEW)
- apps/api/src/vista/alignment/golden-tracer.ts (NEW)
- apps/api/src/vista/alignment/tripwire-monitor.ts (NEW)
- apps/api/src/vista/alignment/alignment-scorer.ts (NEW)
- apps/api/src/vista/alignment/index.ts (NEW)
- apps/api/src/routes/alignment-routes.ts (NEW)
- apps/api/src/index.ts (MODIFIED — wire routes)
- apps/api/src/platform/store-policy.ts (MODIFIED — add entries)
- apps/web/src/app/cprs/admin/alignment/page.tsx (NEW)
- docs/runbooks/phase161-vista-alignment-verification.md (NEW)
