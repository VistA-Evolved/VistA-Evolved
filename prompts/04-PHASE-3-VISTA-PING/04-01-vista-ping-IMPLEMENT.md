# Phase 3 — /vista/ping (IMPLEMENT)

Goal:
Add /vista/ping that checks TCP reachability only (no credentials).

Rules:
- do not touch broker client auth code
- must return:
  { "ok": true, "vista": "reachable", "port": 9430 }
  when sandbox is up

Docs:
- docs/runbooks/vista-connectivity.md
