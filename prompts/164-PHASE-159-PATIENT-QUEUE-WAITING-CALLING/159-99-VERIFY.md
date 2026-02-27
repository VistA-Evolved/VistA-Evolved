# Phase 159-99: VERIFY — Patient Queue / Waiting / Numbering / Calling System

## Verification Gates (12 gates, all must pass)

### Gate 1: TypeScript Compiles
```powershell
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
```

### Gate 2: Queue Engine Exists
- apps/api/src/queue/types.ts — QueueTicket, QueueEvent types
- apps/api/src/queue/queue-engine.ts — createTicket, callNext, etc.
- apps/api/src/queue/queue-routes.ts — 10+ endpoints
- apps/api/src/queue/index.ts — barrel export

### Gate 3: DB Schema
- queue_ticket table in schema.ts + migrate.ts
- queue_event table in schema.ts + migrate.ts
- PG migration v24 with tenant_id, RLS entries

### Gate 4: Store Policy
- queue-ticket-store registered (critical, pg_backed)
- queue-event-store registered (audit, pg_backed)

### Gate 5: Routes Wired
- import + server.register in index.ts
- /queue/* endpoints respond

### Gate 6: Department Support
- Multiple departments configurable (ED, Lab, Radiology, Pharmacy, etc.)
- Department-scoped ticket numbering (resets daily)

### Gate 7: Priority Queue
- 4 priority levels: urgent, high, normal, low
- Call-next respects priority ordering

### Gate 8: Public Display
- GET /queue/display/:dept returns current queue state
- No authentication required (public board)

### Gate 9: Wait Time Stats
- GET /queue/stats/:dept returns average wait, volume, active count

### Gate 10: UI Page Exists
- apps/web/src/app/cprs/admin/queue/page.tsx renders

### Gate 11: No PHI in Logs
- Queue events log ticket_id + dept, not patient names in general logs
- Patient name only in the queue_ticket record itself

### Gate 12: Runbook
- docs/runbooks/phase159-patient-queue.md exists with API examples
