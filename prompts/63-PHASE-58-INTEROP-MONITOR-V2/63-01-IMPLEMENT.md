# Phase 58 — IMPLEMENT: VistA-First HL7/HLO Interop Monitor v2

## User Request

Implement a real interop monitor that reads from VistA HL7 and HLO queues/files.
No fake metrics. Masking on by default. Unmask requires elevated role + justification, audited.

## Sections

- A) Capability inventory → artifacts/interop/capabilities.json
- B) Data sources — HL7 #772/#773, HLO #779.\*/778, links #870, monitor #776
- C) API endpoints — GET /interop/hl7/summary, messages list, message detail (masked), HLO summary
- D) Wrapper RPCs — extend ZVEMIOP.m with MSGLIST + MSGDETL entry points
- E) UI — interop dashboard + message table + masked viewer + unmask flow
- F) Verifier — 10+ gates

## Files Touched

- `services/vista/ZVEMIOP.m` — add MSGLIST, MSGDETL entry points
- `services/vista/ZVEMINS.m` — register 2 new RPCs
- `apps/api/src/routes/vista-interop.ts` — add message list/detail/unmask endpoints
- `apps/api/src/lib/audit.ts` — add interop.message-unmask action
- `apps/web/src/app/cprs/admin/integrations/page.tsx` — enhance interop UI
- `artifacts/interop/capabilities.json` — capability inventory output
- `scripts/verify-phase58-interop-monitor.ps1` — verifier
