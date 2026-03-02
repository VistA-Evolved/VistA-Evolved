# VistA Development Sandbox

Two VistA Docker profiles are available for local development.

## Profiles

| Profile | Image | Status | Ports |
|---------|-------|--------|-------|
| `vehu` | `worldvista/vehu:latest` | **Recommended** -- updated, synthetic patients, SDES scheduling | 9431 (RPC), 2223 (SSH), 5001 (HL7), 8082 (Web) |
| `legacy` / `dev` | `worldvista/worldvista-ehr:latest` | Legacy demo-only -- 7+ years old, not for production | 9430 (RPC), 2222 (SSH), 8001 (Web), 8080/9080 |

## VEHU Quickstart (Recommended)

```powershell
cd services/vista
docker compose --profile vehu up -d

# Wait for container health (~60s)
docker ps --filter name=vehu

# Install VistA routines (auto-detects vehu user)
pwsh ../../scripts/install-vista-routines.ps1 -ContainerName vehu

# Start API (from repo root)
cd ../..
npx tsx --env-file=apps/api/.env.local apps/api/src/index.ts
```

## VEHU Accounts

From the [VEHU Docker Hub page](https://hub.docker.com/r/worldvista/vehu):

| Access Code | Verify Code | User |
|-------------|-------------|------|
| PRO1234 | PRO1234!! | Provider account |

> **Note**: VEHU ships with many pre-configured accounts. Check Docker Hub
> docs or run `D ^XUS` inside the container for the full list.

## Legacy WorldVistA Accounts

| Access Code | Verify Code | User |
|-------------|-------------|------|
| PROV123 | PROV123!! | PROVIDER,CLYDE WV (DUZ 87) |
| PHARM123 | PHARM123!! | PHARMACIST,LINDA WV |
| NURSE123 | NURSE123!! | NURSE,HELEN WV |

## Legacy Quickstart

```powershell
cd services/vista
docker compose --profile legacy up -d
pwsh ../../scripts/install-vista-routines.ps1 -ContainerName wv
```

## Port Mapping (No Conflicts)

Both profiles can run simultaneously:

| Service | VEHU | Legacy |
|---------|------|--------|
| RPC Broker | 9431 | 9430 |
| SSH | 2223 | 2222 |
| HL7 | 5001 | N/A |
| HTTP | 8082 | 8080 |

## Routine Installation

```powershell
# VEHU (auto-detects user)
pwsh scripts/install-vista-routines.ps1 -ContainerName vehu

# Legacy (default)
pwsh scripts/install-vista-routines.ps1

# Explicit user override
pwsh scripts/install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu
```

## Important Notes

- **worldvista/worldvista-ehr is demo-only** -- 7+ years old, not for production
- **VEHU is recommended** for all new development and testing
- Both images persist data in Docker named volumes
- `docker compose down -v` destroys volumes -- re-run the routine installer after

