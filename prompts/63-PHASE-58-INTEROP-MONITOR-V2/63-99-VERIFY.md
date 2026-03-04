# Phase 58 -- VERIFY: VistA-First HL7/HLO Interop Monitor v2

## Verification Gates

### G58-01: Capability inventory exists

- `artifacts/interop/capabilities.json` exists and contains `existingRpcs` + `newPhase58Rpcs` + `vistaFiles` + `maskingStrategy`

### G58-02: M routine extended

- `services/vista/ZVEMIOP.m` contains `MSGLIST` and `MSGDETL` entry points
- Header references v1.1/Build 2

### G58-03: RPCs registered

- `services/vista/ZVEMINS.m` registers 6 RPCs (not 4)
- `apps/api/src/vista/rpcRegistry.ts` contains `VE INTEROP MSG LIST` and `VE INTEROP MSG DETAIL`

### G58-04: API endpoints exist

- `apps/api/src/routes/vista-interop.ts` contains 5 new v2 routes
- Routes: `/v2/hl7/messages`, `/v2/hl7/messages/:id`, `/v2/hl7/messages/:id/unmask`, `/v2/hl7/summary`, `/v2/hlo/summary`

### G58-05: PHI masking

- `PHI_SEGMENT_TYPES` set includes PID, NK1, GT1, IN1, IN2, ACC
- Default response includes `masked: true`
- Unmask endpoint requires admin role

### G58-06: Audit trail

- `apps/api/src/lib/audit.ts` contains `interop.message-unmask` action
- Unmask endpoint calls `audit()` before returning data

### G58-07: No PHI in M routine output

- ZVEMIOP.m MSGDETL does NOT return raw segment content (only type names + counts)
- MSGLIST returns metadata only (IEN, direction, status, link, date, text IEN)

### G58-08: UI message browser

- `apps/web/src/app/cprs/admin/integrations/page.tsx` contains `msgbrowser` tab
- UI has filter controls, message list table, detail panel, unmask section

### G58-09: No mock/fake data

- vista-interop.ts does NOT contain mock, fake, dummy, hardcoded

### G58-10: RPC debug data updated

- `apps/api/src/vista/rpcDebugData.ts` contains `interop.msg-list` and `interop.msg-detail`

## Script

```
scripts/verify-phase58-interop-monitor.ps1
```

## Commit

```
Phase58: VistA-first HL7/HLO interop monitor v2 (real queues + safe viewer)
```
