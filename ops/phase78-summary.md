# Phase 78 — PendingTargets Burn-Down v1 Summary

## What Changed

### API Routes Wired (3)

1. **POST /vista/cprs/orders/dc** — Wired to ORWDXA DC with LOCK/UNLOCK safety model + draft fallback
2. **POST /vista/cprs/orders/flag** — Wired to ORWDXA FLAG with draft fallback
3. **GET /vista/cprs/reminders** — Wired to ORQQPX REMINDERS LIST (may return empty in sandbox if PXRM not configured)

### RPC Registry Additions (2)

- `ORQQPX REMINDERS LIST` (domain: reminders, tag: read)
- `ORQQPX REMINDER DETAIL` (domain: reminders, tag: read)

### Type System Extensions

- **AuditAction**: Added `clinical.order-flag`, `phi.reminders-view`
- **ServerDraft.type**: Added `order-dc`, `order-flag`

### Action Registry Fixes (26 total)

- **3 status changes**: orders.dc stub→wired, orders.flag stub→wired, cover.load-reminders pending→wired
- **23 endpoint mappings**: Added missing `endpoint` field to actions whose API routes already existed

### rpcDebugData Fixes (3)

- orders.dc: stub→wired, rpcs updated to include LOCK/UNLOCK
- orders.flag: stub→wired
- cover.load-reminders: added as new wired entry

### UI Update (1)

- CoverSheetPanel.tsx: Clinical Reminders section now fetches from `/vista/cprs/reminders` and renders data table instead of hardcoded "integration pending" message

## Governance Index Deltas

| Metric                      | Before | After | Delta   |
| --------------------------- | ------ | ----- | ------- |
| Traceability: Wired         | 78     | 81    | +3      |
| Traceability: Stub          | 2      | 0     | -2      |
| Traceability: Pending       | 9      | 8     | -1      |
| Traceability: No-endpoint   | 23     | 0     | **-23** |
| PendingTargets: Occurrences | 67     | 64    | -3      |
| PendingTargets: Unique RPCs | 44     | 40    | -4      |

**Net closures: 26** (3 API wires + 23 traceability fixes)

## How to Test Manually

```bash
# 1. Start VistA Docker + API
cd services/vista && docker compose --profile dev up -d
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Test orders DC (needs valid orderId)
curl -X POST http://127.0.0.1:3001/vista/cprs/orders/dc \
  -H "Content-Type: application/json" \
  -d '{"dfn":"3","orderId":"12345"}'

# 3. Test orders flag
curl -X POST http://127.0.0.1:3001/vista/cprs/orders/flag \
  -H "Content-Type: application/json" \
  -d '{"dfn":"3","orderId":"12345","flagReason":"Review needed"}'

# 4. Test reminders (may return empty if PXRM not configured)
curl http://127.0.0.1:3001/vista/cprs/reminders?dfn=3

# 5. Rebuild governance indexes
npx tsx scripts/governance/buildTraceabilityIndex.ts
npx tsx scripts/governance/buildPendingTargetsIndex.ts
```

## Verifier Output

```
Traceability: 89 total, 81 wired, 0 stub, 8 pending, 0 no-endpoint, 0 hard errors
PendingTargets: 64 occurrences, 40 unique RPCs
```

## Follow-ups

- Remaining 8 integration-pending actions are genuinely blocked:
  - cover.load-appointments (SDEC scheduling RPCs absent)
  - immunizations.add (PX SAVE DATA needs PCE encounter context)
  - adt.admit/transfer/discharge (DGPM write RPCs not in sandbox)
  - nursing.tasks/mar/administer (BCMA/PSB package not installed)
- Future burn-down phases should target the 64 remaining pendingTargets occurrences from orders-cpoe, tiu-notes, nursing, adt, and immunizations routes
