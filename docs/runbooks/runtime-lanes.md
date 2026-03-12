# Runtime Lanes

> Phase 572. Audience: senior developers and hospital IT.
>
> For deeper technical details (protocol quirks, swap boundary, baseline probe
> scripts), see also [vista-baselines.md](vista-baselines.md).

VistA-Evolved can connect to several different VistA runtimes ("lanes").
Each lane uses a different Docker image, port, and credential set. **Only one
lane should be active at a time** — the API connects to whichever VistA is
listening on the configured host/port.

---

## Quick Comparison

|                        | Lane A — VEHU                       | Lane B — Legacy                     | Lane C — Compose              | Lane D — Distro                            | Lane E — Local Vista (canonical local build) |
| ---------------------- | ----------------------------------- | ----------------------------------- | ----------------------------- | ------------------------------------------ | --------------------------------------------- |
| **Image**              | `worldvista/vehu`                   | `worldvista/worldvista-ehr`         | `worldvista/worldvista-ehr`   | `vista-evolved/vista-distro` (local build) | `vista-evolved/local-vista` (vendor/upstream) |
| **Compose file**       | `services/vista/docker-compose.yml` | `services/vista/docker-compose.yml` | `docker-compose.yml` (root)   | `services/vista-distro/docker-compose.yml` | `docker/local-vista/compose.yaml`             |
| **Profile flag**       | `--profile vehu`                    | `--profile legacy`                  | _(none — default)_            | `--profile distro`                         | `--profile local-vista`                       |
| **Broker port (host)** | **9431**                            | 9430                                | 9210                          | 9431 (default)                             | **9432**                                     |
| **SSH port (host)**    | 2223                                | 2222                                | —                             | —                                          | 2224                                          |
| **Env template**       | `apps/api/.env.example`             | `apps/api/.env.example`             | `.env.example` (root)         | `.env` + Docker secrets                    | `docker/local-vista/build/.env.example`       |
| **Primary creds**      | PRO1234 / PRO1234!!                 | PROV123 / PROV123!!                 | PROV123 / PROV123!!           | Injected at runtime                        | LOCAL_VISTA_ACCESS / LOCAL_VISTA_VERIFY       |
| **Best for**           | Day-to-day dev, RPC truth, evidence | Legacy compat testing               | Full-stack containerized demo | Staging / reproducible builds              | Local-source build validation, proof          |
| **Recommendation**     | **Use this** (pre-built)             | Only if needed                      | Quick demos                   | Staging / prod                             | **Canonical local dev** (build from vendor)   |

---

## Lane A — VEHU (Recommended)

The **VEHU** (VistA Evolution Healthcare Upgrade) image has richer synthetic
patient data, more complete scheduling resources, and periodic updates. All
evidence docs and RPC truth references are generated against this lane.

### Start

```powershell
# One-command (recommended)
.\scripts\dev-up.ps1 -Profile vehu

# Manual
docker compose -f services/vista/docker-compose.yml --profile vehu up -d
```

### Env Setup

Copy `apps/api/.env.example` to `apps/api/.env.local` and set:

```env
VISTA_HOST=127.0.0.1
VISTA_PORT=9431
VISTA_ACCESS_CODE=PRO1234
VISTA_VERIFY_CODE=PRO1234!!
```

### Post-Start Provisioning

```powershell
.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu
```

### Expected Truth Evidence

After starting the API and running verification:

- `GET /vista/ping` → `{ ok: true }`
- `GET /vista/default-patient-list` → `{ ok: true, patients: [...] }`
- `GET /vista/swap-boundary` → `{ instanceId: "vehu", port: 9431, ... }`
- `docs/VISTA_CONNECTIVITY_RESULTS.md` is the canonical truth reference

### Ports

| Service    | Host Port | Container Port |
| ---------- | --------- | -------------- |
| RPC Broker | 9431      | 9430           |
| SSH        | 2223      | 22             |
| Web UI     | 8082      | 8080           |
| EWD        | 5001      | 5001           |

---

## Lane B — Legacy (worldvista-ehr)

The original WorldVistA Docker image. 7+ years old with minimal synthetic
patients. **Use only when testing backward compatibility** or reproducing
issues specific to this image.

### Start

```powershell
docker compose -f services/vista/docker-compose.yml --profile legacy up -d
```

### Env Setup

Copy `apps/api/.env.example` to `apps/api/.env.local` and set:

```env
VISTA_HOST=127.0.0.1
VISTA_PORT=9430
VISTA_ACCESS_CODE=PROV123
VISTA_VERIFY_CODE=PROV123!!
```

### Post-Start Provisioning

```powershell
.\scripts\install-vista-routines.ps1 -ContainerName wv -VistaUser wv
```

### Expected Truth Evidence

- `GET /vista/ping` → `{ ok: true }`
- `GET /vista/default-patient-list` → `{ ok: true, patients: [...] }`
  (fewer patients than VEHU)

### Ports

| Service    | Host Port | Container Port |
| ---------- | --------- | -------------- |
| RPC Broker | 9430      | 9430           |
| SSH        | 2222      | 22             |
| Web UI     | 8001      | 8001           |
| HTTP       | 8080      | 8080           |
| HTTP (alt) | 9080      | 9080           |

### Known Limitations

- No SDES scheduling data
- Empty IB/AR billing globals
- Stale patch level
- Minimal synthetic patients

---

## Lane C — All-in-One Compose

The root `docker-compose.yml` starts VistA + PostgreSQL + Redis + API + Web
in a single command. Intended for **quick full-stack demos** where you want
everything containerized.

### Start

```powershell
# Copy root env template
Copy-Item .env.example .env
# Edit .env — set POSTGRES_PASSWORD, VISTA_ACCESS_CODE=PROV123, VISTA_VERIFY_CODE=PROV123!!

docker compose up -d --build
```

### Env Setup

Uses the **root** `.env.example` (not `apps/api/.env.example`):

```env
VISTA_ACCESS_CODE=PROV123
VISTA_VERIFY_CODE=PROV123!!
POSTGRES_PASSWORD=your_password
```

### Ports

| Service          | Host Port | Notes                    |
| ---------------- | --------- | ------------------------ |
| VistA RPC Broker | 9210      | Different from Lanes A/B |
| VistA Web UI     | 8001      |                          |
| PostgreSQL       | 5432      |                          |
| Redis            | 6379      |                          |
| API (Fastify)    | 4000      | Container-internal build |
| Web (Next.js)    | 5173      | Container-internal build |

### Expected Truth Evidence

- `http://localhost:4000/vista/ping` → `{ ok: true }`
- `http://localhost:5173` → Clinician UI login page

### Notes

- You do **not** need to run `pnpm install` or start Node locally.
- Evidence docs should **not** be regenerated against this lane.
- API runs inside the container, not on your host `localhost:3001`.

---

## Lane D — Distro (Build-Your-Own)

A reproducible, multi-stage Docker build intended for staging and production.
Credentials are never baked into the image — they must be injected at runtime.

### Start

```powershell
cd services/vista-distro

# Set credentials (required — entrypoint fails without them)
$env:VISTA_DISTRO_ACCESS = "your_access_code"
$env:VISTA_DISTRO_VERIFY = "your_verify_code"

docker compose --profile distro up -d
```

### Env Setup

No `.env.example` template — credentials are passed via environment variables
or Docker/Kubernetes secrets. API `.env.local` should set:

```env
VISTA_HOST=127.0.0.1
VISTA_PORT=9431
VISTA_INSTANCE_ID=distro
VISTA_ACCESS_CODE=<injected_access_code>
VISTA_VERIFY_CODE=<injected_verify_code>
```

### Expected Truth Evidence

- `GET /vista/swap-boundary` → `{ instanceId: "distro", ... }`
- Run `scripts/verify-vista-compat.ps1` for 14-gate compatibility check

### Ports

| Service    | Host Port                                            | Container Port |
| ---------- | ---------------------------------------------------- | -------------- |
| RPC Broker | 9431 (default, configurable via `VISTA_DISTRO_PORT`) | 9430           |

### Security Posture

- Read-only root filesystem
- No baked credentials (entrypoint fails fast if not provided)
- Resource-limited (2 GB RAM, 2 CPUs)

---

## `VISTA_INSTANCE_ID` Values

Set `VISTA_INSTANCE_ID` in `apps/api/.env.local` to explicitly tell the API
which lane it is connected to. This overrides the port-based heuristic in
`activeSwapBoundary()` ([swap-boundary.ts](../../apps/api/src/vista/swap-boundary.ts)).

| Value                  | Lane         | Default Port | Default Creds       |
| ---------------------- | ------------ | ------------ | ------------------- |
| `vehu`                 | A -- VEHU    | 9431         | PRO1234 / PRO1234!! |
| `worldvista-ehr`       | B -- Legacy  | 9430         | PROV123 / PROV123!! |
| _(not set, port 9210)_ | C -- Compose | 9210         | PROV123 / PROV123!! |
| `vista-distro-lane`    | D -- Distro  | 9431         | _(injected)_        |

**If `VISTA_INSTANCE_ID` is not set**, the API uses port-based heuristics:

- Port 9431 -> `vehu` (the most common dev case)
- Port 9430 -> `worldvista-ehr`
- Port 9210 -> `worldvista-ehr` (compose lane)
- Other -> `worldvista-ehr` (legacy default)

**To use the distro lane on port 9431**, you must set
`VISTA_INSTANCE_ID=vista-distro-lane` explicitly, because port 9431 defaults
to VEHU.

---

## Lane E — Local Vista (canonical local build)

The **local-vista** lane uses an image built only from `vendor/upstream/VistA-M` (no git pull during build). It is the **canonical local dev runtime** for this repo when validating the local build pipeline.

### Start

```powershell
$env:LOCAL_VISTA_ACCESS = "PRO1234"
$env:LOCAL_VISTA_VERIFY = "PRO1234!!"
.\scripts\runtime\start-local-vista.ps1
# Or: docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d
```

### Env Setup

Set before start (or use `docker/local-vista/build/.env.example`):

```env
LOCAL_VISTA_PORT=9432
LOCAL_VISTA_SSH_PORT=2224
LOCAL_VISTA_ACCESS=PRO1234
LOCAL_VISTA_VERIFY=PRO1234!!
```

### Ports

| Service    | Host Port | Container Port |
| ---------- | --------- | -------------- |
| RPC Broker | 9432      | 9430           |
| SSH        | 2224      | 22             |

### Readiness and proof

- Run `.\scripts\runtime\healthcheck-local-vista.ps1` for all five readiness levels (CONTAINER_STARTED through RPC_READY).
- See `docs/canonical/runtime/runtime-readiness-levels.md` and `docs/canonical/runtime/runtime-proof-checklist.md`.
- Do not claim VistA is ready until at least SERVICE_READY and RPC_READY pass.

### Canonical docs

- [canonical-dev-runtime-profile.md](../canonical/runtime/canonical-dev-runtime-profile.md) — profile decision, ports, API connection
- [local-vista-lane-inspect.md](../canonical/runtime/local-vista-lane-inspect.md) — service name, volumes, startup sequence

---

## Switching Between Lanes

1. Stop the current lane: `docker compose down` (in the lane's compose directory)
2. Update `apps/api/.env.local` with the new lane's port and credentials
3. Start the new lane
4. Verify with `GET /vista/swap-boundary` to confirm the active instance

> **Conflict warning:** Lanes A (VEHU) and D (Distro) both default to port 9431. Do not run both simultaneously unless you change `VISTA_DISTRO_PORT`. Lane E (local-vista) uses port **9432** to avoid conflict; it is the **canonical local dev runtime** when building from vendor/upstream (see `docs/canonical/runtime/canonical-dev-runtime-profile.md`).

---

## Credential Reference

| Lane        | Access Code  | Verify Code  | User                       |
| ----------- | ------------ | ------------ | -------------------------- |
| A (VEHU)    | PRO1234      | PRO1234!!    | PROGRAMMER,ONE (DUZ 1)     |

Development CPRS login note:
When `NODE_ENV !== 'production'`, the CPRS login form now prefills the verified VEHU credentials into the actual input values so the visible dev account can be submitted directly without retyping.
| A (VEHU)    | PROV123      | PROV123!!    | PROVIDER,CLYDE WV (DUZ 87) |
| B (Legacy)  | PROV123      | PROV123!!    | PROVIDER,CLYDE WV (DUZ 87) |
| B (Legacy)  | PHARM123     | PHARM123!!   | PHARMACIST,LINDA WV        |
| B (Legacy)  | NURSE123     | NURSE123!!   | NURSE,HELEN WV             |
| C (Compose) | PROV123      | PROV123!!    | PROVIDER,CLYDE WV (DUZ 87) |
| D (Distro)  | _(injected)_ | _(injected)_ | _(configured at build)_    |
| E (Local Vista) | LOCAL_VISTA_ACCESS | LOCAL_VISTA_VERIFY | e.g. PRO1234 / PRO1234!! |

---

## For Hospital IT

If you are evaluating this system for deployment:

1. **Start with Lane A (VEHU)** to see the richest demo data
2. **Lane C (Compose)** gives a one-command full-stack experience
3. **Lane D (Distro)** is the production-grade path — no baked creds,
   reproducible builds, pinned upstream versions
4. All PHI in these Docker images is **synthetic** — no real patient data

For production deployment guidance, see
[vista-distro-lane.md](vista-distro-lane.md) and
[phase107-production-posture.md](phase107-production-posture.md).
