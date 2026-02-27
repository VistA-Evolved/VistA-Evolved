# VistA Routine Provisioning Runbook (Phase 155)

## Overview

Phase 155 consolidates VistA routine installation into a single deterministic
script. Previously, three separate install scripts handled different subsystems
(interop RPCs, RPC catalog, RCM wrappers). The unified installer
(`scripts/install-vista-routines.ps1`) replaces the need to run them
individually, though the originals remain for backward compatibility.

## Quick Start

```powershell
# Ensure VistA container is running
cd services\vista
docker compose --profile dev up -d

# Run the unified installer (idempotent -- safe to re-run)
.\scripts\install-vista-routines.ps1

# With optional scheduling seed data
.\scripts\install-vista-routines.ps1 -Seed

# Targeting a different container (e.g., distro lane)
.\scripts\install-vista-routines.ps1 -ContainerName vista-distro
```

## What Gets Installed

### Production M Routines (8 files)

| Routine      | Purpose                                        | Source File              |
|-------------|------------------------------------------------|--------------------------|
| ZVEMIOP.m   | 4 interop RPC entry points (HL7/HLO telemetry) | services/vista/ZVEMIOP.m |
| ZVEMINS.m   | RPC registration installer                     | services/vista/ZVEMINS.m |
| VEMCTX3.m   | Safe context adder (append, never KILL)         | services/vista/VEMCTX3.m |
| ZVEMSGR.m   | Secure messaging RPC routines                  | services/vista/ZVEMSGR.m |
| ZVEMSIN.m   | Message-related RPC installer                  | services/vista/ZVEMSIN.m |
| ZVERPC.m    | RPC catalog wrapper                            | services/vista/ZVERPC.m  |
| ZVERCMP.m   | RCM wrapper routines (billing probes)          | services/vista/ZVERCMP.m |
| ZVEADT.m    | ADT/scheduling/admission RPCs                  | services/vista/ZVEADT.m  |

### INSTALL Entry Points (5 invocations)

1. **`RUN^ZVEMINS`** — Registers interop RPCs (VE INTEROP CAPABILITIES etc.)
2. **`EN^ZVEMSIN`** — Registers messaging RPCs
3. **`INSTALL^ZVERPC`** — Registers RPC catalog wrapper
4. **`INSTALL^ZVERCMP`** — Registers RCM/billing wrappers
5. **`INSTALL^ZVEADT`** — Registers ADT/scheduling RPCs

### Context Registration

**`VEMCTX3`** appends all VE-namespaced RPCs to the `OR CPRS GUI CHART`
broker context. Uses safe append logic (finds max sub-IEN, increments).
Never KILLs existing context entries.

### Optional: Scheduling Seed

When invoked with `-Seed`, copies `ZVESDSEED.m` and runs `RUN^ZVESDSEED` to
populate File 44 clinic data, appointment types, and demo appointments for
SDES testing.

## Provisioning Status API

### `GET /vista/provision/status`

**Auth:** Admin only (via AUTH_RULES)

Returns the live provisioning health of all 5 routine families by probing
their expected RPCs via the RPC capability cache.

```json
{
  "ok": true,
  "overallHealth": "fully-provisioned",
  "routines": [
    {
      "routine": "ZVEMIOP",
      "label": "Interop RPCs",
      "expectedRpcs": ["VE INTEROP CAPABILITIES", "..."],
      "health": "installed",
      "installedCount": 6,
      "totalCount": 6,
      "missingRpcs": []
    }
  ],
  "summary": { "installed": 5, "partial": 0, "missing": 0, "total": 5 }
}
```

**Health values:**
- `installed` — all expected RPCs found
- `partial` — some RPCs found, some missing
- `missing` — no expected RPCs found

**Overall health:**
- `fully-provisioned` — all routines installed
- `partially-provisioned` — at least one partial or missing
- `unprovisioned` — all routines missing

## Idempotency

The installer is fully idempotent:

1. **File copy** (`docker cp`) overwrites existing routines — safe
2. **INSTALL tags** check `^XWB(8994,"B",NAME)` before inserting — skip duplicates
3. **Context adder** finds existing entries before appending — skip duplicates
4. **Seed data** uses `$DATA` checks before creating — skip existing

Re-running the installer after a container restart is the recommended workflow.

## Troubleshooting

### Container not found
```
ERROR: Container 'wv' not found or not running
```
Start the VistA container: `cd services/vista && docker compose --profile dev up -d`

### INSTALL tag fails
```
mumps -run RUN^ZVEMINS returns non-zero
```
Check that the .m file was copied correctly:
```powershell
docker exec -it wv ls -la /home/wv/r/ZVEMINS.m
```

### Provisioning endpoint shows "missing" RPCs
RPCs may not be in the capability cache. Wait for cache TTL to expire
(`VISTA_CAPABILITY_TTL_MS`, default 5 min) or restart the API.

### After `docker compose down -v`
Volume destruction removes all installed routines and RPCs. Re-run:
```powershell
.\scripts\install-vista-routines.ps1
```

## Relation to Existing Install Scripts

| Script                           | Status      | Covered By Unified? |
|---------------------------------|-------------|---------------------|
| scripts/install-interop-rpcs.ps1 | Retained    | Yes (Step 3a)       |
| scripts/install-rpc-catalog.ps1  | Retained    | Yes (Step 3c)       |
| scripts/install-rcm-wrappers.ps1 | Retained    | Yes (Step 3d)       |

The individual scripts remain for backward compatibility. The unified
installer subsumes all of them.

## Verification

```powershell
.\scripts\verify-phase155-provisioning.ps1
```

19 gates covering sanity (S1-S5), feature integrity (F1-F9), and
regression (R1-R5).
