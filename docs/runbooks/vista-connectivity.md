# VistA Connectivity Test (Phase 3)

This runbook explains how to verify that the Node.js API (apps/api) can reach the Phase 2 VistA sandbox.

## Prerequisites

- Node.js 24.13.0 + pnpm 10.29.2 installed
- Docker Desktop running
- Repo: `C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved`

## Step 1: Start the VistA sandbox (if not running)

From repo root:

```powershell
cd services\vista
docker compose --profile dev up -d
```

Expected output:
```
[+] Running 1/1
 ✓ Container wv  Started
```

## Step 2: Verify sandbox container is running

```powershell
docker ps
```

Look for the `wv` container with status `Up`:

```
CONTAINER ID   IMAGE                            STATUS          PORTS
abc12345...    worldvista/worldvista-ehr:latest Up 15 seconds   0.0.0.0:2222->22/tcp, 0.0.0.0:9430->9430/tcp, ...
```

## Step 3: Test RPC port directly (Windows network check)

Verify that port 9430 is actually listening on the host:

```powershell
Test-NetConnection 127.0.0.1 -Port 9430
```

Expected output (if sandbox is ready):
```
ComputerName     : 127.0.0.1
RemoteAddress    : 127.0.0.1
RemotePort       : 9430
TcpTestSucceeded : True
```

**Note:** If `TcpTestSucceeded` is `False`, the container may still be initializing. Wait 10–30 seconds and try again.

## Step 4: Install and run the API

From repo root:

```powershell
pnpm -r install
pnpm -C apps/api dev
```

Expected output (API starts):
```
Server listening on http://127.0.0.1:3001
```

## Step 5: Test the /vista/ping endpoint (in new terminal)

```powershell
curl http://127.0.0.1:3001/vista/ping -UseBasicParsing
```

### Case A: Sandbox is reachable

Expected output:
```
StatusCode        : 200
StatusDescription : OK
Content           : {"ok":true,"vista":"reachable","port":9430}
```

This confirms the API successfully connected to the VistA RPC port.

### Case B: Sandbox is not reachable

Expected output:
```
StatusCode        : 200
StatusDescription : OK
Content           : {"ok":false,"vista":"unreachable","error":"<reason>","port":9430}
```

Common reasons for unreachability:
- Container not running: `docker ps` to check; `docker compose up -d` to start
- Port 9430 blocked: `Test-NetConnection 127.0.0.1 -Port 9430` to verify
- Container still initializing: Wait 30 seconds and retry

## Step 6: Compare with /health endpoint

For reference, the basic health endpoint:

```powershell
curl http://127.0.0.1:3001/health -UseBasicParsing
```

Expected output:
```
Content           : {"ok":true}
```

## Interpretation

| Endpoint | Status | Meaning |
|----------|--------|---------|
| GET /health | `{"ok":true}` | API is running |
| GET /vista/ping | `{"ok":true,"vista":"reachable",...}` | **API can reach VistA RPC port** ✅ |
| GET /vista/ping | `{"ok":false,"vista":"unreachable",...}` | VistA sandbox not reachable ❌ |

## Next Steps (Phase 3+)

1. **RPC login**: Once connectivity is confirmed, implement RPC login using mg-dbx-napi.
   - Locate VistA credentials (typically in WorldVistA image docs).
   - Add them to environment variables (.env) or secrets manager (not committed to repo).
   
2. **Simple RPC call**: Execute a basic VistA RPC (e.g., `XUS AV CODE`) to validate authentication.

3. **Patient lookup**: Build a `/vista/patients` endpoint that queries the PATIENT file using RPC.

See `services/vista/README.md` for links to Phase 3+ planning.

## Troubleshooting

### curl returns 404
- API may not recognize the route. Verify apps/api/src/index.ts contains the /vista/ping handler.
- Restart API: `Ctrl+C` in running pnpm terminal, then `pnpm -C apps/api dev` again.

### docker container exits immediately
- Check logs: `docker logs wv`
- May be a broken image; try pulling fresh: `docker pull worldvista/worldvista-ehr:latest`

### Port 9430 firewall blocked (Windows)
- Check Windows Firewall: `netsh advfirewall firewall show rule name="all" | findstr 9430`
- If needed, add firewall rule (requires admin):
  ```powershell
  New-NetFirewallRule -DisplayName "VistA RPC" -Direction Inbound -LocalPort 9430 -Protocol TCP -Action Allow
  ```

### Port 3001 already in use (API won't start)
- Find process: `Get-NetTCPConnection -LocalPort 3001 | Select-Object -Expand OwningProcess`
- Kill it: `taskkill /PID <PID> /F`
- Or use a different port: `$env:PORT=3002; pnpm -C apps/api dev`
