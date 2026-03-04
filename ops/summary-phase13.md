# Phase 13 — CPRS Operationalization — Ops Summary

## What Changed

### A. Authentication & Sessions

- Real VistA credential authentication via XWB protocol
- `authenticateUser()` in rpcBrokerClient.ts — temp TCP connection for auth
- In-memory session store with 8-hour TTL, 5-min cleanup
- Cookie (`ehr_session`) + Bearer token support
- Role mapping: provider/nurse/pharmacist/clerk/admin
- Endpoints: POST /auth/login, POST /auth/logout, GET /auth/session
- Login page rewritten with real auth flow + redirect

### B. Inbox / Tasks

- `GET /vista/inbox` — aggregates ORWORB UNSIG ORDERS + ORWORB FASTUSER
- Full inbox page at /cprs/inbox with type filtering, acknowledge, open-chart

### C. Order Workflow State Machine

- Order statuses: draft → unsigned → signed → released / discontinued / cancelled
- `signOrder()` and `releaseOrder()` methods in DataCache
- Quick-order template page at /cprs/order-sets (12 templates, 4 categories)

### D. Results Workflow

- Labs panel: flag severity (critical HH/LL red, abnormal H/L orange)
- Filter modes: all, abnormal only, unacknowledged
- Acknowledge all button, summary line

### E. Remote Data Viewer

- Full page at /cprs/remote-data-viewer (replaces modal-only)
- Facility list, 8 domain selectors, query interface
- Architecture docs for CIRN/FHIR integration

### F. Legacy Console WebSocket

- WebSocket at /ws/console with token auth + RBAC (admin/provider)
- JSON protocol: rpc, api, ping message types
- Audit logging (in-memory, max 500), GET /admin/audit-log
- Blocked credential RPCs (XUS AV CODE, XUS SET VISITOR)
- Console modal: WS with HTTP fallback, connection indicator

### G. Modern UI Toggle

- Layout mode: Classic CPRS / Modern (sidebar nav replaces tab strip)
- Extended density: comfortable, compact, balanced, dense
- Persisted in localStorage

## How to Test Manually

1. Start Docker VistA: `cd services/vista && docker compose --profile dev up -d`
2. Start API: `pnpm -C apps/api dev`
3. Start web: `pnpm -C apps/web dev`
4. Navigate to `http://localhost:3000/cprs/login`
5. Login with PROV123 / PROV123!!
6. Check /cprs/inbox for notifications
7. Check /cprs/order-sets for quick-order templates
8. Check /cprs/remote-data-viewer for remote data
9. Select patient → chart → Labs tab → check flag colors and filters
10. Preferences → toggle Modern layout, try Dense density
11. Tools → Legacy Console → type `ping` or `rpc ORWPT LIST ALL SMI,1`

## Verifier Output

- TypeScript API: `pnpm -C apps/api exec tsc --noEmit` → **0 errors**
- TypeScript Web: `pnpm -C apps/web exec tsc --noEmit` → **0 errors**
- VS Code diagnostics: **0 TypeScript errors**

## Follow-Ups

1. Production session store (Redis/Postgres) to replace in-memory
2. Session-aware DUZ passthrough (API currently uses env-var DUZ)
3. Real CIRN/VistaLink for remote data viewer
4. xterm.js terminal emulator for console modal
5. Order signature with electronic PIN
6. Lab acknowledgment persisted to VistA via RPC
7. WebSocket reconnection with exponential backoff
