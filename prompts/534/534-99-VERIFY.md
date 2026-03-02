# Phase 534 — VERIFY: Browser Terminal

## Gates (10)

| Gate | Check |
|------|-------|
| G1 | `@xterm/xterm` in web package.json dependencies |
| G2 | `@xterm/addon-fit` in web package.json dependencies |
| G3 | `BrowserTerminal.tsx` component exists |
| G4 | Component uses `Terminal` from `@xterm/xterm` |
| G5 | Component connects to WebSocket endpoint |
| G6 | Admin terminal page exists at `/cprs/admin/terminal` |
| G7 | Page contains warning about RPC blocklist |
| G8 | Component has reconnect logic |
| G9 | No PHI or credentials in component code |
| G10 | Evidence directory exists |
