# Authentic web roll-and-scroll terminal — criteria

> **What “authentic enough” means for the browser-based VistA terminal.** A real VistA-trained user must be able to use it naturally. No fake prompt rendering; actual interaction with the VistA runtime.

---

## 1. Scope

This document applies to the **roll-and-scroll** terminal path only:

- **Browser** → WebSocket → **API SSH proxy** → **SSH** → **VistA** (e.g. `D ^ZU`, FileMan, Kernel menus).
- It does **not** define authenticity for the RPC console (`/ws/console`), which is a different protocol (JSON RPC, not raw TTY).

---

## 2. Authenticity criteria

### 2.1 Stable session

- The terminal session stays connected for normal use (menus, data entry, scrolling).
- Short network blips may trigger reconnection; the client may offer reconnect with backoff.
- Session is bound to the same HTTP auth (session cookie); no silent swap of user identity mid-session.
- **Pass:** User can complete a multi-step VistA flow (e.g. sign in at VistA prompt, run a menu, exit) without unexpected disconnect.
- **Fail:** Repeated disconnects during normal typing; session attributed to wrong user.

### 2.2 Keyboard fidelity

- Every key (including Enter, Backspace, arrows, F-keys, Ctrl combinations) is sent to VistA as the same byte sequence a real VT220/ANSI terminal would send.
- No client-side interpretation of VistA-specific sequences; the server (VistA) receives the same input as with a hardware terminal.
- **Pass:** User can navigate menus with arrows, use Tab, type accented characters if the VistA account supports it, and see correct echo/response.
- **Fail:** Keys dropped, wrong escape sequences, or local handling that changes what VistA receives.

### 2.3 Copy/paste

- **Copy:** User can select text in the terminal and copy to system clipboard (browser/OS). No requirement to paste into VistA.
- **Paste:** User can paste from system clipboard into the terminal; pasted text is sent to VistA as if typed (with optional rate limiting or line-by-line to avoid overwhelming the host).
- **Pass:** Copy from terminal works in browser; paste into terminal results in the same characters received by VistA (visible in VistA echo or next prompt).
- **Fail:** Paste does nothing, or pasted text is altered before reaching VistA.

### 2.4 Resize behavior

- On browser or panel resize, the terminal sends the new dimensions (rows/cols) to the backend; the SSH PTY is resized so VistA receives SIGWINCH-style behavior.
- No fake local-only resize: the actual PTY size seen by VistA must change.
- **Pass:** Resize browser window; run a command that reflects size (e.g. `stty size` in shell, or VistA prompt that shows dimensions); value matches the visible terminal size.
- **Fail:** Resize only changes the browser view; VistA still sees the old size.

### 2.5 No fake prompt rendering

- The terminal displays only what the VistA runtime sends over the wire (SSH → proxy → WebSocket → client). No client-side synthesis of prompts, menus, or responses.
- Optional: connection-status or “Connected to VistA” banner is clearly distinguished (e.g. one-time message or status bar) and not part of the stream from VistA.
- **Pass:** Every line the user sees after “Connected” comes from the SSH stream. No local mock prompts or fake menu text.
- **Fail:** Any prompt or menu text is generated in the frontend instead of from VistA.

### 2.6 Actual interaction with the VistA runtime

- The SSH connection is to a real VistA host (or approved test image). Input is executed by that host; output is the host’s response.
- **Pass:** User types Access/Verify at VistA prompt and gets real sign-in; navigates to Programmer menu, FileMan, or TaskMan and sees real data/responses.
- **Fail:** Input is discarded or echoed by a stub; output is canned or from a non-VistA source.

### 2.7 Usable by a real VistA-trained user

- A user familiar with roll-and-scroll VistA (e.g. DUZ/name, `D ^ZU`, FileMan, Kernel menus) can use the web terminal without retraining for “web-only” behavior.
- Scrolling (scrollback), selection, and basic terminal behavior match expectations (no inverted or missing scroll, no broken line wrap).
- **Pass:** VistA-trained user completes a real workflow (e.g. lookup, edit, sign-off) using only the browser terminal.
- **Fail:** User must learn web-specific shortcuts or work around missing/broken behavior that exists on a real terminal.

---

## 3. Out of scope (for this document)

- RPC console (`/ws/console`) authenticity — different protocol and use case.
- GUI replacement features (side-by-side forms, modern UI).
- Administration dashboards or terminal session management UI beyond “connect / disconnect / status”.
- Performance benchmarks (latency, throughput) — defined elsewhere if needed.
- Accessibility (screen readers, etc.) — important but separate criteria.

---

## 4. Verification

- **Backend:** SSH proxy connects to the configured VistA SSH host/port; `/terminal/health` proves SSH reachability; `/ws/terminal` upgrades with session and establishes SSH shell.
- **Browser:** Load the canonical terminal route, establish session, confirm “Connected to VistA” and real VistA prompt/output; exercise keyboard, paste, resize; confirm no fake prompts.
- **Evidence:** Logs (API, SSH), screenshot or short clip of a full sign-in + menu navigation, and verification script output.

See `web-terminal-verification.md` for exact steps and proof checklist.
