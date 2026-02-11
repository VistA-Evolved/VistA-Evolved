# Local VistA Sandbox (Docker)

This runbook explains how to start, verify, and interact with the WorldVistA sandbox container for Phase 2 development.

## Prerequisites

- Docker Desktop installed and running
- Port 9430 available (or configure alternative in docker-compose.yml)
- From repo root: `C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved`

## Starting the sandbox

From the repo root, start the container:

```powershell
cd services\vista
docker compose --profile dev up -d
```

Expected output:
```
[+] Running 1/1
 ✓ Container wv  Started
```

## Verify container is running

```bash
docker ps
```

Look for the `wv` container with status `Up` and all ports bound (2222, 9430, 8001, 8080, 9080).

## Verify RPC port is listening

From PowerShell or cmd, test port 9430:

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

If `TcpTestSucceeded` is `False`, the container may still be starting. Wait 10–30 seconds and try again.

## Enter VistA (roll-and-scroll)

To access the VistA command-line UI (classic roll-and-scroll):

```bash
docker exec -it wv su - wv -c 'mumps -r ZU'
```

This drops you into the VistA prompt:

```
VistA> 
```

Common commands:
- `D ^%SY` — System menu
- `H` — Help
- `^C` — Exit (return to Docker shell)

To exit VistA back to the container shell:
```
VistA> H
```

## Stop the sandbox

To stop the container (data is preserved if using volumes):

```powershell
cd services\vista
docker compose --profile dev stop
```

Or stop and remove:

```powershell
cd services\vista
docker compose --profile dev down
```

## Remove all data and restart fresh

```powershell
cd services\vista
docker compose --profile dev down -v
docker compose --profile dev up -d
```

## Troubleshooting

### Port 9430 not responding
- Wait 15–30 seconds after startup; the container initializes YottaDB and VistA listeners.
- Check logs: `docker logs wv`
- Ensure no other process is using port 9430: `netstat -ano | findstr :9430`

### Cannot enter roll-and-scroll
- Verify container is fully started: `docker logs wv | tail -20`
- Try: `docker exec -it wv /bin/bash` to get a shell and debug.

### SSH access (alternative to docker exec)
```bash
ssh -p 2222 wv@127.0.0.1
```
(password may be set in the image; check WorldVistA docs)

## Next steps

Once the sandbox is running:
1. Use the RPC listener (port 9430) to test Node.js bridge from `apps/api`.
2. Reference the Port 9430 endpoint in bridge connection code.
3. See: `utils/bridge/` (planned in later phases).
