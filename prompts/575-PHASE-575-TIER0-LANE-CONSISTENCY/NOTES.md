# Phase 575 Notes

## Before vs After

### Contradictions that existed

1. **swap-boundary.ts** only modeled 2 lanes: `worldvista-docker-sandbox`
   (port 9430) and `vista-distro-lane` (port 9431). VEHU was never
   represented despite being the recommended lane since Phase 512.

2. **Port 9431 heuristic was wrong**: `activeSwapBoundary()` mapped port
   9431 to `vista-distro-lane` by default. But most developers run VEHU
   on 9431, not distro. This caused `/vista/swap-boundary` to lie about
   who it was talking to.

3. **TIER0_PROOF.md** hardcoded port 9430, `PROV123/PROV123!!`, and
   `docker compose --profile dev`. None of these match the VEHU lane
   that developers actually use.

4. **verify-tier0.ps1** defaulted to `PROV123/PROV123!!` when no creds
   were provided, which fails silently on VEHU (which needs `PRO1234`).

5. **verify-tier0.sh** had no credential support at all -- it relied on
   the API's `.env.local` which may not match the tier-0 script's defaults.

6. **Docker check** only looked for container name `wv` and missed `vehu`.

7. **runtime-lanes.md** documented `VISTA_INSTANCE_ID` usage in Lane D
   (distro) but did not list valid values as a reference section.

### How they are resolved now

1. swap-boundary.ts has 3 explicit factories: `vehuSandboxBoundary()`,
   `worldvistaEhrBoundary()`, `distroLaneBoundary()`. `devSandboxBoundary`
   is kept as an alias for `worldvistaEhrBoundary` for backward compat.

2. Port 9431 heuristic now maps to VEHU (the common case), not distro.
   Set `VISTA_INSTANCE_ID=vista-distro-lane` explicitly for distro.

3. TIER0_PROOF.md links to runtime-lanes.md and shows both lane cred sets.

4. verify-tier0.ps1 calls `/vista/swap-boundary` to detect the lane and
   chooses defaults accordingly: vehu -> PRO1234, worldvista-ehr -> PROV123.

5. verify-tier0.sh gains --access-code and --verify-code args plus the
   same lane-detection logic.

6. Docker check now looks for both `wv` and `vehu` container names.

7. runtime-lanes.md has a VISTA_INSTANCE_ID reference table.
