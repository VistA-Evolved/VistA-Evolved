# Durability Wave 1 — Enterprise Restart Safety

> Phase 121 | Prompt 125

## Overview

Phase 121 migrates the highest-risk pure in-memory stores to DB-backed
hybrid persistence. After restart the API rehydrates state from SQLite,
eliminating data loss for RCM claims, portal access logs, and scheduling
requests.

## What Changed

### New SQLite Tables (5)

| Letter | Table                | Purpose                          |
| ------ | -------------------- | -------------------------------- |
| AP     | `rcm_claim`          | RCM claim entities (Phase 38)    |
| AQ     | `rcm_remittance`     | Remittance / EOB records         |
| AR     | `rcm_claim_case`     | Claims lifecycle FSM (Phase 91)  |
| AS     | `portal_access_log`  | Patient-visible activity log     |
| AT     | `scheduling_request` | Wait list / appointment requests |

### Modified Store Files (4)

| File                                   | Pattern                          |
| -------------------------------------- | -------------------------------- |
| `rcm/domain/claim-store.ts`            | Hybrid: write-through + fallback |
| `rcm/claims/claim-store.ts`            | Hybrid: write-through + fallback |
| `portal-iam/access-log-store.ts`       | Hybrid: write-through + fallback |
| `adapters/scheduling/vista-adapter.ts` | Hybrid: write-through + fallback |

### New Repository Files (4)

| File                                          | Functions                      |
| --------------------------------------------- | ------------------------------ |
| `platform/db/repo/rcm-claim-repo.ts`          | CRUD for claims + remittances  |
| `platform/db/repo/rcm-claim-case-repo.ts`     | CRUD for claim lifecycle cases |
| `platform/db/repo/access-log-repo.ts`         | Insert + query + stats         |
| `platform/db/repo/scheduling-request-repo.ts` | CRUD for scheduling requests   |

### Wiring (index.ts)

Four new init blocks after `initPlatformDb()`:

1. `initClaimStoreRepo` — RCM domain claims + remittances
2. `initClaimCaseRepo` — RCM claims lifecycle FSM
3. `initAccessLogRepo` — Portal access logs
4. `initSchedulingRepo` — Scheduling requests (+ startup rehydration)

### Audit Enhancement

`system-audit.mjs` now detects hybrid-backed stores (files with both
`new Map()` and `dbRepo`/`initXxxRepo`) and downgrades their risk from
high → low. This is reflected in the audit summary.

## Architecture

All four stores follow the same **hybrid pattern**:

1. **In-memory Map** — hot cache for fast reads
2. **Write-through** — every mutation writes to both cache and DB
3. **Cache-first reads** — query cache first; on miss, fall back to DB
4. **Startup rehydration** — scheduling store loads active requests from DB
5. **Graceful degradation** — if DB is unavailable, falls back to cache-only

Booking locks in `vista-adapter.ts` remain purely in-memory (intentionally
ephemeral, TTL-based — 30s expiry).

## Metrics

| Metric           | Before | After | Delta |
| ---------------- | -----: | ----: | ----: |
| SQLite tables    |     41 |    46 |    +5 |
| High-risk stores |     49 |    40 |    -9 |
| Total endpoints  |  1,196 | 1,196 |     0 |

## How to Test

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Verify tables exist
# Check startup logs for "wired to DB" messages:
#   "RCM claim store wired to DB"
#   "RCM claim case store wired to DB"
#   "Portal access log store wired to DB"
#   "Scheduling request store wired to DB"

# 3. Create data, restart, verify persistence
# Create a claim via POST /rcm/claims
# Restart the API
# Query GET /rcm/claims — data should survive restart

# 4. Run system audit
pnpm audit:system
# Verify: 46 SQLite tables, ≤40 high-risk stores
```

## Follow-ups

- Remaining 40 high-risk stores are candidates for Wave 2
- Consider adding PG store-resolver support for Phase 121 tables
- EDI pipeline stage tracking still in-memory (intentional — reset on restart)
