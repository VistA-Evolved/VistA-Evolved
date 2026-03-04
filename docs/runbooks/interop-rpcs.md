# Interop RPCs — VistA HL7/HLO Telemetry

> Phase 21: real-time read-only telemetry from VistA HL7/HLO globals.

## Overview

Four custom RPCs are registered in VistA file #8994 and added to the
"OR CPRS GUI CHART" context. They call the `ZVEMIOP` M routine, which
reads VistA globals in a strictly read-only fashion.

| RPC Name               | Entry Point     | VistA Files                          | Returns                |
| ---------------------- | --------------- | ------------------------------------ | ---------------------- |
| VE INTEROP HL7 LINKS   | LINKS^ZVEMIOP   | #870                                 | Logical link inventory |
| VE INTEROP HL7 MSGS    | MSGS^ZVEMIOP    | #773, #772                           | Message activity stats |
| VE INTEROP HLO STATUS  | HLOSTAT^ZVEMIOP | #779.1, #779.2, #779.4, #779.9, #778 | HLO engine status      |
| VE INTEROP QUEUE DEPTH | QLENGTH^ZVEMIOP | #773, #778, #776                     | Queue depth indicators |

## Installation

### Automated (recommended)

```powershell
.\scripts\install-interop-rpcs.ps1
```

### Manual

```bash
# 1. Copy M routines into container
docker cp services/vista/ZVEMIOP.m wv:/home/wv/r/ZVEMIOP.m
docker cp services/vista/ZVEMINS.m wv:/home/wv/r/ZVEMINS.m
docker cp services/vista/VEMCTX3.m wv:/home/wv/r/VEMCTX3.m

# 2. Register RPCs
docker exec wv su - wv -c "mumps -run ZVEMINS"

# 3. Add to OR CPRS GUI CHART context
docker exec wv su - wv -c "mumps -run VEMCTX3"

# 4. Smoke test
docker exec wv su - wv -c "mumps -run VETEST"
```

## API Endpoints

All endpoints require an authenticated session (`ehr_session` cookie).

| Method | Path                                  | Description                       |
| ------ | ------------------------------------- | --------------------------------- |
| GET    | `/vista/interop/hl7-links?max=N`      | HL7 logical links (default N=100) |
| GET    | `/vista/interop/hl7-messages?hours=N` | Message stats (default N=24)      |
| GET    | `/vista/interop/hlo-status`           | HLO engine + app registry         |
| GET    | `/vista/interop/queue-depth`          | Queue depth indicators            |
| GET    | `/vista/interop/summary`              | Combined dashboard (all 4 RPCs)   |

## Verification

```powershell
# Login
curl.exe -s -c cookies.txt http://127.0.0.1:3001/auth/login -X POST `
  -H "Content-Type: application/json" `
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Test each endpoint
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/hl7-links?max=5
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/hl7-messages
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/hlo-status
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/queue-depth
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/summary
```

All should return `{"ok":true,...}` with real VistA data.

## Troubleshooting

| Symptom                | Cause                         | Fix                                                         |
| ---------------------- | ----------------------------- | ----------------------------------------------------------- |
| 502 "VistA RPC failed" | VistA container down          | `docker compose -f services/vista/docker-compose.yml up -d` |
| 502 "context" error    | RPCs not in OR CPRS GUI CHART | Run VEMCTX3                                                 |
| Empty links array      | ZVEMIOP not installed         | Run `install-interop-rpcs.ps1`                              |
| 401 Unauthorized       | No session cookie             | Login first via `/auth/login`                               |

## M Routine Details

### ZVEMIOP.m

Read-only routine with 4 entry points. Each writes results into the
`RESULTS` array passed by reference from the RPC Broker.

- **LINKS(RESULTS,MAX)** — Iterates `^HLCS(870)` to enumerate HL7 logical links
- **MSGS(RESULTS,HOURS)** — Scans `^HLMA` for message counts within lookback window
- **HLOSTAT(RESULTS)** — Reads `^HLD(779.1)` system params + `^HLD(779.2)` app registry
- **QLENGTH(RESULTS)** — Counts queue entries across `^HLMA`, `^HLB`, `^HLCS(776)`

### RPC Registration (IENs 3108–3111)

Registered via `ZVEMINS.m` which creates entries in file #8994.
Context entries added via `VEMCTX3.m` at sub-IENs 2150–2153 of
`^DIC(19,8552,"RPC")`.
