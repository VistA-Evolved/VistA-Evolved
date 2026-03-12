# Runtime readiness levels

> **Five levels of readiness for the local VistA Docker lane.** Each level has a clear pass/fail check. No guessing; no "looks okay."

---

## 1. CONTAINER_STARTED

**Meaning:** The container exists and is in "Up" state (running or restarting).

**Check:** `docker ps -a --filter name=local-vista --format "{{.Status}}"` contains "Up".

**Pass:** Output starts with "Up".  
**Fail:** Container not found, or status is "Exited", "Created", etc.

**Does not prove:** That any port is listening or that the broker/SSH are ready.

---

## 2. NETWORK_REACHABLE

**Meaning:** From the host, TCP connections to the published ports succeed (RPC broker port and SSH port).

**Check:** From host, open TCP connection to `127.0.0.1:9432` and `127.0.0.1:2224` (or configured `LOCAL_VISTA_PORT` / `LOCAL_VISTA_SSH_PORT`). Both must connect within a short timeout (e.g. 3 seconds).

**Pass:** Both ports accept a TCP connection.  
**Fail:** One or both ports refuse connection or timeout.

**Does not prove:** That the RPC broker or SSH daemon have completed their startup (they may still be initializing).

---

## 3. SERVICE_READY

**Meaning:** The container's own healthcheck (Docker HEALTHCHECK) is reporting "healthy". The in-container script probes the RPC broker port from inside the container.

**Check:** `docker inspect --format '{{.State.Health.Status}}' local-vista` equals `healthy`.

**Pass:** Output is exactly `healthy`.  
**Fail:** Output is `starting`, `unhealthy`, or empty (no health status).

**Note:** Healthcheck has `start_period: 120s`, so the container may be "Up" for up to 2 minutes before SERVICE_READY passes.

---

## 4. TERMINAL_READY

**Meaning:** SSH is listening on the published SSH port and accepts connections (suitable for later terminal/roll-and-scroll work).

**Check:** From host, TCP connection to `127.0.0.1:2224` (or `LOCAL_VISTA_SSH_PORT`) succeeds. Optionally, SSH banner can be read (e.g. first line of response contains "SSH").

**Pass:** TCP connect succeeds and (if implemented) SSH banner received.  
**Fail:** TCP connect fails or timeout.

**Does not prove:** That SSH authentication works (credentials); only that the service is listening.

---

## 5. RPC_READY

**Meaning:** The RPC broker port accepts TCP connections from the host and is suitable for RPC Broker protocol (e.g. API `/vista/ping` or XWB client).

**Check:** From host, TCP connection to `127.0.0.1:9432` (or `LOCAL_VISTA_PORT`) succeeds. Optionally, the API can be used with `VISTA_PORT=9432` and `GET /vista/ping` returns `{"ok":true,"vista":"reachable",...}`.

**Pass:** TCP connect succeeds. If API is configured for this port, `GET /vista/ping` returns ok.  
**Fail:** TCP connect fails or timeout; or API ping returns error.

**Does not prove:** Full RPC sign-on or specific RPCs; only that the broker port is reachable and (when using API) the ping endpoint succeeds.

---

## Order and dependencies

| Level | Depends on | Typical order |
|-------|------------|----------------|
| CONTAINER_STARTED | (none) | 1 |
| NETWORK_REACHABLE | Container published ports | 2 |
| SERVICE_READY | Container healthcheck (broker inside container) | 3 |
| TERMINAL_READY | SSH daemon listening | 4 (can be parallel with RPC_READY) |
| RPC_READY | Broker listening | 5 |

SERVICE_READY implies the in-container healthcheck passed, which means the broker port inside the container is listening. So NETWORK_REACHABLE (from host to 9432) and RPC_READY (broker reachable) will typically pass once SERVICE_READY passes, unless there is a port-mapping or firewall issue.

---

## Relation to other docs

- **Proof checklist** — `docs/canonical/runtime/runtime-proof-checklist.md`
- **Canonical dev profile** — `docs/canonical/runtime/canonical-dev-runtime-profile.md`
- **Local VistA build** — `docs/canonical/runtime/local-vista-docker-build.md`
