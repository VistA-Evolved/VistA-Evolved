# Canonical dev runtime profile: local-vista

> **Single canonical local dev runtime lane for this repo.** One service name, one RPC port, one SSH port. No conflicting defaults.

---

## Decision

For the **local-source-first** Docker build lane (Stage 3), this repo uses:

| Item | Value |
|------|--------|
| **Service name** | `local-vista` |
| **Container name** | `local-vista` |
| **Image** | `vista-evolved/local-vista:latest` |
| **RPC Broker (host)** | **9432** |
| **SSH (host)** | **2224** |
| **Compose file** | `docker/local-vista/compose.yaml` |
| **Profile** | `local-vista` |

---

## Why these ports

- **VEHU** (existing lane) uses 9431 (RPC) and 2223 (SSH). **Legacy** uses 9430 and 2222.
- **local-vista** uses **9432** and **2224** so it can run alongside VEHU or legacy without port conflict.
- Only one lane should be active at a time when the API connects; this profile is the canonical choice when using the **built-from-local-vendor** image.

---

## How to run

```powershell
# Build (uses vendor/upstream only; no pull)
.\scripts\runtime\build-local-vista.ps1

# Set credentials (required by entrypoint)
$env:LOCAL_VISTA_ACCESS = "PRO1234"
$env:LOCAL_VISTA_VERIFY = "PRO1234!!"

# Start
.\scripts\runtime\start-local-vista.ps1

# Status
.\scripts\runtime\show-local-vista-status.ps1

# Stop
.\scripts\runtime\stop-local-vista.ps1
```

---

## API connection

To point the API at this lane, set in `apps/api/.env.local`:

```env
VISTA_HOST=127.0.0.1
VISTA_PORT=9432
VISTA_ACCESS_CODE=PRO1234
VISTA_VERIFY_CODE=PRO1234!!
VISTA_INSTANCE_ID=local-vista
```

---

## Relation to other lanes

- **VEHU** (9431): Pre-built image; recommended for day-to-day RPC truth when not testing the local build.
- **local-vista** (9432): Image built from `vendor/upstream/VistA-M`; use when validating the local build pipeline or debugging against vendored sources.
- Do not run VEHU and local-vista on the same host without changing one of the ports.
