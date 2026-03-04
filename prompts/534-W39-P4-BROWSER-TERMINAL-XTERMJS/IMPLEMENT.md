# Phase 534 — Browser Terminal (xterm.js)

## Objective

Add a browser-based terminal component using xterm.js for VistA MUMPS
interaction. Admin-only. Uses WebSocket relay through the existing
`/ws/console` gateway with the RPC blocklist (see AGENTS.md #25).

## Meta-Rule

Fork-first: install `@xterm/xterm` and `@xterm/addon-fit` from npm.
Never vendor the source.

## Implementation Steps

### Step 1: Add xterm.js dependencies to web app

Add `@xterm/xterm` and `@xterm/addon-fit` to `apps/web/package.json`.

### Step 2: Create Terminal component

Create `apps/web/src/components/terminal/BrowserTerminal.tsx`:

- Client-only component (no SSR)
- Connects to `ws://localhost:3001/ws/console` (or env-configured)
- xterm.js instance with fit addon
- Dark theme matching existing admin panels
- Auto-reconnect on disconnect
- Status indicator (connected/disconnected/error)

### Step 3: Create admin terminal page

Create `apps/web/src/app/cprs/admin/terminal/page.tsx`:

- Admin-only page
- Embeds BrowserTerminal component
- Connection info header
- Warning banner about RPC blocklist

### Step 4: Check WS console route exists

Verify `apps/api/src/routes/ws-console.ts` exists and is registered.
If it doesn't exist, create a minimal stub that echoes input.

### Step 5: Evidence + verifier

## Files Changed/Created

- `apps/web/package.json` (modify - add xterm deps)
- `apps/web/src/components/terminal/BrowserTerminal.tsx` (new)
- `apps/web/src/app/cprs/admin/terminal/page.tsx` (new)
- `scripts/verify-phase534-browser-terminal.ps1` (new)
- `evidence/wave-39/534-W39-P4-BROWSER-TERMINAL/` (new)
