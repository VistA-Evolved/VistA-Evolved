# Runtime truth normalization

> **Canonical local dev runtime and port/profile conflicts.** Single place that states what is canonical and what conflicts exist.

---

## Canonical local dev runtime

For **local-source-first** development (build from `vendor/upstream`, no pull during build), the canonical lane is:

| Item | Value |
|------|--------|
| **Lane name** | Lane E — Local Vista |
| **Service / container** | `local-vista` |
| **Compose** | `docker/local-vista/compose.yaml` with profile `local-vista` |
| **RPC port (host)** | **9432** |
| **SSH port (host)** | **2224** |
| **Governed by** | `docs/canonical/runtime/canonical-dev-runtime-profile.md`, `local-vista-lane-inspect.md`, `runtime-readiness-levels.md`, `runtime-proof-checklist.md` |

No other lane uses 9432/2224 by default. This avoids conflict with VEHU (9431) and Legacy (9430).

---

## Conflicting defaults (documented)

| Conflict | Detail |
|----------|--------|
| **VEHU vs Distro** | Both default to RPC port **9431**. Do not run both without changing `VISTA_DISTRO_PORT`. |
| **Multiple “recommended” lanes** | Runtime-lanes.md recommends VEHU for day-to-day (pre-built). Canonical docs recommend **local-vista** for the governed local build lane. They serve different purposes: VEHU = pre-built demo/RPC truth; local-vista = build-from-vendor proof. |
| **Port heuristic in API** | API `swap-boundary` uses port to infer instance: 9431 → vehu, 9430 → worldvista-ehr, 9210 → worldvista-ehr. Port **9432** is not in the default heuristic; set `VISTA_INSTANCE_ID=local-vista` when connecting API to this lane. |

---

## Normalization decisions

1. **One canonical local build lane:** `local-vista` on port 9432. All new “local build” documentation and scripts refer to this lane and these ports.
2. **Readiness is proof-based:** Do not claim VistA is ready based only on container start. Use the five readiness levels and `healthcheck-local-vista.ps1`; require at least SERVICE_READY and RPC_READY for RPC work.
3. **Runtime-lanes.md** remains the multi-lane comparison; it now includes Lane E and points to canonical runtime docs for local-vista.
4. **API connection to local-vista:** Set `VISTA_HOST=127.0.0.1`, `VISTA_PORT=9432`, `VISTA_INSTANCE_ID=local-vista`, and matching credentials.

---

## Relation to other docs

- **Canonical dev profile** — `docs/canonical/runtime/canonical-dev-runtime-profile.md`
- **Runtime lanes (runbook)** — `docs/runbooks/runtime-lanes.md`
- **Readiness levels** — `docs/canonical/runtime/runtime-readiness-levels.md`
- **Proof checklist** — `docs/canonical/runtime/runtime-proof-checklist.md`
