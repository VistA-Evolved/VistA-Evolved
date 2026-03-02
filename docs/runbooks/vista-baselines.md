# VistA Baselines -- Multi-Lane Reference

> Phase 512 (Wave 36 A3). Maintained by scripts/vista-baseline-probe.ps1.

## Overview

VistA-Evolved validates against multiple VistA baselines. Each lane has
different characteristics, data sets, and intended use cases.

---

## Lane 1: worldvista/worldvista-ehr (Legacy Dev)

| Property | Value |
|----------|-------|
| **Image** | `worldvista/worldvista-ehr:latest` |
| **Docker profile** | `legacy` or `dev` |
| **Container name** | `wv` |
| **RPC Broker port** | 9430 (host) -> 9430 (container) |
| **SSH port** | 2222 (host) -> 22 (container) |
| **VistA user home** | `/home/wv` |
| **Default accounts** | PROV123/PROV123!!, PHARM123/PHARM123!!, NURSE123/NURSE123!! |
| **Use case** | Legacy development, backward compatibility testing |
| **Data freshness** | 7+ years old, minimal synthetic patients |
| **Known limitations** | No SDES scheduling data, no IB/AR billing data, stale patch level |

### Start
```powershell
cd services/vista
docker compose --profile legacy up -d
```

---

## Lane 2: worldvista/vehu (VEHU -- Recommended)

| Property | Value |
|----------|-------|
| **Image** | `worldvista/vehu:latest` |
| **Docker profile** | `vehu` |
| **Container name** | `vehu` |
| **RPC Broker port** | 9431 (host) -> 9430 (container) |
| **SSH port** | 2223 (host) -> 22 (container) |
| **VistA user home** | `/home/vehu` |
| **Default accounts** | Same as WorldVistA (PROV123/PROV123!! etc.) |
| **Use case** | Recommended dev/test baseline, richer data set |
| **Data freshness** | Updated periodically, synthetic patients with clinical data |
| **Advantages** | More complete clinical data, scheduling resources, pharmacy data |

### Start
```powershell
cd services/vista
docker compose --profile vehu up -d
```

### Post-start
```powershell
# Install custom VistA routines
pwsh scripts/install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu
```

---

## Lane 3: services/vista-distro (Build-Your-Own)

| Property | Value |
|----------|-------|
| **Dockerfile** | `services/vista-distro/Dockerfile` |
| **Docker profile** | `distro` |
| **Container name** | configurable |
| **RPC Broker port** | 9431 (default) |
| **VistA user home** | configurable |
| **Default accounts** | Injected via env vars (no baked credentials) |
| **Use case** | Production-grade, reproducible builds |
| **Data freshness** | Pinned upstream VistA-M ref |
| **Advantages** | Full control over patch level, custom routines baked in |

### Start
```powershell
cd services/vista-distro
docker compose --profile distro up -d
```

---

## Switching Lanes

The API connects to whichever VistA is running on the configured host/port.
Update `apps/api/.env.local`:

```env
# Legacy lane
VISTA_HOST=127.0.0.1
VISTA_PORT=9430

# VEHU lane
VISTA_HOST=127.0.0.1
VISTA_PORT=9431

# Distro lane (same port as VEHU by default)
VISTA_HOST=127.0.0.1
VISTA_PORT=9431
```

### Swap Boundary
The API exposes `GET /vista/swap-boundary` (unauthenticated) which returns
the active VistA connection descriptor including instance ID, port, and
capabilities. Use this to verify which lane is active.

---

## Baseline Probe

Run the baseline probe to identify which VistA is running and verify
connectivity:

```powershell
pwsh scripts/vista-baseline-probe.ps1
```

The probe checks:
- TCP reachability on known ports (9430, 9431)
- Docker container status for each profile
- Writes JSON evidence to `evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE/`

### Offline mode (no Docker required)
```powershell
pwsh scripts/vista-baseline-probe.ps1 -SkipDocker
```

---

## Recommendations

1. **New development**: Use VEHU lane (`--profile vehu`)
2. **Legacy compatibility testing**: Use legacy lane (`--profile legacy`)
3. **Production builds**: Use distro lane (`services/vista-distro`)
4. **CI/CD**: Use VEHU lane with `-SkipDocker` for structure-only checks
