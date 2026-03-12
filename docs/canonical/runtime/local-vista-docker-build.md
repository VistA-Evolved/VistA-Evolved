# Local VistA Docker build (vendor/upstream only)

> **Build pipeline that uses only locally vendored WorldVistA sources. No git pull during build.**

---

## Local source folders used

| Path | Purpose |
|------|---------|
| `vendor/upstream/VistA-M/Packages` | M routines (`.m`) and globals (`.zwr`) — copied into image at build time. |
| `services/vista-distro/routines/` | Custom ZVE* routines (entrypoint, init, seed) — copied into image. |
| `services/vista-distro/entrypoint.sh` | Runtime entrypoint — copied into image. |
| `services/vista-distro/health-check.sh` | Health check script — copied into image. |

Build **does not** clone or fetch from GitHub. If `vendor/upstream/VistA-M/Packages` is missing, the build fails; run `scripts/upstream/fetch-worldvista-sources.ps1` first.

---

## Build command

From repo root:

```powershell
docker build -f docker/local-vista/build/Dockerfile -t vista-evolved/local-vista:latest .
```

Or use the wrapper (writes log to `docker/local-vista/logs/`):

```powershell
.\scripts\runtime\build-local-vista.ps1
```

Build context **must** be the repo root so that `COPY vendor/upstream/VistA-M/...` and `COPY services/vista-distro/...` resolve.

---

## Compose command

```powershell
docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d
```

Or:

```powershell
.\scripts\runtime\start-local-vista.ps1
```

Credentials are required: set `LOCAL_VISTA_ACCESS` and `LOCAL_VISTA_VERIFY` in the environment, or use a `.env` file (see `docker/local-vista/build/.env.example`).

---

## Runtime service name and canonical ports

| Service | Host port | Container port |
|---------|-----------|-----------------|
| RPC Broker | **9432** | 9430 |
| SSH | **2224** | 22 |

Service name: **local-vista**. See `docs/canonical/runtime/canonical-dev-runtime-profile.md`.

---

## Logs location

- **Build logs:** `docker/local-vista/logs/build-YYYYMMDD-HHmmss.log` (when using `build-local-vista.ps1`).
- **Compose healthcheck:** Use `test: ["CMD", "/opt/vista/health-check.sh"]` (Compose v2 requires CMD/CMD-SHELL prefix).
- If **port 9432 is already in use**, set `LOCAL_VISTA_PORT` to another port (e.g. 9433) or stop the process using 9432.

---

## Retry method

1. **Do not re-download repos.** Build uses the same `vendor/upstream/` tree. Fix the Dockerfile or scripts, then re-run the build.
2. If the failure is in globals load or routines: fix the Dockerfile or patch the vendored sources (e.g. under `docker/local-vista/patches/`), then rebuild.
3. Re-run: `.\scripts\runtime\build-local-vista.ps1` (or the raw `docker build` command above). New log file is created each run.

---

## How to confirm the build uses local sources

1. **Dockerfile:** It has no `RUN git clone` or `RUN curl` for VistA-M. It only has `COPY vendor/upstream/VistA-M/Packages ...`.
2. **Build context:** Compose and the script use context = repo root; `docker build -f docker/local-vista/build/Dockerfile .` from repo root.
3. **Image label:** At runtime, `cat /opt/vista/build-info.txt` shows `VISTA_SOURCE=vendor/upstream/VistA-M`.
4. **Run:**  
   `docker run --rm vista-evolved/local-vista:latest cat /opt/vista/build-info.txt`  
   Expected includes: `VISTA_SOURCE=vendor/upstream/VistA-M`.

---

## Relation to other docs

- **Canonical dev runtime profile** — `docs/canonical/runtime/canonical-dev-runtime-profile.md`
- **Local source workflow** — `docs/canonical/upstream/local-source-workflow.md`
- **Upstream source strategy** — `docs/canonical/upstream-source-strategy.md`
