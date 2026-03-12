# Web terminal verification — roll-and-scroll proof

> **Repeatable verification for the authentic web roll-and-scroll terminal path.** Backend route/socket, terminal health, and browser-level checks. Evidence required for proof.

---

## 1. Prerequisites

- **Runtime:** VistA lane running with SSH reachable (TERMINAL_READY pass). For local-vista: container Up, port 2224 open. See `docs/canonical/runtime/runtime-proof-checklist.md`.
- **API:** Running with correct `VISTA_SSH_HOST`, `VISTA_SSH_PORT`, `VISTA_SSH_USER`, `VISTA_SSH_PASSWORD` (e.g. for local-vista: port 2224, credentials matching the lane).
- **Browser:** Same origin or CORS with credentials so session cookie is sent to the API (e.g. web app on port 3000, API on 3001, both 127.0.0.1).

---

## 2. Backend verification

### 2.1 Terminal health (SSH reachability)

**Endpoint:** `GET /terminal/health`  
**Auth:** Admin (AUTH_RULES: `/terminal/` requires admin).

```powershell
# Login as admin, then:
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'   # or your lane credentials
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/terminal/health' -WebSession $session
```

**Pass:** Response has `ok: true`, `ssh.status: 'connected'`.  
**Fail:** `ok: false`, `ssh.status: 'timeout' | 'error'` — fix SSH host/port or VistA SSH daemon.

### 2.2 Terminal sessions (optional)

**Endpoint:** `GET /terminal/sessions`  
**Auth:** Admin.

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/terminal/sessions' -WebSession $session
```

**Pass:** `ok: true`, `sessions` array (may be empty).  
**Fail:** 403/401 — auth or route registration issue.

### 2.3 WebSocket upgrade (session required)

- Use a script or browser to open `ws://127.0.0.1:3001/ws/terminal` with the same session cookie.
- **Pass:** Connection upgrades, server sends `{ type: 'connected', sessionId }` after SSH shell is open (or `{ type: 'error', message }` if SSH fails but WS auth succeeded).
- **Fail:** 4001 Unauthorized — session missing or invalid.

---

## 3. Browser-level verification (manual)

1. **Login** to the web app (e.g. PRO1234 / PRO1234!! for VEHU).
2. **Open** `/cprs/vista-workspace`.
3. **Select** the **Terminal** mode (tab or toggle).
4. **Wait** for “Connected to VistA” (or “VistA Terminal” status green).
5. **Verify:** At VistA prompt (e.g. `Access: `), type Access/Verify codes; confirm real sign-in and menu (e.g. `D ^ZU` → Programmer menu).
6. **Resize** browser window; confirm terminal resizes and (if possible) that VistA sees new size.
7. **Copy/paste:** Copy a line from terminal; paste into notepad. Paste from notepad into terminal; confirm characters appear in VistA.

**Evidence:** Screenshot or short clip of step 5 (sign-in + menu), and note any failure (e.g. “SSH error: connect ECONNREFUSED”).

---

## 4. Scripted verification

- **Backend:** Run:
  ```powershell
  .\scripts\runtime\verify-web-terminal-backend.ps1
  ```
  Or with explicit API and credentials:
  ```powershell
  .\scripts\runtime\verify-web-terminal-backend.ps1 -ApiBase "http://127.0.0.1:3001" -AccessCode "PRO1234" -VerifyCode "PRO1234!!"
  ```
  Requires admin-capable session (e.g. PRO1234 for VEHU). Script: login, GET `/terminal/health`, GET `/terminal/sessions`.
- **Browser (optional):** Playwright smoke test loads `/cprs/vista-workspace`, selects Terminal mode, and asserts terminal UI is visible:
  ```powershell
  cd apps/web && pnpm exec playwright test e2e/terminal-roll-and-scroll.spec.ts
  ```
  Does not require VistA SSH; only checks page load and terminal component mount.

---

## 5. Proof checklist (summary)

| Check | Command / action | Pass condition |
|-------|-------------------|----------------|
| SSH reachable from host | Runtime healthcheck (TERMINAL_READY) | TCP 2224 (or configured port) open |
| Terminal health API | `GET /terminal/health` (with admin session) | `ok: true`, `ssh.status: 'connected'` |
| Terminal sessions API | `GET /terminal/sessions` (with admin session) | `ok: true` |
| WS upgrade | Open `/ws/terminal` with session cookie | Upgrade, then `connected` or SSH error (not 401) |
| Browser terminal page | Open `/cprs/vista-workspace` → Terminal | “Connected to VistA”, real VistA prompt |
| Authentic interaction | Sign in at VistA, run menu | Real response from VistA, no fake prompts |

---

## 6. What to capture for proof

- **Backend:** Output of `verify-web-terminal-backend.ps1` (or equivalent curl/Invoke-RestMethod).
- **Browser:** Whether session established (Connected/Disconnected/Error), and one successful sign-in + menu navigation (screenshot or clip).
- **Logs:** API log lines for one terminal connect/disconnect (sessionId, duz, sshHost, sshPort); any SSH error message.

---

## 7. Relation to other docs

- **Architecture** — `web-terminal-architecture.md`
- **Authenticity criteria** — `authentic-web-roll-and-scroll-criteria.md`
- **Runtime readiness** — `../runtime/runtime-readiness-levels.md`
