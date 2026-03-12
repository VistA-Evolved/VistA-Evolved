# Stage 5 execution report — Authentic web roll-and-scroll terminal

> **Objective:** Audit, repair if needed, and prove the authentic web-based VistA roll-and-scroll terminal path. Terminal truth only; no GUI mapping or admin dashboards.

---

## 1. Terminal files found (inspection)

### Backend

| File | Purpose |
|------|--------|
| `apps/api/src/routes/ws-terminal.ts` | WebSocket `/ws/terminal` → SSH proxy; GET `/terminal/health`, GET `/terminal/sessions` |
| `apps/api/src/routes/ws-console.ts` | WebSocket `/ws/console` — RPC console (JSON protocol), **not** roll-and-scroll |
| `apps/api/src/server/register-routes.ts` | Registers `wsTerminalRoutes` |
| `apps/api/src/middleware/security.ts` | `/ws/*` → session; `/terminal/*` → admin |

### Frontend

| File | Purpose |
|------|--------|
| `apps/web/src/components/terminal/VistaSshTerminal.tsx` | Roll-and-scroll: connects to `/ws/terminal`, xterm.js, forwards TTY |
| `apps/web/src/components/terminal/BrowserTerminal.tsx` | RPC console: connects to `/ws/console` |
| `apps/web/src/components/cprs/VistaTerminal.tsx` | RPC console: connects to `/ws/console` (embed in vista-admin) |
| `apps/web/src/components/terminal/HybridMode.tsx` | Uses VistaSshTerminal (roll-and-scroll) in split pane |
| `apps/web/src/app/cprs/vista-workspace/page.tsx` | Canonical roll-and-scroll route: Terminal / Hybrid / GUI modes |
| `apps/web/src/app/cprs/admin/terminal/page.tsx` | Admin RPC console page (BrowserTerminal → `/ws/console`) |

### Auth / session

- **Roll-and-scroll:** Session cookie (or `?token=`) required for `/ws/terminal`. Any authenticated user.
- **RPC console:** Session + admin role for `/ws/console`; `/terminal/health` and `/terminal/sessions` require admin.

---

## 2. Files changed (this stage)

| File | Change |
|------|--------|
| `docs/canonical/terminal/authentic-web-roll-and-scroll-criteria.md` | **Created** — authenticity criteria (stable session, keyboard, copy/paste, resize, no fake prompts, real VistA, usable by VistA user) |
| `docs/canonical/terminal/web-terminal-architecture.md` | **Created** — architecture map (frontend route, component tree, backend bridge, env, security, lifecycle) |
| `docs/canonical/terminal/web-terminal-verification.md` | **Created** — verification steps, proof checklist, script references |
| `scripts/runtime/verify-web-terminal-backend.ps1` | **Created** — backend verification: login, GET /terminal/health, GET /terminal/sessions |
| `apps/web/e2e/terminal-roll-and-scroll.spec.ts` | **Created** — Playwright smoke: vista-workspace load, Terminal mode, terminal UI visible; **extended** — live WebSocket test: connect, type, confirm session stability, screenshot evidence |
| `apps/web/src/components/terminal/VistaSshTerminal.tsx` | **Updated** — added `data-terminal-status={status}` for e2e wait on connected |
| `apps/api/.env.example` | **Updated** — added VISTA_SSH_HOST, VISTA_SSH_PORT, VISTA_SSH_USER, VISTA_SSH_PASSWORD comments |

No changes to `ws-terminal.ts` or vista-workspace page logic; path was already implemented and wired.

---

## 3. Route and backend endpoint used

| Item | Value |
|------|--------|
| **Frontend route** | `/cprs/vista-workspace` — user selects **Terminal** (or **Hybrid**) |
| **WebSocket** | `ws://127.0.0.1:3001/ws/terminal` (or wss when HTTPS) |
| **HTTP (admin)** | `GET /terminal/health`, `GET /terminal/sessions` |
| **Backend module** | `apps/api/src/routes/ws-terminal.ts` |

---

## 4. Session established

- **Backend:** Login with PRO1234/PRO1234!! returned a session; GET `/terminal/health` and GET `/terminal/sessions` succeeded with that session (admin).
- **SSH:** `/terminal/health` reported `ssh.status=connected` — API successfully connected to VistA SSH at configured host/port.
- **Browser:** Playwright test authenticated (auth setup), opened `/cprs/vista-workspace`, clicked Terminal mode, and confirmed terminal UI (VistA Terminal / Connected|Connecting|Disconnected) visible.
- **Full browser proof (Stage 5 extension):** Playwright test established live WebSocket session, waited for `[data-terminal-status="connected"]`, focused terminal, sent Enter + `D ^ZU` + Enter, waited for VistA response, confirmed session still connected, and captured screenshot at `apps/web/e2e-report/terminal-live-proof.png`. All three tests passed (setup, smoke, live interaction).

---

## 5. What worked

- **Backend verification script:** All three gates passed (G1 login, G2 /terminal/health connected, G3 /terminal/sessions).
- **SSH connectivity:** API → VistA SSH connection succeeded (health check).
- **Playwright smoke:** vista-workspace loaded, Terminal mode selected, terminal component rendered.
- **Playwright live proof:** WebSocket connected, terminal received `connected` message, keyboard input (Enter, `D ^ZU`, Enter) sent to VistA, session remained connected; screenshot saved to `e2e-report/terminal-live-proof.png`.
- **Docs:** Canonical criteria, architecture, and verification docs created; .env.example documents SSH terminal env vars.

---

## 6. What failed

- Nothing in this stage. If VistA SSH had been down, G2 would have failed with `ssh.status=timeout` or `error`; in the run above it was `connected`.

---

## 7. Exact proof evidence

### Backend verification (run 2025-03-12)

**Command:**
```powershell
.\scripts\runtime\verify-web-terminal-backend.ps1 -ApiBase "http://127.0.0.1:3001" -AccessCode "PRO1234" -VerifyCode "PRO1234!!"
```

**Output:**
```
=== Web terminal backend verification (roll-and-scroll path) ===
  API: http://127.0.0.1:3001

  PASS  G1 -- Login (session)
        role=
  PASS  G2 -- GET /terminal/health
        ssh.status=connected
  PASS  G3 -- GET /terminal/sessions
        count=0 maxConcurrent=50

--- Summary ---
  PASS: 3  FAIL: 0
  WebSocket /ws/terminal: verify in browser at /cprs/vista-workspace (Terminal mode).
```
Exit code: 0.

### Browser smoke + live interaction (Playwright)

**Command:**
```powershell
cd apps\web; pnpm exec playwright test e2e/terminal-roll-and-scroll.spec.ts --reporter=list
```

**Output (full run, including live WebSocket proof):**
```
  ok 1 [setup] › e2e\auth.setup.ts › authenticate via API (7.4s)
  ok 2 [chromium] › e2e\terminal-roll-and-scroll.spec.ts › vista-workspace loads and Terminal mode shows terminal UI (14.0s)
  ok 3 [chromium] › e2e\terminal-roll-and-scroll.spec.ts › live WebSocket session: connect, type, confirm VistA response and session stability (8.7s)

  3 passed (36.1s)
```

**Evidence:** Screenshot of live terminal interaction (keyboard input, VistA prompt/response, session connected):  
`apps/web/e2e-report/terminal-live-proof.png`

---

## 8. What stage should run next

- **Done for Stage 5:** Full browser session proved (login → vista-workspace → Terminal → WebSocket connected → type at VistA prompt → session stable; evidence in `e2e-report/terminal-live-proof.png`).
- **Optional:** Run manual browser verification from `web-terminal-verification.md` (sign in at VistA, run a menu, resize, copy/paste) and attach screenshot/clip to this report or artifacts.
- **Next slice:** Proceed to Slice 001 only after runtime truth and terminal truth are accepted; do not begin Slice 001 until then.

---

## 9. Relation to other docs

- **Authenticity criteria** — `docs/canonical/terminal/authentic-web-roll-and-scroll-criteria.md`
- **Architecture** — `docs/canonical/terminal/web-terminal-architecture.md`
- **Verification** — `docs/canonical/terminal/web-terminal-verification.md`
- **Runtime readiness** — `docs/canonical/runtime/runtime-readiness-levels.md` (TERMINAL_READY)
