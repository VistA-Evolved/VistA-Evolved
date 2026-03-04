# Phase 13: CPRS Operationalization — IMPLEMENT

## User Request

Implement the "CPRS Operationalization" phase — a big-batch build that
delivers session-based authentication, inbox/notifications, order workflow
state machine, results workflow, remote data viewer page, WebSocket-backed
legacy console with RBAC and audit, and a modern UI toggle — all preserving
existing CPRS workflow and screen IDs.

## Sections

### A — Authentication + Session + Facility

- `POST /auth/login` → VistA RPC Broker auth with user-provided credentials
- `POST /auth/logout` → destroy session
- `GET /auth/session` → return current session
- In-memory session store with secure cookie
- `SessionProvider` context on frontend
- Reworked login page with real auth flow
- Role mapping: provider, nurse, pharmacist, clerk, admin

### B — Inbox / Tasks / Notifications

- `GET /vista/inbox` → aggregates ORWORB FASTUSER + ORWORB UNSIG ORDERS
- Full page `/cprs/inbox` with filter, acknowledge, open-chart actions
- Menu bar: File → Inbox (Ctrl+I)

### C — Order Workflow State Machine

- `DraftOrder.status`: draft → unsigned → signed → released → discontinued/cancelled
- `signOrder()`, `releaseOrder()` helpers in DataCache
- `/cprs/order-sets` page with local JSON quick-order templates

### D — Results Workflow

- Enhanced `LabsPanel` with critical/abnormal highlighting (HH/LL → red, H/L → orange)
- Filter modes: All / Abnormal Only / Unacknowledged
- Acknowledge All button
- Visual indicators (colored borders, badge labels)

### E — Remote Data Viewer Page

- Full page `/cprs/remote-data-viewer` (not just modal)
- Facility list from ORWCIRN FACLIST (architecture hook)
- Domain selector with 8 clinical domains
- Query interface with structured placeholders for Docker sandbox

### F — Legacy Console WebSocket Gateway

- `@fastify/websocket` on API server
- `/ws/console` endpoint with token-based auth
- RBAC: provider + admin can access
- Protocols: `rpc`, `api`, `ping` message types
- Audit log for all console operations
- `GET /admin/audit-log` endpoint
- Frontend upgraded to WebSocket with HTTP fallback

### G — Modern UI Toggle

- `layoutMode: 'cprs' | 'modern'` preference
- `density: 'comfortable' | 'compact' | 'balanced' | 'dense'`
- Modern layout: sidebar navigation (replaces tab strip)
- All workflows and screen IDs unchanged

### H — Prompts + Runbooks + Verification

- Prompt files: IMPLEMENT + VERIFY
- Runbook: `docs/runbooks/vista-rpc-phase13-operationalization.md`

## Files Touched

### New files

- `apps/api/src/auth/session-store.ts`
- `apps/api/src/auth/auth-routes.ts`
- `apps/api/src/routes/inbox.ts`
- `apps/api/src/routes/ws-console.ts`
- `apps/web/src/stores/session-context.tsx`
- `apps/web/src/app/cprs/inbox/page.tsx`
- `apps/web/src/app/cprs/order-sets/page.tsx`
- `apps/web/src/app/cprs/remote-data-viewer/page.tsx`

### Modified files

- `apps/api/src/index.ts` — register cookie, websocket, auth routes, ws routes
- `apps/api/src/vista/rpcBrokerClient.ts` — `authenticateUser()` export
- `apps/api/src/routes/index.ts` — register inbox routes
- `apps/web/src/app/cprs/layout.tsx` — wrap with SessionProvider
- `apps/web/src/app/cprs/login/page.tsx` — real auth via POST /auth/login
- `apps/web/src/stores/cprs-ui-state.tsx` — layoutMode, expanded density
- `apps/web/src/stores/data-cache.tsx` — order state machine, signOrder, releaseOrder
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` — inbox/orderSets/signOut/remoteDataPage/layout actions
- `apps/web/src/components/cprs/CPRSModals.tsx` — WebSocket-backed legacy console
- `apps/web/src/components/cprs/panels/LabsPanel.tsx` — results workflow upgrade
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — modern sidebar layout
- `apps/web/src/app/cprs/settings/preferences/page.tsx` — layout mode + density options
