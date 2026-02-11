# Phase 2: Docker Sandbox Setup & Troubleshooting

## Overview
This runbook walks you through starting the WorldVista-EHR Docker container ("wv") on Windows and verifying port 9430 connectivity for Phase 4 RPC server testing.

---

## Prerequisites
- Docker Desktop installed and running on Windows
- PowerShell 5.1+
- Node v24.13.0 and pnpm v10.29.2 (for apps/api when needed)

---

## A. Docker Desktop Restart (if experiencing issues)

Windows can sometimes leave Docker in an inconsistent state after failed pulls. A restart cleanses the environment:

```powershell
# Close Docker Desktop from system tray
# Then reopen it (Start Menu > Docker Desktop)
# Wait 60 seconds for it to fully initialize

# Verify Docker is active:
docker ps
```

Expected output: Docker responds with list of containers (may be empty).

---

## B. Clean Image Cache & Retry Pull

If you get "unexpected EOF" or similar pull errors, Docker's download was partially corrupted. Complete clean and retry:

```powershell
# Remove the incomplete/corrupted image
docker image rm worldvista/worldvista-ehr:latest

# Prune Docker build cache
docker builder prune -f

# Fresh pull from registry
docker pull worldvista/worldvista-ehr:latest
```

Expected output for pull: Layers download successfully, final line shows `Status: Downloaded newer image for worldvista/worldvista-ehr:latest`.

---

## C. Start Phase 2 Sandbox

From repository root, start the named "wv" container with dev profile:

```powershell
cd services\vista

# Clean slate: stop and remove any previous container
docker compose --profile dev down
docker rm -f wv

# Start fresh container in background
docker compose --profile dev up -d

# Verify container is running
docker ps
```

Expected output for `docker ps`:
```
CONTAINER ID   IMAGE                              COMMAND            CREATED         STATUS          PORTS
abc123def456   worldvista/worldvista-ehr:latest   "/bin/sh -c ..."   X seconds ago   Up X seconds    2222->22/tcp, 9430->9430/tcp, 8001->8001/tcp, 8080->8080/tcp, 9080->9080/tcp
```

---

## D. Verify Port 9430 Connectivity

From any PowerShell window, test if port 9430 is reachable from Windows:

```powershell
Test-NetConnection 127.0.0.1 -Port 9430
```

Expected output:
```
ComputerName     : 127.0.0.1
RemoteAddress    : 127.0.0.1
RemotePort       : 9430
TcpTestSucceeded : True
```

If `TcpTestSucceeded` is `True` → **Port 9430 is reachable. Phase 2 sandbox is ready.**

---

## E. Troubleshooting: If Port 9430 Not Reachable

View container logs to diagnose startup failures:

```powershell
docker logs wv --tail 100
```

Look for errors like:
- `Address already in use` → Another process on host or container port conflict
- `Connection refused` → Service not listening yet (wait 30 seconds, retry)
- `Bind mounts failed` → Docker permissions issue (restart Docker Desktop)

---

## F. Entering Container Shell (Advanced)

If you need to inspect or debug the container internally:

```powershell
docker exec -it wv sh
```

Once inside:
```sh
# List running processes
ps aux

# Check port listening
netstat -tlnp | grep 9430

# Exit container
exit
```

---

## G. Complete Diagnostics Script

Run this script to gather all Phase 2 troubleshooting info:

```powershell
Write-Host "=== Docker & Container State ===" -ForegroundColor Green
docker ps
docker ps -a

Write-Host "`n=== Image Status ===" -ForegroundColor Green
docker images | Select-String "worldvista"

Write-Host "`n=== Port 9430 Connectivity ===" -ForegroundColor Green
Test-NetConnection 127.0.0.1 -Port 9430

Write-Host "`n=== Container Logs (Last 20 Lines) ===" -ForegroundColor Green
docker logs wv --tail 20

Write-Host "`n=== Network Interfaces ===" -ForegroundColor Green
Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4"}
```

---

## Success Criteria

✓ `docker ps` shows wv container in "Up" status  
✓ `Test-NetConnection` returns `TcpTestSucceeded : True`  
✓ Stage Phase 2 complete; Phase 4 RPC tests can begin

---

## Next Steps (Phase 4 RPC Testing)

Once port 9430 is confirmed reachable:
1. Start apps/api on port 3001 (see windows-port-3001-fix.md if conflict)
2. Run Vista RPC patient search and default patient list tests
3. Confirm RPC broker connectivity through port 9430

See docs/runbooks/vista-rpc-patient-search.md for RPC testing details.
