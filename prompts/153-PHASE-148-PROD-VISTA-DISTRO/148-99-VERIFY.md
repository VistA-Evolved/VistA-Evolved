# Phase 148 -- Production VistA Distribution Lane (VERIFY)

## Gates

1. `services/vista-distro/Dockerfile` exists and is valid (FROM, COPY, ENTRYPOINT)
2. `services/vista-distro/docker-compose.yml` exposes port 9431 (host) with env-only creds
3. `apps/api/src/vista/swap-boundary.ts` compiles and exports contract types
4. `data/vista/rpc-catalog-snapshot.json` is valid JSON with RPC arrays
5. `scripts/verify-vista-compat.ps1` exists and is syntactically valid
6. `docs/runbooks/vista-distro-lane.md` contains build + swap + cutover sections
7. No default credentials baked into Dockerfile or entrypoint
8. Dev sandbox (`services/vista/docker-compose.yml`) untouched
9. TypeScript compiles clean across all packages
10. Gauntlet RC: 0 FAIL
