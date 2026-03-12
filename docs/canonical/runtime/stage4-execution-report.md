# Stage 4 execution report — Runtime truth and proof

> **Purpose:** Record the first full run of local-vista readiness checks and what must be fixed before moving on.

---

## Readiness levels (reference)

| Level | Meaning |
|-------|--------|
| CONTAINER_STARTED | Container exists and status contains "Up" |
| NETWORK_REACHABLE | Both RPC (9432) and SSH (2224) ports accept TCP from host |
| SERVICE_READY | Docker health status = healthy |
| TERMINAL_READY | SSH port 2224 accepts connection |
| RPC_READY | RPC port 9432 accepts connection (required for RPC/API work) |

---

## Commands run

```powershell
Set-Location "c:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved"
.\scripts\runtime\healthcheck-local-vista.ps1
```

---

## Exact output observed

```
=== Local Vista readiness check ===
  RPC port: 9432  SSH port: 2224  Container: local-vista

  CONTAINER_STARTED : FAIL (Created)
  NETWORK_REACHABLE : FAIL (RPC=True SSH=False)
  SERVICE_READY : FAIL (no health status)
  TERMINAL_READY : FAIL (TCP 127.0.0.1:2224)
  RPC_READY : PASS (TCP 127.0.0.1:9432)

  Total: 1 PASS, 4 FAIL
```

Exit code: **1**.

---

## Result by level

| Level | Result | Notes |
|-------|--------|--------|
| CONTAINER_STARTED | **FAIL** | Container `local-vista` exists but status is **Created**, not **Up**. It was never started (or was stopped); likely due to port 9432 already allocated at start time (Stage 3). |
| NETWORK_REACHABLE | **FAIL** | RPC port 9432 is reachable; SSH port 2224 is not. So another process (e.g. another VistA lane) is listening on 9432; the local-vista container is not running. |
| SERVICE_READY | **FAIL** | No Docker health status (container not running, or image has no HEALTHCHECK). |
| TERMINAL_READY | **FAIL** | Port 2224 not accepting connections (local-vista not up). |
| RPC_READY | **PASS** | TCP to 127.0.0.1:9432 succeeds — **but** this is the process that holds the port, not necessarily the local-vista container. |

---

## What must be fixed before moving on

1. **Start the local-vista container**
   - Ensure port **9432** (and **2224**) are free before starting:
     - Stop any other VistA lane using 9432 (e.g. VEHU on 9431, or another service on 9432).
     - Or use a different port: set `LOCAL_VISTA_PORT=9433` (and update compose/scripts to use 9433) and run healthcheck with `-HostPortRpc 9433`.
   - Start: `.\scripts\runtime\start-local-vista.ps1` or  
     `docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d`  
     (with `LOCAL_VISTA_ACCESS` and `LOCAL_VISTA_VERIFY` set).
   - Re-run: `.\scripts\runtime\healthcheck-local-vista.ps1`.

2. **Confirm RPC_READY is from local-vista**
   - After the container is Up, confirm that the process on 9432 is the local-vista container (e.g. `docker ps` shows local-vista and port mapping 9432→9430).

3. **Optional: Docker HEALTHCHECK**
   - If the local-vista image defines a HEALTHCHECK, SERVICE_READY will pass once the container is healthy. If not, either add a HEALTHCHECK (e.g. TCP to 9430 inside container) or treat SERVICE_READY as N/A and rely on CONTAINER_STARTED + NETWORK_REACHABLE + RPC_READY.

---

## Script fix applied during this run

- **healthcheck-local-vista.ps1:** Docker inspect was failing when the container had no health config (e.g. status **Created**). Updated to use a conditional format so missing `.State.Health` does not error:  
  `{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}`

---

## What stage should run next

- **Next:** After fixing port/start so that **CONTAINER_STARTED**, **NETWORK_REACHABLE**, **SERVICE_READY** (or N/A), **TERMINAL_READY**, and **RPC_READY** all pass, run:
  - **Stage 5 (or equivalent):** Prove RPC/terminal against the **local-vista** lane (e.g. login, `/vista/ping`, SSH terminal) and document the canonical dev runtime as fully verified.

---

## Related docs

- Readiness levels: `docs/canonical/runtime/runtime-readiness-levels.md`
- Proof checklist: `docs/canonical/runtime/runtime-proof-checklist.md`
- Lane inspection: `docs/canonical/runtime/local-vista-lane-inspect.md`
- Runtime truth: `docs/canonical/runtime/runtime-truth-normalization.md`
- Runbook lanes: `docs/runbooks/runtime-lanes.md`
