# VistA RPC Patient Search (Phase 4B)

This runbook demonstrates searching for patients by name using the `ORWPT LIST ALL`
RPC via the Node.js API.

## Prerequisites

- Docker running, WorldVistA sandbox started (see [local-vista-docker.md](local-vista-docker.md))
- `apps/api/.env.local` configured with credentials (see [vista-rpc-default-patient-list.md](vista-rpc-default-patient-list.md))

## RPC Details

| Item         | Value                                            |
| ------------ | ------------------------------------------------ |
| **RPC Name** | `ORWPT LIST ALL`                                 |
| **Context**  | `OR CPRS GUI CHART`                              |
| **Param 1**  | FROM — starting search string (case-insensitive) |
| **Param 2**  | DIR — `"1"` for forward alphabetical             |
| **Response** | Lines of `DFN^NAME^^^^NAME`                      |

## Steps

### 1) Start the sandbox (if not running)

```powershell
cd services\vista
docker compose --profile dev up -d
```

Wait ~10 seconds, then verify:

```powershell
Test-NetConnection 127.0.0.1 -Port 9430 -WarningAction SilentlyContinue
```

### 2) Start the API

```powershell
pnpm -C apps/api dev
```

Expected: `Server listening on http://127.0.0.1:3001`

### 3) Search for patients

```powershell
curl "http://127.0.0.1:3001/vista/patient-search?q=ZZ" -UseBasicParsing
```

### 4) Expected response

**Success (patients found):**

```json
{
  "ok": true,
  "count": 3,
  "results": [
    { "dfn": "1", "name": "ZZ PATIENT,TEST ONE" },
    { "dfn": "3", "name": "ZZ PATIENT,TEST THREE" },
    { "dfn": "2", "name": "ZZ PATIENT,TEST TWO" }
  ],
  "rpcUsed": "ORWPT LIST ALL"
}
```

**No matches:**

```json
{
  "ok": true,
  "count": 0,
  "results": [],
  "rpcUsed": "ORWPT LIST ALL"
}
```

**Query too short (< 2 chars):**

```json
{
  "ok": false,
  "error": "Query too short",
  "hint": "Use ?q=SMI (minimum 2 characters)"
}
```

**Missing credentials:**

```json
{
  "ok": false,
  "error": "Missing VistA credentials. Create apps/api/.env.local and set: ...",
  "hint": "Set VISTA credentials in apps/api/.env.local"
}
```

## Troubleshooting

### "TCP connect timeout" or ECONNREFUSED

- Sandbox not running: `docker ps` to check, `docker compose --profile dev up -d` to start
- Wait 15s after container start for port 9430 to be ready

### Sign-on failed

- Verify credentials in `apps/api/.env.local` match the WorldVistA defaults
  (PROV123 / PROV123!!) — see `apps/api/.env.example`

### 0 results for a name you expect

- The fresh WorldVistA sandbox has only 3 test patients (ZZ PATIENT,TEST ONE/TWO/THREE)
- Search is alphabetical starting from the search string; try `?q=ZZ`

## Implementation Notes

- Endpoint: `GET /vista/patient-search?q=<string>`
- Uses `rpcBrokerClient.ts` → `connect()` + `callRpc("ORWPT LIST ALL", [query, "1"])` + `disconnect()`
- Same XWB protocol flow as Phase 4A (TCPConnect → SIGNON → AV CODE → CREATE CONTEXT → RPC)
- No changes to the RPC protocol implementation were needed
