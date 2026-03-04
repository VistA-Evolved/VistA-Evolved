# Phase 161 -- VistA + CPRS Alignment Verification Pack

> Runbook for Phase 161: Golden traces, RPC tripwires, alignment scoring,
> and verification gate engine.

---

## Overview

Phase 161 adds a comprehensive alignment verification system that
continuously validates the API's VistA integration depth. It builds on
Phase 106's coverage map infrastructure with:

- **Golden Trace Snapshots** -- Capture the RPC registry state at a point
  in time, then compare against future captures to detect regressions.
- **RPC Tripwires** -- Monitor for unexpected RPC behavior changes
  (empty responses, timeouts, schema mismatches, unregistered calls).
- **Alignment Scoring** -- Per-panel (20 panels) and global (weighted)
  alignment scores from 0-100.
- **Verification Gates** -- 8 automated gates checking registry size,
  panel coverage, orphan RPCs, tripwire health, score thresholds, critical
  panel wiring, exception documentation, and domain coverage.

## Architecture

```
apps/api/src/vista/alignment/
  types.ts                      -- GoldenSnapshot, RpcTripwire, AlignmentScore, etc.
  golden-tracer.ts              -- Capture/compare/list golden trace snapshots
  tripwire-monitor.ts           -- Register/check/seed RPC tripwires
  alignment-scorer.ts           -- Calculate per-panel and global scores
  index.ts                      -- Barrel export

apps/api/src/routes/
  alignment-routes.ts           -- 16 REST endpoints under /admin/alignment/*

apps/web/src/app/cprs/admin/alignment/
  page.tsx                      -- Admin dashboard (score, gates, tripwires, snapshots)
```

## API Endpoints (all admin-only)

| Method | Path                                          | Purpose                                 |
| ------ | --------------------------------------------- | --------------------------------------- |
| GET    | /admin/alignment/score                        | Global + per-panel scores               |
| GET    | /admin/alignment/gates                        | Run 8 verification gates                |
| GET    | /admin/alignment/summary                      | Combined score + gates + tripwire stats |
| GET    | /admin/alignment/snapshots                    | List golden snapshots                   |
| POST   | /admin/alignment/snapshots                    | Capture new snapshot                    |
| GET    | /admin/alignment/snapshots/:id                | Get snapshot detail                     |
| DELETE | /admin/alignment/snapshots/:id                | Delete snapshot                         |
| POST   | /admin/alignment/snapshots/compare            | Compare two snapshots                   |
| GET    | /admin/alignment/tripwires                    | List tripwires                          |
| POST   | /admin/alignment/tripwires                    | Create tripwire                         |
| POST   | /admin/alignment/tripwires/seed               | Seed 5 default tripwires                |
| PUT    | /admin/alignment/tripwires/:id/toggle         | Enable/disable                          |
| DELETE | /admin/alignment/tripwires/:id                | Delete tripwire                         |
| GET    | /admin/alignment/tripwires/events             | List tripwire events                    |
| POST   | /admin/alignment/tripwires/events/:id/resolve | Resolve event                           |
| GET    | /admin/alignment/tripwires/stats              | Tripwire statistics                     |

## Scoring Formula

**Panel Score** = (wiredRpcs / totalRpcs) \* 80 + routeHealth(10) + tripwireBonus(10)

- Panels with no VistA RPCs (Telehealth, AI, Intake) score 100 by definition
- VistA-linked panels are double-weighted in global score

**Global Score** = weighted average of all 20 panel scores

## Verification Gates

1. **Registry Size** -- >100 RPCs registered (currently 196)
2. **Panel Coverage** -- >=5 panels fully wired
3. **No Orphan RPCs** -- All callRpc sites use registered RPCs
4. **Tripwire Health** -- No unresolved tripwire events
5. **Alignment Score** -- Global score >= 60
6. **Critical Panels** -- CoverSheet, Allergies, Meds, Orders all fully wired
7. **Exception Documentation** -- All exception reasons >10 chars
8. **Domain Coverage** -- >=10 distinct RPC domains

## Verification

```powershell
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
grep -n "alignmentRoutes" apps/api/src/index.ts
grep -n "alignment-snapshot-store" apps/api/src/platform/store-policy.ts
```

## Follow-ups

- Wire golden trace capture to actually call RPCs (requires VistA connection)
- Persist snapshots/tripwires to PG
- Integrate tripwire checks into safeCallRpc middleware
- Auto-score on each deployment and block regression below threshold
