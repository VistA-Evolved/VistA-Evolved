# Phase 13 — CPRS Operationalization Runbook

> Covers: Authentication/Sessions, Inbox, Order Workflow, Results Workflow,
> Remote Data Viewer, Legacy Console WebSocket, Modern UI Toggle.

---

## Prerequisites

| Requirement               | Command / Check                                     |
| ------------------------- | --------------------------------------------------- |
| Docker WorldVistA running | `docker ps \| grep worldvista` → port 9430          |
| API env configured        | `apps/api/.env.local` exists with valid credentials |
| Node.js ≥ 20              | `node --version`                                    |
| pnpm installed            | `pnpm --version`                                    |

---

## 1. Authentication & Sessions

### Architecture

```
Browser → POST /auth/login { accessCode, verifyCode }
         → API opens temp TCP to VistA:9430
         → XWB handshake: TCPConnect, XUS SIGNON SETUP, XUS AV CODE
         → XUS GET USER INFO → parse DUZ, userName, division, facility
         → Create session (8h TTL), set ehr_session cookie
         → Return { ok, token, user }
```

### Endpoints

| Method | Path            | Auth    | Description                         |
| ------ | --------------- | ------- | ----------------------------------- |
| POST   | `/auth/login`   | None    | Authenticate with VistA credentials |
| POST   | `/auth/logout`  | Session | Destroy session                     |
| GET    | `/auth/session` | Session | Check current session               |

### Session Store

- **In-memory** (Map-based, resets on restart)
- **TTL**: 8 hours
- **Cleanup**: Every 5 minutes
- **Token**: 32-byte crypto random, hex-encoded
- **Cookie**: `ehr_session`, httpOnly, sameSite=lax

### Role Mapping

| Pattern                                | Role       |
| -------------------------------------- | ---------- |
| userName contains "PROVIDER" or "PHYS" | provider   |
| userName contains "NURSE" or "RN"      | nurse      |
| userName contains "PHARM"              | pharmacist |
| Default                                | clerk      |

### Testing

```bash
# Login
curl -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Check session (use token from login response)
curl http://127.0.0.1:3001/auth/session \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://127.0.0.1:3001/auth/logout \
  -H "Authorization: Bearer <token>"
```

---

## 2. Inbox / Tasks

### Endpoint

| Method | Path           | Auth   | Description              |
| ------ | -------------- | ------ | ------------------------ |
| GET    | `/vista/inbox` | None\* | Aggregated notifications |
| POST   | `/vista/inbox/acknowledge` | Session | Truthful acknowledge contract |

\*Uses server-side DUZ from env config. Future: tie to session DUZ.

### RPC Calls

- `ORWORB UNSIG ORDERS` — Unsigned orders for DUZ
- `ORWORB FASTUSER` — Fast user notifications

### Notification Parsing Contract

- `ORWORB FASTUSER` rows are not uniform. Some sandbox notifications start with
  a leading caret and omit a numeric notification IEN/DFN field.
- The API must parse those rows into clinician-readable `summary` text instead
  of surfacing the raw caret-delimited payload.
- `patientDfn` must only be populated when the parsed value is actually numeric.
  Never render `Open Chart` from a timestamp or other misparsed field.

### Acknowledge Contract

- `/cprs/inbox` may offer an `Acknowledge` action, but the backend route must
  exist even when the current VistA lane cannot persist the acknowledgement.
- In VEHU, acknowledgement persistence currently depends on `ORWORB KILL EXPIR
  MSG`, which is not available in the active sandbox.
- `POST /vista/inbox/acknowledge` must therefore return a structured
  `integration-pending` response instead of a missing-route `404`.
- The UI must keep the item visible and surface an explicit pending banner
  rather than crashing the page or pretending the acknowledgement succeeded.

### Item Types

`unsigned_order`, `abnormal_lab`, `pending_consult`, `flagged_result`,
`cosign_needed`, `notification`

### UI Route

`/cprs/inbox` — Full page with filter dropdown, priority indicators,
acknowledge & open-chart actions.

---

## 3. Order Workflow

### State Machine

```
draft → unsigned → signed → released
                          → discontinued
                          → cancelled
```

### Methods (DataCache)

| Method                         | Transition              |
| ------------------------------ | ----------------------- |
| `addOrder()`                   | Creates draft           |
| `signOrder(dfn, id, signedBy)` | draft/unsigned → signed |
| `releaseOrder(dfn, id)`        | signed → released       |

### UI Route

`/cprs/order-sets` — 12 quick-order templates across 4 categories:
Common Medications, Lab Orders, Imaging, Consults.

---

## 4. Results Workflow

### Flag Severity

| Flag   | Severity | Color            |
| ------ | -------- | ---------------- |
| HH, LL | Critical | Red (#dc2626)    |
| H, L   | Abnormal | Orange (#ea580c) |
| (none) | Normal   | Default          |

### Filter Modes

- **All** — Show all results
- **Abnormal Only** — H, L, HH, LL flags
- **Unacknowledged** — `acknowledged === false`

### Visual Indicators

- Left border color matches severity
- Critical/abnormal text colored
- Summary line: "X abnormal, Y critical, Z unacknowledged"

---

## 5. Remote Data Viewer

### UI Route

`/cprs/remote-data-viewer` — Full-page viewer with:

- Facility list panel (ORWCIRN FACLIST)
- 8 domain selectors: Allergies, Problems, Vitals, Labs, Meds, Notes, Orders, Consults
- Query status and results display

### Architecture Notes

- Docker sandbox = single facility (no CIRN/VistaLink network)
- Production would use ICN correlation across VistA instances
- FHIR R4 bridge planned for cross-facility data

---

## 6. Legacy Console WebSocket

### Endpoint

`GET /ws/console?token=<session_token>` (WebSocket upgrade)

### RBAC

- Allowed roles: `admin`, `provider`
- Token verified against session store

### Protocol

```json
// RPC call
{ "type": "rpc", "name": "ORWPT LIST ALL", "params": ["SMI","1"] }
→ { "type": "rpc-result", "name": "...", "lines": [...] }

// API proxy
{ "type": "api", "path": "/vista/ping" }
→ { "type": "api-result", "path": "...", "status": 200, "data": {...} }

// Heartbeat
{ "type": "ping" }
→ { "type": "pong", "ts": "..." }
```

### Security

- **Blocked RPCs**: `XUS AV CODE`, `XUS SET VISITOR` (credential-containing)
- **Audit log**: In-memory, max 500 entries
- **Audit endpoint**: `GET /admin/audit-log`

### UI

Legacy Console modal upgraded with:

- WebSocket connection with HTTP fallback
- Connection status indicator (green WS / yellow HTTP / red disconnected)
- Commands: `rpc <name> [params]`, `api <path>`, `ping`, `clear`, `help`

---

## 7. Modern UI Toggle

### Preferences

| Setting     | Options                                       | Default       |
| ----------- | --------------------------------------------- | ------------- |
| Layout Mode | `cprs` (Classic), `modern` (Modern)           | `cprs`        |
| Density     | `comfortable`, `compact`, `balanced`, `dense` | `comfortable` |

### Modern Mode

- Replaces tab strip with left sidebar navigation (180px)
- Active tab highlighted with left blue border
- All 10 clinical tabs available as sidebar links

### Persistence

Settings stored in `localStorage` key `cprs-preferences`.

---

## Troubleshooting

| Symptom                   | Likely Cause                    | Fix                                 |
| ------------------------- | ------------------------------- | ----------------------------------- |
| Login 401 "Auth failed"   | Wrong credentials or VistA down | Check Docker, use PROV123/PROV123!! |
| Login 500 "Server error"  | VistA port not reachable        | Verify port 9430 accessible         |
| WebSocket won't connect   | Invalid/expired token           | Re-login, check session TTL         |
| WebSocket "Access denied" | Wrong role                      | Only provider/admin can use console |
| Inbox empty               | Sandbox has no notifications    | Expected in clean Docker env        |
| Modern sidebar missing    | Layout mode not set             | Check Preferences → Layout Mode     |

---

## File Inventory

### New Files

| File                                                | Purpose                               |
| --------------------------------------------------- | ------------------------------------- |
| `apps/api/src/auth/session-store.ts`                | In-memory session management          |
| `apps/api/src/auth/auth-routes.ts`                  | Auth endpoints (login/logout/session) |
| `apps/api/src/routes/inbox.ts`                      | Inbox notification aggregation        |
| `apps/api/src/routes/ws-console.ts`                 | WebSocket console + audit             |
| `apps/web/src/stores/session-context.tsx`           | Frontend session provider             |
| `apps/web/src/app/cprs/inbox/page.tsx`              | Inbox UI page                         |
| `apps/web/src/app/cprs/order-sets/page.tsx`         | Order-set template browser            |
| `apps/web/src/app/cprs/remote-data-viewer/page.tsx` | Remote data viewer page               |

### Modified Files

| File                                                  | Changes                               |
| ----------------------------------------------------- | ------------------------------------- |
| `apps/api/src/index.ts`                               | Cookie, WebSocket, auth route plugins |
| `apps/api/src/vista/rpcBrokerClient.ts`               | `authenticateUser()` function         |
| `apps/api/src/routes/index.ts`                        | Inbox route registration              |
| `apps/web/src/app/cprs/layout.tsx`                    | SessionProvider wrapper               |
| `apps/web/src/app/cprs/login/page.tsx`                | Real VistA authentication             |
| `apps/web/src/stores/cprs-ui-state.tsx`               | Layout mode, extended density         |
| `apps/web/src/stores/data-cache.tsx`                  | Order state machine                   |
| `apps/web/src/components/cprs/CPRSMenuBar.tsx`        | New menu items                        |
| `apps/web/src/components/cprs/CPRSModals.tsx`         | WebSocket console modal               |
| `apps/web/src/components/cprs/panels/LabsPanel.tsx`   | Results flagging                      |
| `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`    | Modern sidebar layout                 |
| `apps/web/src/app/cprs/settings/preferences/page.tsx` | Layout/density options                |
