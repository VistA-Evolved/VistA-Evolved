# Phase 13: CPRS Operationalization — VERIFY

## Pre-flight Checks

- [ ] Docker WorldVistA container running (`docker ps | grep worldvista`)
- [ ] API server starts cleanly (`pnpm -C apps/api dev`)
- [ ] Web server starts cleanly (`pnpm -C apps/web dev`)

## Section A — Authentication

- [ ] `POST /auth/login` with `{ "accessCode": "PROV123", "verifyCode": "PROV123!!" }` returns `ok: true` with session token
- [ ] `POST /auth/login` with bad credentials returns 401
- [ ] `GET /auth/session` with valid Bearer token returns user info
- [ ] `GET /auth/session` without token returns `authenticated: false`
- [ ] `POST /auth/logout` clears session
- [ ] Login page at `/cprs/login` authenticates and redirects to patient search

## Section B — Inbox

- [ ] `GET /vista/inbox` returns item array (may be empty in sandbox)
- [ ] `/cprs/inbox` page renders with filter controls
- [ ] Acknowledge button removes item from view
- [ ] "Open Chart" navigates to patient chart

## Section C — Order Workflow

- [ ] `/cprs/order-sets` page renders with template cards
- [ ] "Add to Orders" creates draft order in DataCache
- [ ] Orders tab shows draft/unsigned/signed/released statuses
- [ ] Sign/Release helpers update order status correctly

## Section D — Results Workflow

- [ ] Labs panel shows abnormal flags in orange (H/L)
- [ ] Labs panel shows critical flags in red (HH/LL)
- [ ] Filter: "Abnormal Only" shows only flagged results
- [ ] Filter: "Unacknowledged" shows only unacknowledged results
- [ ] "Ack All" button acknowledges all visible results

## Section E — Remote Data Viewer

- [ ] `/cprs/remote-data-viewer` page renders with facility/domain panels
- [ ] Shows architectural placeholder for Docker sandbox
- [ ] Domain selector lists 8 clinical domains
- [ ] Menu bar: Tools → Remote Data Viewer (Page) navigates to page

## Section F — Legacy Console WebSocket

- [ ] WebSocket connects at `ws://127.0.0.1:3001/ws/console?token=<token>`
- [ ] `{ "type": "rpc", "name": "ORWPT LIST ALL", "params": ["SMI","1"] }` returns results
- [ ] `{ "type": "api", "path": "/vista/ping" }` returns ping response
- [ ] `{ "type": "ping" }` returns pong
- [ ] Blocked RPCs (XUS AV CODE) return error
- [ ] Console modal shows WS/HTTP connection indicator
- [ ] `GET /admin/audit-log` returns audit entries

## Section G — Modern UI Toggle

- [ ] Preferences page shows Layout Mode dropdown (Classic CPRS / Modern)
- [ ] Preferences page shows 4 density options
- [ ] Selecting "Modern" layout shows sidebar navigation instead of tab strip
- [ ] Sidebar highlights active tab
- [ ] All tab panels still render correctly in modern mode

## Section H — Build Integrity

- [ ] TypeScript compiles without errors (`pnpm -C apps/api build`)
- [ ] No credential leaks in logs or UI
- [ ] Session expiration works (8-hour TTL)
- [ ] About modal shows Phase 13 info
