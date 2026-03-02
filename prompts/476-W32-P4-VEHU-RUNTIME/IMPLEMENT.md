# Phase 476 — W32-P4: VEHU VistA Runtime Profile

## Implementation Steps

1. Update `services/vista/docker-compose.yml`:
   - Keep `wv` service (legacy) under `legacy` profile
   - Add `vehu` service using `worldvista/vehu` under `vehu` profile
   - VEHU exposes: 9430 (RPC Broker), 22 (SSH), 5001 (HL7)

2. Update `scripts/install-vista-routines.ps1`:
   - Add `-VistaUser` parameter (default auto-detect)
   - Add `-RoutinesDir` parameter (default auto-detect)
   - Auto-detect: if container has /home/vehu, use vehu user

3. Create `services/vista/README.md`:
   - VEHU quickstart
   - Document VEHU accounts and ports
   - Mark WorldVistA as legacy demo baseline

## Files Touched

- `services/vista/docker-compose.yml` (add vehu service)
- `scripts/install-vista-routines.ps1` (add VistaUser/RoutinesDir params)
- `services/vista/README.md` (create/update)
