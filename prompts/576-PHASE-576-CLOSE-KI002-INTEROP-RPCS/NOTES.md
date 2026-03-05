# Phase 576 — NOTES

## Root Cause Analysis

KI-002 was opened because the VEHU container lacked the custom ZVEMIOP.m
routine (or it was present but ZVEMINS.m / VEMCTX3.m had not been run to
register the RPCs in File 8994 and add them to OR CPRS GUI CHART context).

The M routines themselves are correct — ZVEMINS.m registers all 6 RPCs
and VEMCTX3.m adds all 6 to context. The issue was purely that the
installer hadn't been (re-)run against the VEHU container after the
Phase 155 unified installer was created.

## RPCs Covered

| RPC Name | Tag^Routine | Function |
|---|---|---|
| VE INTEROP HL7 LINKS | LINKS^ZVEMIOP | HL7 logical link status from #870 |
| VE INTEROP HL7 MSGS | MSGS^ZVEMIOP | HL7 message activity from #773 |
| VE INTEROP HLO STATUS | HLOSTAT^ZVEMIOP | HLO app registry from #779.* |
| VE INTEROP QUEUE DEPTH | QLENGTH^ZVEMIOP | Queue depth from #773/#778/#776 |
| VE INTEROP MSG LIST | MSGLIST^ZVEMIOP | Message list from #773 |
| VE INTEROP MSG DETAIL | MSGDETL^ZVEMIOP | Message detail from #773/#772 |

## Observation

3 of 6 RPCs (LINKS, MSG LIST, MSG DETAIL) were already working before
this phase. The "doesn't exist" errors on the other 3 may have been
XWB response buffering artifacts (see VISTA_CONNECTIVITY_RESULTS.md note).
The verifier will determine the actual state.
