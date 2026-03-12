# Local VistA lane — runtime inspection

> **Service names, container names, ports, volumes, startup dependencies, and startup sequence.** Single source of truth for the local-vista Docker lane.

---

## Service and container

| Item | Value |
|------|--------|
| **Compose service name** | `local-vista` |
| **Container name** | `local-vista` |
| **Image** | `vista-evolved/local-vista:latest` |
| **Compose file** | `docker/local-vista/compose.yaml` |
| **Profile** | `local-vista` (must use `--profile local-vista` to start) |

---

## Ports

| Purpose | Host port (default) | Container port | Env override |
|---------|--------------------|----------------|--------------|
| RPC Broker | **9432** | 9430 | `LOCAL_VISTA_PORT` |
| SSH | **2224** | 22 | `LOCAL_VISTA_SSH_PORT` |

---

## Volumes

| Volume name | Mount in container | Purpose |
|-------------|--------------------|---------|
| `local-vista-data` (compose volume) | `/opt/vista/g` | Persist VistA globals (database) across restarts |

No bind mounts by default. Build context is repo root (for build only); runtime uses named volume only.

---

## Startup dependencies

- **Docker daemon** must be running.
- **Image** must exist (`vista-evolved/local-vista:latest`); build via `.\scripts\runtime\build-local-vista.ps1` or `docker build -f docker/local-vista/build/Dockerfile -t vista-evolved/local-vista:latest .`
- **Environment:** `LOCAL_VISTA_ACCESS` and `LOCAL_VISTA_VERIFY` must be set (entrypoint fails without them).
- **Ports:** Host ports 9432 and 2224 must be free (or override with env).
- **No dependency on other compose services** — this lane is a single-service stack.

---

## Startup sequence

1. **Compose up** — `docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d`
2. **Container start** — Entrypoint `/opt/vista/entrypoint.sh` runs:
   - Validates `VISTA_ADMIN_ACCESS` and `VISTA_ADMIN_VERIFY`
   - Sources YottaDB env, runs `mupip rundown` if needed
   - **First boot only:** runs provisioning (ZVEDIST, ZVEINIT, ZVESEED if present), creates sentinel `/opt/vista/g/.vista-initialized`
   - Starts SSH daemon (if `VISTA_SSH_ENABLED=true`)
   - Starts xinetd with RPC Broker config (listener on 9430)
3. **Healthcheck** — Docker runs `/opt/vista/health-check.sh` every 30s after `start_period: 120s`. Script does `nc -z -w 3 127.0.0.1 9430` inside the container. Status becomes `healthy` when that succeeds.
4. **Readiness** — From host: CONTAINER_STARTED → NETWORK_REACHABLE (TCP 9432, 2224) → SERVICE_READY (health=healthy) → TERMINAL_READY (SSH), RPC_READY (broker). See `docs/canonical/runtime/runtime-readiness-levels.md`.

---

## Relation to other docs

- **Canonical dev profile** — `docs/canonical/runtime/canonical-dev-runtime-profile.md`
- **Readiness levels** — `docs/canonical/runtime/runtime-readiness-levels.md`
- **Proof checklist** — `docs/canonical/runtime/runtime-proof-checklist.md`
