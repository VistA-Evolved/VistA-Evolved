# Phase 512 -- VistA Baseline Lane (VERIFY)

## Gate

```powershell
cd services/vista
docker compose --profile vehu up -d
Start-Sleep -Seconds 5
cd ../..
pwsh scripts/vista-baseline-probe.ps1
docker compose -f services/vista/docker-compose.yml --profile vehu ps
```

## Expected

- Container healthy (or starting)
- Probe reports broker reachable + identifies baseline
- Evidence captured to `evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE/`

## Offline Verification (no Docker)

```powershell
pwsh scripts/vista-baseline-probe.ps1 -SkipDocker
```

- Verifies script structure, runbook existence, compose file
