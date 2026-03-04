# Phase 71 — Interop Monitor v2 (Real VistA HL7/HLO Grounded)

## User Request

Ensure the Interop Monitor pulls REAL queue state from VistA HL7/HLO
files/queues via custom RPC bridge (ZVEMIOP.m). No fake counts, no stubs.
If data cannot be read, show "integration pending" with exact target
files/RPCs.

## Inventory (Pre-Edit)

### Files Inspected

- `services/vista/ZVEMIOP.m` — Already complete: 6 RPCs reading real globals
- `services/vista/ZVEMINS.m` — Already complete: registers all 6 RPCs in file 8994
- `services/vista/VEMCTX3.m` — GAP: only 4 of 6 RPCs added to context
- `scripts/install-interop-rpcs.ps1` — GAP: doesn't copy/run VEMCTX3.m
- `apps/api/src/routes/vista-interop.ts` — Already grounded: all endpoints use cachedRpc()
- `apps/web/src/app/cprs/admin/integrations/page.tsx` — Already shows real VistA data
- `config/capabilities.json` — GAP: typo in targetRpc, missing 5 capabilities
- `apps/web/src/actions/actionRegistry.ts` — GAP: missing 2 Phase 58 actions

### VistA Globals Read by ZVEMIOP.m

| RPC                    | Global(s)                     | File#    | Purpose                         |
| ---------------------- | ----------------------------- | -------- | ------------------------------- |
| VE INTEROP HL7 LINKS   | ^HLCS(870)                    | 870      | HL7 Logical Link status         |
| VE INTEROP HL7 MSGS    | ^HLMA                         | 773      | Message Admin (time-windowed)   |
| VE INTEROP HLO STATUS  | ^HLD(779.1/779.2/779.4/779.9) | 779.\*   | HLO engine config               |
| VE INTEROP QUEUE DEPTH | ^HLMA, ^HLB                   | 773, 778 | Pending/error queue counts      |
| VE INTEROP MSG LIST    | ^HLMA, ^HL(772)               | 773, 772 | Filtered message list           |
| VE INTEROP MSG DETAIL  | ^HLMA, ^HL(772)               | 773, 772 | Single message + segment counts |

## Implementation Steps

1. **VEMCTX3.m** — Add VE INTEROP MSG LIST and VE INTEROP MSG DETAIL
   to the NAMES variable, change loop from F I=1:1:4 to F I=1:1:6,
   update header count arithmetic
2. **install-interop-rpcs.ps1** — Add VEMCTX3.m to copy list, add
   step 4/5 to run VEMCTX3 context adder
3. **capabilities.json** — Fix typo "VEMHL LINKS" -> "VE INTEROP HL7 LINKS",
   add 5 new capabilities: interop.hl7.read, interop.hlo.read,
   interop.queue.read, interop.msg.list, interop.msg.detail
4. **actionRegistry.ts** — Add interop.msg-list and interop.msg-detail
   actions (both "wired", read-only)

## Verification

Run `scripts/verify-phase71-interop.ps1` — checks all gates.

## Files Touched

- `services/vista/VEMCTX3.m`
- `scripts/install-interop-rpcs.ps1`
- `config/capabilities.json`
- `apps/web/src/actions/actionRegistry.ts`
- `prompts/76-PHASE-71-INTEROP-MONITOR-V2/76-01-IMPLEMENT.md` (this file)
- `scripts/verify-phase71-interop.ps1`
- `docs/runbooks/phase71-interop-monitor-v2.md`
