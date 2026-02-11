# VistA RPC Default Patient List (Phase 4A)

This runbook demonstrates the first working RPC call from the Node.js API to VistA.
It calls the `ORQPT DEFAULT PATIENT LIST` RPC and returns real patient data.

## Prerequisites

- Docker running on Windows
- WorldVistA sandbox available (see [docs/runbooks/local-vista-docker.md](local-vista-docker.md))
- Access Code and Verify Code (dev credentials for sandbox)

## Setup: Create environment file

From repo root `C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved`:

Create or edit `apps/api/.env.local`:

```
VISTA_HOST=127.0.0.1
VISTA_PORT=9430
VISTA_ACCESS_CODE=PROV123
VISTA_VERIFY_CODE=PROV123!!
VISTA_CONTEXT=OR CPRS GUI CHART
VISTA_DEBUG=true
```

> The credentials above are the default **PROVIDER,CLYDE WV** (DUZ 87) account
> that ships with the `worldvista/worldvista-ehr` Docker image.  Other built-in
> accounts: `PHARM123`/`PHARM123!!` (PHARMACIST,LINDA WV) and
> `NURSE123`/`NURSE123!!` (NURSE,HELEN WV).

> **VISTA_DEBUG=true** prints each XWB protocol step (TCPConnect, SIGNON,
> AV CODE, CREATE CONTEXT, RPC call/response) **and raw hex dumps** to stdout.
> Credentials are **never** logged. Remove the line or set to `false` once the
> connection is working.

**Important:** Do NOT commit `.env.local`. It is in `.gitignore` for security.

## Steps

### 1) Start the VistA sandbox

```powershell
cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved\services\vista
docker compose --profile dev up -d
```

Wait ~10 seconds for the container to start.

### 2) Verify RPC port is listening

```powershell
Test-NetConnection 127.0.0.1 -Port 9430 -WarningAction SilentlyContinue
```

Expected output:
```
ComputerName     : 127.0.0.1
RemoteAddress    : 127.0.0.1
RemotePort       : 9430
TcpTestSucceeded : True
```

If `TcpTestSucceeded` is `False`, wait a few more seconds or check sandbox logs:
```powershell
docker logs wv
```

### 3) Build the API

```powershell
cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved
pnpm -C apps/api build
```

### 4) Start the API dev server

```powershell
pnpm -C apps/api dev
```

Expected output:
```
Server listening on http://127.0.0.1:3001
```

### 5) Test the endpoint

In a new PowerShell terminal:

```powershell
curl "http://127.0.0.1:3001/vista/default-patient-list" -UseBasicParsing
```

### 6) Expected response

**Success (credentials correct, RPC executed):**

```json
{
  "ok": true,
  "count": 0,
  "results": []
}
```

> `count: 0` is normal for a fresh WorldVistA sandbox — the PROVIDER,CLYDE WV
> user has no default patient list configured.  The important signal is `ok: true`,
> which proves the full XWB handshake (TCPConnect → SIGNON SETUP → AV CODE →
> CREATE CONTEXT → RPC) completed successfully.

**Errors:**

- **Missing credentials:**
  ```json
  {
    "ok": false,
    "error": "Missing VistA credentials. Create apps/api/.env.local and set: ...",
    "hint": "Set VISTA credentials in apps/api/.env.local"
  }
  ```

- **RPC Broker unreachable:**
  ```json
  {
    "ok": false,
    "error": "Broker connection error: connect ECONNREFUSED 127.0.0.1:9430",
    "hint": "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct"
  }
  ```

- **Authentication failed:**
  ```json
  {
    "ok": false,
    "error": "Sign-on failed: ...",
    "hint": "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct"
  }
  ```

## Troubleshooting

### Sandbox not starting
```powershell
cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved\services\vista
docker compose --profile dev logs wv
```

### Port 9430 not responding
- Ensure sandbox container is running: `docker ps`
- Restart:
  ```powershell
  cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved\services\vista
  docker compose --profile dev restart
  ```

### Sign-on fails ("Sign-on failed")
- Verify `VISTA_ACCESS_CODE` and `VISTA_VERIFY_CODE` are correct in `.env.local`
- Check VistA security logs in sandbox

### No results returned
- Check that the RPC `ORQPT DEFAULT PATIENT LIST` is valid in your VistA instance
- Confirm context `OR CPRS GUI CHART` is valid (set `VISTA_CONTEXT` in `.env.local`)

## Next steps

- Extend with more search-based RPCs (e.g., `ORQPT FIND PATIENT`)
- Implement patient demographics lookup
- Add additional VistA RPCs as needed
