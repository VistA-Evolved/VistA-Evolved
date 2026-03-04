# VistA RPC List Probe -- Installation & Usage

> How to install and use the `VE LIST RPCS` custom RPC for enumerating all
> registered RPCs in a VistA instance from File 8994 (REMOTE PROCEDURE).

## Purpose

The RPC probe provides a **safe, read-only** way to discover which RPCs are
registered in a specific VistA instance. This is critical for:

- Building the RPC coverage matrix (Vivian index vs live instance)
- Detecting distro differences (WorldVistA vs OSEHRA vs VA production)
- Verifying that custom VE RPCs are properly installed
- Feeding the `/vista/rpc-catalog` API endpoint

## M Routine

**File**: `services/vista/ZVERPC.m`

**Entry Points**:
| Tag | Purpose |
|-----|---------|
| `LIST^ZVERPC` | Returns all RPCs from File 8994 as `IEN\|NAME\|TAG\|ROUTINE` |
| `INSTALL^ZVERPC` | Registers the `VE LIST RPCS` RPC in File 8994 |
| `ADDCTX^ZVERPC` | Adds the RPC to `OR CPRS GUI CHART` context |
| `CHECK^ZVERPC` | Verifies registration |

## Installation

### Automated (recommended)

```powershell
.\scripts\install-rpc-catalog.ps1
```

This script:

1. Copies `ZVERPC.m` into the WorldVistA Docker container
2. Runs `INSTALL^ZVERPC` to register the RPC in File 8994
3. Adds it to the `OR CPRS GUI CHART` context
4. Verifies registration

### Manual

```powershell
# 1. Copy routine into container
docker cp services/vista/ZVERPC.m wv:/home/wv/r/ZVERPC.m

# 2. Install
docker exec -it wv su - wv -c "mumps -r INSTALL^ZVERPC"

# 3. Verify
docker exec -it wv su - wv -c "mumps -r CHECK^ZVERPC"
```

Expected output:

```
VE LIST RPCS => REGISTERED (IEN=XXXX)
```

## API Endpoint

```
GET /vista/rpc-catalog
```

**Auth**: Session required (automatic via `/vista/*` catch-all rule)

**Response** (success):

```json
{
  "ok": true,
  "rpc": "VE LIST RPCS",
  "count": 4521,
  "catalog": [
    { "ien": "1", "name": "ACKQAUD1", "tag": "QAU1", "routine": "ACKQAS", "present": true },
    ...
  ]
}
```

**Response** (RPC not installed):

```json
{
  "ok": true,
  "rpc": "VE LIST RPCS",
  "count": 0,
  "catalog": [],
  "hint": "VE LIST RPCS not installed. Run scripts/install-rpc-catalog.ps1"
}
```

## Caching

The API caches the catalog for 60 seconds (`RPC_CATALOG_TTL`). Subsequent
requests within the TTL window return the cached result.

## Safety

- **Read-only**: The `LIST^ZVERPC` tag only reads `^XWB(8994,*)`. It never
  writes, never locks, and never modifies globals.
- **No arguments**: The RPC takes a dummy argument (required by the broker
  protocol) but ignores it.
- **No side effects**: Safe to call at any frequency.

## Troubleshooting

| Symptom                     | Cause                         | Fix                                         |
| --------------------------- | ----------------------------- | ------------------------------------------- |
| `count: 0` with hint        | RPC not installed             | Run `install-rpc-catalog.ps1`               |
| `error: "Application"`      | RPC not in context            | `ADDCTX^ZVERPC` adds it                     |
| Empty catalog after install | Container restarted with `-v` | Re-run installer                            |
| Timeout                     | VistA container not running   | `docker compose up -d` in `services/vista/` |
