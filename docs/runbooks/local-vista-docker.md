# Local VistA Sandbox (Docker)

This runbook explains how to start, verify, and interact with the WorldVistA
sandbox containers for development.

## Recommended: VEHU Lane

The VEHU lane is recommended for all new development. It has richer clinical
data and SDES scheduling RPCs.

### Start VEHU

```powershell
cd services\vista
docker compose --profile vehu up -d
```

Container name: `vehu`, Broker port: **9431**, SSH port: 2223.

### Verify VEHU is running

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String vehu
Test-NetConnection 127.0.0.1 -Port 9431
```

### Enter VEHU roll-and-scroll

```bash
docker exec -it vehu su - vehu -c 'mumps -r ZU'
```

### VEHU Credentials

| Access Code | Verify Code | User                      |
| ----------- | ----------- | ------------------------- |
| PRO1234     | PRO1234!!   | PROGRAMMER,ONE (DUZ 1)    |

### VEHU Test Data

- Valid patient DFNs: 46, 47, 49, 53-93 (NOT 1, 2, 3)
- DFN=46 has: 2 allergies, 5 vitals, 2 problems, 1 note

### Stop VEHU

```powershell
cd services\vista
docker compose --profile vehu stop

# Or stop and remove (preserves data):
docker compose --profile vehu down

# Remove all data and restart fresh:
docker compose --profile vehu down -v
docker compose --profile vehu up -d
```

---

## Legacy Lane (worldvista-ehr)

The legacy lane uses the older `worldvista/worldvista-ehr` image on port 9430.
Use only if you need backward compatibility.

### Start Legacy

```powershell
cd services\vista
docker compose --profile dev up -d
```

Container name: `wv`, Broker port: **9430**, SSH port: 2222.

### Legacy Credentials

| Access Code | Verify Code | User                        |
| ----------- | ----------- | --------------------------- |
| PROV123     | PROV123!!   | PROVIDER,CLYDE WV (DUZ 87)  |
| PHARM123    | PHARM123!!  | PHARMACIST,LINDA WV          |
| NURSE123    | NURSE123!!  | NURSE,HELEN WV               |

### Enter Legacy roll-and-scroll

```bash
docker exec -it wv su - wv -c 'mumps -r ZU'
```

---

## One-Command Start (both lanes)

Instead of manual Docker commands, use the canonical dev startup script:

```powershell
.\scripts\dev-up.ps1 -RuntimeLane vehu    # recommended
.\scripts\dev-up.ps1 -RuntimeLane compose  # full containerized stack
```

See `docs/runbooks/run-from-zero.md` for the complete cold-start checklist.

## Troubleshooting

### Broker port not responding

- Wait 15-30 seconds after startup; the container initializes YottaDB.
- Check logs: `docker logs vehu` (or `docker logs wv` for legacy)
- Check port conflict: `netstat -ano | findstr :9431`

### Cannot enter roll-and-scroll

- Verify container is fully started: `docker logs vehu | tail -20`
- Try: `docker exec -it vehu /bin/bash` to get a shell and debug.

### SSH access

```bash
ssh -p 2223 vehu@127.0.0.1  # VEHU
ssh -p 2222 wv@127.0.0.1    # Legacy
```
