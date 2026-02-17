# Ops Summary  Fix All Known Gaps (Post-Phase 22)

## What Changed

### 1. `disconnect()` now uses `buildBye()` (BUG-038)
`rpcBrokerClient.ts` `disconnect()` was sending raw `#BYE#` bytes instead of
the properly XWB-framed message from `buildBye()`. Now fixed.

### 2. RBAC strict admin-only (BUG-039)
Three files allowed `provider` role to pass admin checks:
- `security.ts` auth gateway
- `imaging-proxy.ts` `requireAdmin()`
- `ws-console.ts` `allowedRoles`

All three now require strict `admin` role. The sandbox user PROVIDER,CLYDE
maps to `admin` via `mapUserRole()`, so no regression in dev testing.

### 3. VistA Imaging RPCs wired
- `GET /vista/imaging/patient-photos?dfn=X`  calls MAGG PAT PHOTOS
- `GET /vista/imaging/patient-images?dfn=X`  calls MAG4 PAT GET IMAGES
- Both gracefully degrade (return `available:false`) when RPCs are absent
- `GET /vista/imaging/status` now reports all 4 imaging RPC capabilities

### 4. Half-open socket detection (BUG-040)
- `lastActivityMs` timestamp tracks every successful send/receive
- `isSocketHealthy()` detects idle sockets (>5 min) and forces reconnect
- TCP keepalive enabled at 30s probe interval
- Socket `close`/`error` events mark `connected = false`

### 5. Documentation updates
- AGENTS.md entries #14, #24, #27, #28 updated to reflect resolved status
- BUG-TRACKER.md: Added BUG-038, BUG-039, BUG-040 with full details
- Quick reference table updated

## How to Test Manually

```bash
# 1. Start the API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Log in
curl -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# 3. Test MAGG PAT PHOTOS (expect graceful degradation on sandbox)
curl -b cookies.txt http://127.0.0.1:3001/vista/imaging/patient-photos?dfn=100022

# 4. Test MAG4 PAT GET IMAGES (expect graceful degradation on sandbox)
curl -b cookies.txt http://127.0.0.1:3001/vista/imaging/patient-images?dfn=100022

# 5. Check imaging status (should show 4 RPC capabilities)
curl -b cookies.txt http://127.0.0.1:3001/vista/imaging/status
```

## Verifier Output
- `npx tsc --noEmit`  EXIT: 0 (clean compile)
- VS Code diagnostics  0 errors across all 5 modified files

## Follow-ups
- Run `.\scripts\verify-phase22-imaging.ps1` when Docker is available
- Write automated tests for half-open socket detection
- Consider adding health-check pings to detect half-open state proactively
