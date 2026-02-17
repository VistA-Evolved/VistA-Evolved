# 24-03 — Fix All Known Gaps (Post-Phase 22)

## User Request
> "fix all the known gaps"

Fix every documented technical-debt item and known gap from AGENTS.md,
BUG-TRACKER.md, and the Phase 22 VERIFY summary.

## Implementation Steps

### 1. AGENTS.md #28 — `buildBye()` dead code
- Changed `disconnect()` to call `buildBye()` for properly XWB-framed `#BYE#`
- Previously sent raw `#BYE#` which only worked because socket was destroyed immediately after

### 2. AGENTS.md #24 — RBAC provider=admin debt
- Tightened `requireAdmin()` in `imaging-proxy.ts` to strict admin-only
- Tightened auth gateway in `security.ts` admin check to strict admin-only
- Tightened `allowedRoles` in `ws-console.ts` to `["admin"]` only
- Sandbox user PROVIDER,CLYDE → mapped to `admin` in `session-store.ts`, so no regression

### 3. Phase 22 gap — MAGG PAT PHOTOS / MAG4 PAT GET IMAGES
- Added `GET /vista/imaging/patient-photos?dfn=X` endpoint
- Added `GET /vista/imaging/patient-images?dfn=X` endpoint
- Both use `optionalRpc()` capability check with graceful degradation
- Updated `/vista/imaging/status` to report capabilities for all 4 imaging RPCs

### 4. AGENTS.md #14 — Half-open socket detection
- Added `lastActivityMs` timestamp tracking via `touchActivity()` on every send/receive
- Added `isSocketHealthy()` — if idle >5 min, forces reconnection
- Enabled TCP keepalive (30s probe interval) on new sockets
- Added `close`/`error` event listeners that mark `connected = false`
- Updated `connect()` guard to use `isSocketHealthy()` instead of simple boolean check
- Stale sockets are cleanly destroyed before reconnecting

### 5. AGENTS.md #27 — Graceful shutdown
- Already fixed in security.ts — SIGINT/SIGTERM handlers call `disconnectRpcBroker()`
- Updated AGENTS.md entry to reflect resolved status

## Verification Steps
- [x] `npx tsc --noEmit` exits 0 (clean compile)
- [x] VS Code diagnostics: 0 errors across all 5 modified files
- [ ] Manual: `curl /vista/imaging/patient-photos?dfn=100022`
- [ ] Manual: `curl /vista/imaging/patient-images?dfn=100022`
- [ ] Phase 22 verifier: `.\scripts\verify-phase22-imaging.ps1`

## Files Touched
- `apps/api/src/vista/rpcBrokerClient.ts` — buildBye, half-open detection
- `apps/api/src/routes/imaging-proxy.ts` — RBAC tightening
- `apps/api/src/middleware/security.ts` — RBAC tightening
- `apps/api/src/routes/ws-console.ts` — RBAC tightening
- `apps/api/src/services/imaging-service.ts` — MAGG/MAG4 endpoints + status
- `AGENTS.md` — Updated entries #14, #24, #27, #28
- `docs/BUG-TRACKER.md` — Added BUG-038, BUG-039, BUG-040
