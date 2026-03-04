# Runbook: VistA Billing Wrapper RPCs (Phase 42)

## Overview

Phase 42 introduces one custom wrapper RPC for reading provider/facility
identifiers needed for claim drafting. These are read-only wrappers that
access FileMan data not exposed by standard CPRS RPCs.

## Wrapper RPCs

### VE RCM PROVIDER INFO

**Purpose:** Read provider NPI and facility identifiers for claim drafts.

**MUMPS Routine:** `ZVERCMP.m`

**Parameters:** DUZ (provider internal entry number)

**Returns:** `PROVIDER_NAME^NPI^FACILITY_NAME^FACILITY_IEN^STATION_NUMBER`

**Files Read (all read-only):**

- `^VA(200,DUZ,0)` -- Provider name
- `^VA(200,DUZ,41.99)` -- NPI
- `^DIC(4,IEN,0)` -- Institution name
- `^DIC(4,IEN,99)` -- Station number

## Installation

### Prerequisites

- WorldVistA Docker container running (port 9430)
- `services/vista/ZVERCMP.m` present in repo

### Install Steps

```powershell
# From repo root
.\scripts\install-rcm-wrappers.ps1
```

Or manually:

```powershell
# 1. Copy routine into container
docker cp services/vista/ZVERCMP.m wv:/home/wv/r/ZVERCMP.m

# 2. Run installer
docker exec wv su - wv -c "mumps -r 'INSTALL^ZVERCMP'"
```

### Verification

```powershell
# Test the RPC
docker exec wv su - wv -c "mumps -r '%XCMD' 'D LIST^ZVERCMP(.R,87) W R(1)'"
```

Expected output: `PROVIDER,CLYDE WV^...^facility_name^...^station_number`

## Safety

- All wrapper RPCs are read-only (no `SET` or `KILL` to VistA globals)
- INSTALL entry is idempotent (checks if RPC already registered)
- RPC registered in File 8994 same as other VE\* RPCs
- Added to `RPC_EXCEPTIONS` in `rpcRegistry.ts` with explanation

## Exception Registry Entry

```typescript
{ name: "VE RCM PROVIDER INFO",
  reason: "Custom RPC installed by VistA-Evolved (ZVERCMP.m) for provider NPI + facility identifiers (Phase 42)" }
```

## Troubleshooting

### RPC not found

Re-run `install-rcm-wrappers.ps1`. The INSTALL entry is idempotent.

### NPI field empty

Most sandbox providers don't have NPI populated. In production,
NPI is stored in `^VA(200,DUZ,41.99)` or `^VA(200,DUZ,"NPI")`.

### Facility info empty

Requires `DUZ(2)` to be set (institution pointer). May be empty
in sandbox for some user accounts.
