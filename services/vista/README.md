# services/vista (VistA / YottaDB Environment)

This folder contains the Docker sandbox for Phase 2 VistA development. It provides a local, containerized WorldVistA instance for testing and bridge development.

## Phase 2: Sandbox Implementation ✅

We now have a working WorldVistA sandbox using Docker:

- **Image**: `worldvista/worldvista-ehr:latest` (includes YottaDB + VistA)
- **Container**: `wv` (see `docker-compose.yml`)
- **Exposed ports**:
  - `9430` — VistA RPC listener (used by Node.js bridge)
  - `2222` — SSH access
  - `8001, 8080, 9080` — Web UIs

## Setup & Operations

See the complete runbook: **[docs/runbooks/local-vista-docker.md](../../docs/runbooks/local-vista-docker.md)**

Quick start:
```powershell
cd services\vista
docker compose --profile dev up -d
docker ps                           # verify running
Test-NetConnection 127.0.0.1 -Port 9430  # verify RPC port
docker exec -it wv su - wv -c 'mumps -r ZU'  # enter VistA
```

## Next Steps (Phase 3+)

1. **Node.js bridge**: Implement RPC client in `utils/bridge/` using `mg-dbx-napi`.
2. **Test fixtures**: Add seed data to YottaDB for consistent testing.
3. **Persistent storage**: Add volumes to preserve data across restarts.
4. **CI/CD**: Run sandbox in GitHub Actions for integration testing.

## Notes

- This is a **dev sandbox only**; not suitable for production.
- The WorldVistA image includes pre-configured VistA instance; no additional setup needed.
- Container restarts preserve data (if volumes are configured).
- For persistent data: uncomment volumes in `docker-compose.yml`.

