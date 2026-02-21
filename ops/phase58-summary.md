# Phase 58 — VistA-First HL7/HLO Interop Monitor v2

## What Changed

### M Routines (services/vista/)
- **ZVEMIOP.m** v1.1/Build 2: Added 2 new entry points:
  - `MSGLIST(RESULT,DIR,STAT,MAXN)` — List individual HL7 messages from `^HLMA` (#773) with direction/status filters. Returns metadata only (IEN, direction, status, link, date, text IEN). NO message body.
  - `MSGDETL(RESULT,MSGIEN)` — Single message metadata + segment type summary from #773/#772. Returns segment TYPE NAMES and COUNTS only — no raw content.
- **ZVEMINS.m** v1.1/Build 2: Updated to register 6 RPCs (was 4). Added `VE INTEROP MSG LIST` and `VE INTEROP MSG DETAIL`.

### API (apps/api/src/)
- **routes/vista-interop.ts**: 5 new v2 endpoints:
  - `GET /vista/interop/v2/hl7/messages` — message list with ?direction&status&limit filters
  - `GET /vista/interop/v2/hl7/messages/:id` — message detail, PHI segments masked by default
  - `POST /vista/interop/v2/hl7/messages/:id/unmask` — unmask requires admin role + reason text, audited
  - `GET /vista/interop/v2/hl7/summary` — combined HL7 dashboard summary
  - `GET /vista/interop/v2/hlo/summary` — combined HLO dashboard summary
- **lib/audit.ts**: 3 new audit actions: `interop.message-unmask`, `interop.message-list`, `interop.message-detail`
- **vista/rpcRegistry.ts**: 2 new RPCs in registry + exceptions arrays
- **vista/rpcDebugData.ts**: 2 new debug entries (msg-list, msg-detail)

### UI (apps/web/src/)
- **integrations/page.tsx**: New "Message Browser" tab with:
  - Filter controls (direction, status, limit)
  - Message list table (click to view detail)
  - Message detail panel with segment type summary
  - PHI masking indicators (MASKED/UNMASKED badges)
  - Unmask flow (admin only, requires 10+ char reason, confirmation banner)

### Artifacts
- **artifacts/interop/capabilities.json**: Full capability inventory
- **prompts/63-PHASE-58-INTEROP-MONITOR-V2/**: IMPLEMENT + VERIFY prompts

## How to Test Manually

1. Start VistA Docker: `cd services/vista && docker compose --profile dev up -d`
2. Install RPCs: `powershell scripts/install-interop-rpcs.ps1`
3. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
4. Start web: `cd apps/web && pnpm dev`
5. Navigate to Admin > Integrations > Message Browser tab
6. Click "Search" to load messages from VistA #773
7. Click any message row to view detail with masked segment summary
8. (Admin only) Enter reason text and click "Unmask" to see unmasked flags

## Verifier Output

```
=== Phase 58 Verification: Interop Monitor v2 ===
  PASS  G58-01  Capability inventory exists
  PASS  G58-02  M routine extended (MSGLIST + MSGDETL)
  PASS  G58-03  RPCs registered (registry + exceptions + installer)
  PASS  G58-04  API v2 endpoints exist (5 routes)
  PASS  G58-05  PHI masking defaults ON
  PASS  G58-06  Audit trail for unmask
  PASS  G58-07  No raw PHI in M routine output
  PASS  G58-08  UI message browser tab
  PASS  G58-09  No mock/fake data in interop routes
  PASS  G58-10  RPC debug data updated

  PASS: 10
  All gates passed.
```

## Follow-ups
- When ZVEMINS.m is run in Docker, the 2 new RPCs need re-registration after `docker compose down -v`
- Future: If raw segment content is ever returned from ZVEMIOP.m, the unmask endpoint would gate actual PHI; currently it just toggles the masked flag on segment type counts
- Future: Add auto-refresh polling for message list (currently manual Search button)
