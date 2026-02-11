# VistA RPC Patient Search (Phase 4)

This runbook documents how to perform a minimal connectivity proof and the first
steps toward a real VistA patient search via the RPC Broker.

## Important
- Do NOT store credentials in the repository. Use environment variables:
  - `VISTA_ACCESS_CODE`
  - `VISTA_VERIFY_CODE`
- This Phase 4 implementation performs connectivity checks and validates
  credentials presence, but does NOT implement the full RPC Broker protocol.

## Steps (PowerShell)

From repo root: `C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved`

### 1) Start the sandbox
```powershell
docker-compose -f services/vista/docker-compose.yml up -d
```

### 2) Verify sandbox is running
```powershell
docker ps
Test-NetConnection 127.0.0.1 -Port 9430
```

Expected `Test-NetConnection` output:
```
ComputerName     : 127.0.0.1
RemoteAddress    : 127.0.0.1
RemotePort       : 9430
TcpTestSucceeded : True
```

### 3) Provide credentials (environment)
Set credentials in the same terminal (temporary):
```powershell
$env:VISTA_ACCESS_CODE="<ACCESS>"
$env:VISTA_VERIFY_CODE="<VERIFY>"
```

**Do not commit these values.**

### 4) Start the API
```powershell
pnpm -C apps/api dev
```

Expected output:
```
Server listening on http://127.0.0.1:3001
```

### 5) Call patient-search endpoint
```powershell
curl "http://127.0.0.1:3001/vista/patient-search?q=smith" -UseBasicParsing
```

Possible outputs:

- If sandbox unreachable:
```
Content : {"ok":false,"error":"VistA RPC not reachable: <reason>","hint":"Start sandbox and ensure port is reachable"}
```

- If credentials missing:
```
Content : {"ok":false,"error":"missing credentials","hint":"Set VISTA_ACCESS_CODE and VISTA_VERIFY_CODE in environment"}
```

- If Broker protocol not implemented (expected for this minimal Phase 4):
```
Content : {"ok":false,"error":"RPC Broker sign-on not implemented: requires VistA RPC Broker packet framing and RPC protocol. Use a dedicated client (e.g., mg-dbx-napi) or implement the Broker protocol before attempting login.","hint":"See docs/runbooks/vista-rpc-patient-search.md"}
```

## Next steps
- Implement Broker protocol or use `mg-dbx-napi` to perform authenticated RPCs.
- Once sign-on works, implement `ORQPT FIND PATIENT` RPC call and return real results.

*** End of runbook
