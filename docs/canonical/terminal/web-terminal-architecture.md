# Web terminal architecture — roll-and-scroll path

> **Architecture map for the authentic web-based VistA roll-and-scroll terminal.** Single source of truth for frontend route, component tree, backend bridge, runtime dependency, security, and session lifecycle.

---

## 1. Overview

The **roll-and-scroll** terminal path provides a real VT220-style session to VistA over SSH, bridged through the API via WebSocket. The browser never talks SSH directly; the API performs SSH and forwards TTY I/O over WebSocket.

```
Browser (xterm.js) ←→ WebSocket (/ws/terminal) ←→ API (SSH proxy) ←→ SSH ←→ VistA (D ^ZU, etc.)
```

---

## 2. Frontend

### 2.1 Canonical route / page

| Item | Value |
|------|--------|
| **Route** | `/cprs/vista-workspace` |
| **Mode** | User selects **Terminal** in the workspace (Modern GUI / Hybrid / Terminal). |
| **Component** | `VistaSshTerminal` (dynamic import, no SSR). |

Alternative entry: **Hybrid** mode on the same page shows `VistaSshTerminal` in a split pane (same WebSocket path).

There is no dedicated `/cprs/terminal` route today; the canonical roll-and-scroll entry is **VistA Workspace → Terminal** (or Hybrid).

### 2.2 Component tree

```
VistaWorkspacePage (vista-workspace/page.tsx)
  └─ ViewMode = 'terminal' | 'hybrid' | 'gui'
  └─ [Terminal] → VistaSshTerminal (components/terminal/VistaSshTerminal.tsx)
  └─ [Hybrid]   → HybridMode → VistaSshTerminal
```

- **VistaSshTerminal:** Builds WS URL from `API_BASE` (or prop), connects to `/ws/terminal`, loads xterm.js + FitAddon, forwards:
  - **Browser → API:** `onData` (keystrokes) as raw bytes; optional JSON control messages `{ type: 'resize', cols, rows }`, `{ type: 'ping' }`.
  - **API → Browser:** Raw TTY output (Buffer); JSON control messages `{ type: 'connected' | 'disconnected' | 'error', ... }`.
- **VistaTerminal** (vista-admin embed) and **BrowserTerminal** (admin terminal page) use **/ws/console** (RPC console), not this roll-and-scroll path.

### 2.3 API base and WebSocket URL

- **API_BASE** from `apps/web/src/lib/api-config.ts`: `NEXT_PUBLIC_API_URL` or `http(s)://${window.location.hostname}:3001`.
- **WS URL for roll-and-scroll:** `WS_BASE + '/ws/terminal'` (e.g. `ws://127.0.0.1:3001/ws/terminal`). Credentials are session cookie (same-origin or CORS with credentials).

---

## 3. Backend

### 3.1 Route / socket

| Item | Value |
|------|--------|
| **WebSocket** | `GET /ws/terminal` (Fastify websocket). |
| **HTTP (admin)** | `GET /terminal/health`, `GET /terminal/sessions`. |
| **Module** | `apps/api/src/routes/ws-terminal.ts` → `wsTerminalRoutes(server)`. |
| **Registration** | `server/register-routes.ts` registers `wsTerminalRoutes`. |

### 3.2 Bridge logic

- On WebSocket upgrade:
  1. **Auth:** Session from cookie or `?token=` query. If missing → close 4001 Unauthorized.
  2. **Concurrency:** Cap active sessions (`VISTA_TERMINAL_MAX_SESSIONS`, default 50). If at cap → close 4003.
  3. **SSH:** Create `ssh2` client to `VISTA_SSH_HOST`:`VISTA_SSH_PORT` (credentials from env). On `ready`, open shell with `term: 'xterm-256color', cols: 80, rows: 24`.
  4. **Forwarding:**  
     - SSH stream `data` / `stderr` → `socket.send(data)`.  
     - `socket.on('message')` → if JSON `resize`/`ping`, handle; else `stream.write(msg)`.
  5. **Lifecycle:** On socket or SSH close/error, cleanup: remove from `activeSessions`, `ssh.end()`, audit disconnect.

### 3.3 Env configuration

| Env var | Default | Purpose |
|---------|--------|---------|
| `VISTA_SSH_HOST` | `VISTA_HOST` or `127.0.0.1` | SSH host (VistA server or port-forward). |
| `VISTA_SSH_PORT` | `2223` | SSH port on host. For **local-vista** lane use `2224`. |
| `VISTA_SSH_USER` | `vista` | SSH username. |
| `VISTA_SSH_PASSWORD` | `vista` | SSH password. |
| `VISTA_TERMINAL_MAX_SESSIONS` | `50` | Max concurrent terminal sessions. |
| `VISTA_TERMINAL_RECORD` | (unset) | Set `true` to enable session recording (if implemented). |

---

## 4. Runtime dependency on VistA

- The **API** must be able to open a TCP connection to the VistA SSH host:port.
- For **local-vista** lane: container exposes SSH on host port **2224**; set `VISTA_SSH_PORT=2224` (and optionally `VISTA_SSH_HOST=127.0.0.1`) in API env.
- For **VEHU** or other lanes: use that lane’s SSH host/port; ensure TERMINAL_READY (TCP to SSH port) passes before claiming terminal is ready.
- No RPC broker or HTTP endpoint is required for the terminal path; only SSH is used.

---

## 5. Security assumptions

- **Auth:** `/ws/terminal` requires a valid **session** (cookie or `?token=`). Not admin-only; any authenticated user can open a terminal (session auth level in `security.ts`: `pattern: /^\/ws\//, auth: 'session'`).
- **Credentials:** SSH credentials live only on the server (env); never sent to the browser.
- **Audit:** Connect and disconnect are audited (`rpc.console-connect`, `rpc.console-disconnect`) with session identity and sessionId.
- **Blocklist:** Credential-stealing RPCs are blocked on the **RPC console** (`/ws/console`), not on the SSH terminal; the SSH terminal is a full TTY to VistA, so access control is by session + VistA sign-in.

---

## 6. Session lifecycle

1. **User** opens `/cprs/vista-workspace`, selects **Terminal** (or **Hybrid**).
2. **VistaSshTerminal** mounts, builds WS URL, calls `new WebSocket(effectiveWsUrl)` with credentials (cookie).
3. **API** accepts upgrade, validates session, opens SSH to VistA, opens shell, sends `{ type: 'connected', sessionId }`.
4. **Client** shows “Connected to VistA”, forwards keystrokes and resize; **API** forwards TTY in/out.
5. **Disconnect:** User closes tab, or network drops, or API/SSH closes → cleanup, audit disconnect, session removed from `activeSessions`.

---

## 7. Relation to other docs

- **Authenticity criteria** — `docs/canonical/terminal/authentic-web-roll-and-scroll-criteria.md`
- **Verification steps** — `docs/canonical/terminal/web-terminal-verification.md`
- **Runtime readiness** — `docs/canonical/runtime/runtime-readiness-levels.md` (TERMINAL_READY = SSH port reachable)
- **Local-vista lane** — `docs/canonical/runtime/local-vista-lane-inspect.md` (ports 9432 RPC, 2224 SSH)
