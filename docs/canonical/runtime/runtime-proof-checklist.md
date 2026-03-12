# Runtime proof checklist (local-vista lane)

> **Repeatable verification steps and pass/fail criteria.** Use with `scripts/runtime/healthcheck-local-vista.ps1`.

---

## Prerequisites

- Docker running.
- Local-vista image built: `vista-evolved/local-vista:latest`.
- Credentials set: `LOCAL_VISTA_ACCESS`, `LOCAL_VISTA_VERIFY`.
- Container started: `docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d` (or `.\scripts\runtime\start-local-vista.ps1`).

---

## Readiness levels (summary)

| Level | Check | Pass condition |
|-------|--------|-----------------|
| CONTAINER_STARTED | Container exists and status contains "Up" | `docker ps` shows local-vista Up |
| NETWORK_REACHABLE | TCP 9432 and 2224 from host | Both ports accept connection |
| SERVICE_READY | Docker health status | `docker inspect` health = healthy |
| TERMINAL_READY | TCP 2224 (SSH) from host | Port accepts connection |
| RPC_READY | TCP 9432 (broker) from host | Port accepts connection; optional: API /vista/ping ok |

---

## Exact commands (manual proof)

```powershell
# 1. CONTAINER_STARTED
docker ps -a --filter name=local-vista --format "{{.Names}} {{.Status}}"
# Pass: line contains "local-vista" and "Up"

# 2. NETWORK_REACHABLE (PowerShell TCP test)
$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect("127.0.0.1", 9432); $tcp.Close(); "RPC port OK" } catch { "RPC port FAIL" }
$tcp2 = New-Object System.Net.Sockets.TcpClient; try { $tcp2.Connect("127.0.0.1", 2224); $tcp2.Close(); "SSH port OK" } catch { "SSH port FAIL" }
# Pass: both report OK

# 3. SERVICE_READY
docker inspect --format "{{.State.Health.Status}}" local-vista
# Pass: output is "healthy"

# 4. TERMINAL_READY
$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect("127.0.0.1", 2224); $tcp.Close(); "PASS" } catch { "FAIL" }
# Pass: PASS

# 5. RPC_READY
$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect("127.0.0.1", 9432); $tcp.Close(); "PASS" } catch { "FAIL" }
# Pass: PASS
# Optional: set API to port 9432, then curl http://127.0.0.1:3001/vista/ping -> {"ok":true,...}
```

---

## Script

Run all levels with clear pass/fail:

```powershell
.\scripts\runtime\healthcheck-local-vista.ps1
```

Output format: one line per level, `PASS` or `FAIL`, and optional detail.

---

## What must be true before claiming "VistA is ready"

- At least **SERVICE_READY** and **RPC_READY** must pass before using the lane for RPC or API work.
- **TERMINAL_READY** must pass before using SSH/terminal features.
- Do not claim the lane is ready if only CONTAINER_STARTED passes (container may still be in start_period or unhealthy).

---

## Relation to other docs

- **Readiness levels** — `docs/canonical/runtime/runtime-readiness-levels.md`
- **Canonical dev profile** — `docs/canonical/runtime/canonical-dev-runtime-profile.md`
