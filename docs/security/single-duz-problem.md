# Single-DUZ Problem: Patient Safety Critical

> **Severity:** CRITICAL — Patient Safety + Legal Liability
> **Discovered:** Wave 42 Production Remediation Audit (Phase 572)
> **Fix:** Phase 573 (RPC Connection Pool with DUZ-per-request)
> **Status:** Documented — fix designed, implementation pending

---

## Problem Statement

The VistA-Evolved API authenticates to VistA **once** at startup using a single
set of credentials configured in `.env.local`:

```
VISTA_ACCESS_CODE=PROV123
VISTA_VERIFY_CODE=PROV123!!
```

This establishes a single TCP connection to the VistA RPC Broker that
authenticates as **PROVIDER,CLYDE WV (DUZ 87)**. Every subsequent RPC call from
every logged-in user — regardless of which clinician initiated the action —
executes under DUZ 87.

### Impact

| Area                          | Risk                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| **Clinical Notes**            | All TIU notes authored by DUZ 87, not the actual clinician   |
| **Orders**                    | All CPOE orders signed under DUZ 87                          |
| **Medication Administration** | All MAR entries attributed to DUZ 87                         |
| **VistA Audit Trail**         | Meaningless — all actions appear as one user                 |
| **Legal Liability**           | Clinical actions not legally attributable to acting provider |
| **Regulatory**                | Fails ONC certification criteria for user attribution        |
| **Patient Safety**            | Wrong provider on safety-critical medication orders          |

### Current Code Path

1. `apps/api/src/vista/rpcBrokerClient.ts` — Single global `sock: Socket` variable
2. `connect()` — Authenticates once with env var credentials
3. `authenticateUser()` — Returns DUZ for the env var user (DUZ 87)
4. `callRpc()` — All RPC calls use this single authenticated socket
5. `withBrokerLock()` — Global mutex serializes ALL RPC calls through one socket

```
Browser → Fastify API → withBrokerLock() → single socket → VistA (always DUZ 87)
         ↑                                                     ↑
   Clinician A, B, C...                            All appear as DUZ 87
```

---

## Fix Design (Phase 573)

### Architecture: Connection Pool with Per-User Authentication

Replace the single global socket with a connection pool keyed by `tenantId:duz`.

```
Browser → Fastify API → RpcConnectionPool
                           ├── tenant1:duz87 → socket A (PROVIDER,CLYDE)
                           ├── tenant1:duz92 → socket B (NURSE,HELEN)
                           ├── tenant1:duz95 → socket C (PHARMACIST,LINDA)
                           └── tenant2:duz150 → socket D (DR.SMITH at Hospital B)
```

### How It Works

1. **Login** (`POST /auth/login`):
   - User submits access/verify codes
   - API authenticates via `XUS AV CODE` on a temporary socket
   - VistA returns the user's DUZ
   - Session stores `{ duz, tenantId }` (credentials NOT stored in session)

2. **RPC Call** (`safeCallRpc(rpcName, params, { tenantId, duz })`):
   - Pool looks up key `tenantId:duz`
   - If a healthy connection exists for that DUZ, use it
   - If not, create a new connection and authenticate as that DUZ
   - Per-connection mutex (not global) allows parallel RPC calls for different users

3. **Connection Lifecycle**:
   - Idle connections reaped after 5 minutes (configurable via `VISTA_IDLE_TIMEOUT_MS`)
   - Per-user limit: 1-3 connections (configurable via `VISTA_MAX_CONNECTIONS_PER_USER`)
   - Per-instance limit: 50 total connections (configurable via `VISTA_MAX_POOL_TOTAL`)
   - Health check on reuse: verify socket is alive before sending RPC

4. **Service-Level Calls**:
   - Webhooks, cron jobs, system probes use the system DUZ from env vars
   - These are clearly labeled as `system` context in audit trails

### Re-Authentication Strategy

The original design stored access/verify codes in the session for
re-authentication. This is **not recommended** because:

- Credentials at rest in PG are a security risk even when encrypted
- VistA sessions have their own timeout

Instead, the pool pre-authenticates connections at login time and keeps
them alive. If a connection dies, the user must re-login (their session
expires naturally anyway after the configured TTL).

### Backward Compatibility

- The existing `connect()`, `callRpc()`, `disconnect()` functions remain
  as the low-level protocol layer
- `safeCallRpc` gains an optional `context` parameter; calls without
  context fall back to the system DUZ (preserving existing behavior)
- Routes are migrated incrementally to pass `{ tenantId, duz }` context

### Configuration

| Env Var                          | Default | Description                            |
| -------------------------------- | ------- | -------------------------------------- |
| `VISTA_POOL_SIZE`                | 1       | Connections per user per tenant        |
| `VISTA_MAX_CONNECTIONS_PER_USER` | 3       | Max connections per user               |
| `VISTA_MAX_POOL_TOTAL`           | 50      | Max total connections per API instance |
| `VISTA_IDLE_TIMEOUT_MS`          | 300000  | Idle connection reap timeout (5 min)   |

---

## Verification Plan

After Phase 573 implementation:

1. Login as PROVIDER,CLYDE (DUZ 87) — call RPC — verify response attributes to DUZ 87
2. Login as NURSE,HELEN — call RPC — verify response attributes to different DUZ
3. Both sessions active simultaneously — verify no cross-contamination
4. Create TIU note as each user — verify `AUTHOR` field in VistA matches acting user
5. Save order as each user — verify `ENTERED BY` field in VistA matches acting user
