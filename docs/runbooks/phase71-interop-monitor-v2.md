# Interop Monitor v2 -- Real VistA HL7/HLO Queue State

## Overview

Phase 71 ensures the Interop Monitor is fully grounded to real VistA
HL7/HLO queue state via 6 custom RPCs in ZVEMIOP.m. No fake counts,
no stubs. All data comes from real VistA globals.

## Architecture

```
Browser -> /vista/interop/* -> cachedRpc() -> VE INTEROP * RPCs
                                                  |
                                            ZVEMIOP.m (6 entry points)
                                                  |
                          +---+---+---+---+---+---+
                          |   |   |   |   |   |   |
                    ^HLCS  ^HLMA  ^HLD  ^HL  ^HLB  ^HLCS
                    (870)         (779*) (772)       (776)
```

## RPCs (all read-only)

| RPC Name | Entry Point | Global(s) | Purpose |
|----------|-------------|-----------|---------|
| VE INTEROP HL7 LINKS | LINKS^ZVEMIOP | ^HLCS(870) | HL7 logical link status |
| VE INTEROP HL7 MSGS | MSGS^ZVEMIOP | ^HLMA | Message history (time-windowed) |
| VE INTEROP HLO STATUS | HLOSTAT^ZVEMIOP | ^HLD(779.*) | HLO engine configuration |
| VE INTEROP QUEUE DEPTH | QLENGTH^ZVEMIOP | ^HLMA, ^HLB | Pending/error queue counts |
| VE INTEROP MSG LIST | MSGLIST^ZVEMIOP | ^HLMA, ^HL(772) | Filtered message list |
| VE INTEROP MSG DETAIL | MSGDETL^ZVEMIOP | ^HLMA, ^HL(772) | Single message detail |

## Installation

```powershell
# Install/update RPCs in Docker sandbox
.\scripts\install-interop-rpcs.ps1
```

This copies ZVEMIOP.m, ZVEMINS.m, VEMCTX3.m into the container,
registers RPCs in file 8994, and adds them to OR CPRS GUI CHART context.

## API Endpoints

### Phase 21 (original)
- `GET /vista/interop/hl7-links` -- HL7 logical links
- `GET /vista/interop/hl7-messages` -- Recent messages
- `GET /vista/interop/hlo-status` -- HLO engine status
- `GET /vista/interop/queue-depth` -- Queue pending/error counts
- `GET /vista/interop/summary` -- Combined summary

### Phase 58 (v2 message browser)
- `GET /vista/interop/v2/hl7/messages` -- Filtered message list
- `GET /vista/interop/v2/hl7/messages/:id` -- Message detail
- `POST /vista/interop/v2/hl7/messages/:id/unmask` -- PHI unmask (admin)
- `GET /vista/interop/v2/hl7/summary` -- HL7 summary
- `GET /vista/interop/v2/hlo/summary` -- HLO summary

## Resilience

All RPC calls use `cachedRpc()` which wraps `resilientRpc()`:
- Circuit breaker: 5 failures -> open, 30s half-open, 2 retries + backoff
- Timeout: 15s per RPC call
- Cache TTL: 10s (configurable)

## PHI Safety

ZVEMIOP.m masks PHI-bearing segments (PID, NK1, GT1, IN1, IN2, ACC).
Segment content is never returned raw. Admin unmask requires audit logging.

## Verification

```powershell
.\scripts\verify-phase71-interop.ps1
```

36 gates covering M routines, capabilities, actions, API routes, and TSC.
