# Phase 58 -- VistA-First HL7/HLO Interop Monitor v2 Runbook

## Overview

Phase 58 adds a real interop monitor that reads individual HL7 messages directly
from VistA files #773 (HL7 MESSAGE ADMIN) and #772 (HL7 MESSAGE TEXT). All data
comes from VistA RPCs -- no mocks, no fake metrics. PHI segments are masked by
default; unmasking requires admin role + justification and is audited.

## Architecture

```
VistA Docker (port 9430)
  ^HLMA (#773) -- message admin records (direction, status, link, date)
  ^HL(772)     -- message text (raw HL7 segments -- PHI present)
        |
  ZVEMIOP.m v1.1 (read-only M routine)
    MSGLIST -- returns metadata rows (no body)
    MSGDETL -- returns metadata + segment TYPE SUMMARY (no raw content)
        |
  RPC Broker (XWB protocol)
    VE INTEROP MSG LIST    -> MSGLIST^ZVEMIOP
    VE INTEROP MSG DETAIL  -> MSGDETL^ZVEMIOP
        |
  API (Fastify)
    GET /vista/interop/v2/hl7/messages
    GET /vista/interop/v2/hl7/messages/:id
    POST /vista/interop/v2/hl7/messages/:id/unmask
    GET /vista/interop/v2/hl7/summary
    GET /vista/interop/v2/hlo/summary
        |
  Web UI
    Admin > Integrations > Message Browser tab
```

## Prerequisites

1. VistA Docker running on port 9430
2. ZVEMIOP.m and ZVEMINS.m installed (run `scripts/install-interop-rpcs.ps1`)
3. API started with `.env.local` credentials

## PHI Masking Strategy

| Segment Type | Contains PHI? | Default State |
|-------------|---------------|---------------|
| PID         | Yes -- patient identifiers, names, SSN | MASKED |
| NK1         | Yes -- next of kin information | MASKED |
| GT1         | Yes -- guarantor information | MASKED |
| IN1         | Yes -- insurance information | MASKED |
| IN2         | Yes -- insurance additional info | MASKED |
| ACC         | Yes -- accident information | MASKED |
| MSH         | No -- message header | Not masked |
| EVN         | No -- event type | Not masked |
| OBR         | No -- observation request | Not masked |
| OBX         | Mixed -- depends on content | Not masked* |

*Note: ZVEMIOP.m only returns segment TYPE NAMES and COUNTS, not actual
segment content. The "masked" flag is informational -- it tells the viewer
which segment types would contain PHI if content were exposed.

## Unmask Flow

1. User must have `admin` role
2. User provides reason text (minimum 10 characters)
3. API records `interop.message-unmask` audit event with:
   - Who (DUZ, name, role)
   - What (message IEN)
   - Why (reason text)
4. Response returns with `masked: false` on all segments
5. UI shows unmask confirmation banner (red border, shows who/when/why)

## API Endpoints

### GET /vista/interop/v2/hl7/messages
Query params: `direction` (I/O/*), `status` (D/E/P/*), `limit` (25/50/100)
Returns array of message metadata rows.

### GET /vista/interop/v2/hl7/messages/:id
Returns single message metadata + segment type summary.
PHI segment types flagged with `masked: true`.

### POST /vista/interop/v2/hl7/messages/:id/unmask
Body: `{ "reason": "..." }` (min 10 chars)
Requires admin role. Returns detail with `masked: false`.

### GET /vista/interop/v2/hl7/summary
Combined HL7 dashboard: links + message stats + queue depth.

### GET /vista/interop/v2/hlo/summary
Combined HLO dashboard: system params + apps + queues.

## Verification

```powershell
.\scripts\verify-phase58-interop-monitor.ps1 -Verbose
```

All 10 gates must pass.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Messages list empty | RPCs not installed | Run `scripts/install-interop-rpcs.ps1` |
| 404 on message detail | Invalid IEN | Check IEN exists in message list |
| 403 on unmask | Non-admin user | Only admin role can unmask |
| Unmask reason rejected | Too short | Must be at least 10 characters |
| Circuit breaker open | VistA down | Wait 30s, restart Docker if needed |
