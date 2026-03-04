# Phase 434 — Order-Check Enhancement (W27 P4)

## Objective

Create structured order-check types for the VistA ORWDXC order-check
system, including category detection, severity mapping, session state,
acknowledgment workflow, and pre-sign check gate types.

## Implementation Steps

1. **Create `routes/cprs/order-check-types.ts`**: 10+ types/helpers
   - `OrderCheckSeverity` — high/moderate/low/info
   - `OrderCheckCategory` — 11 categories (drug-allergy, drug-drug, duplicate-therapy, etc.)
   - `OrderCheckFinding` — structured finding with category, severity, override requirements
   - `OrderCheckSession` — session lifecycle state
   - `PreSignCheckResult` — pre-sign gate with can/cannot sign determination
   - `OrderCheckAcknowledgeRequest` — acknowledge with override reason
   - `detectCategory(message)` — regex-based category detection from message text
   - `mapSeverity(raw)` — map VistA severity codes to structured enum
   - `requiresOverrideForCategory()` — determine if finding blocks signing

2. **Add 5 ORWDXC session RPCs to rpcRegistry.ts exceptions**:
   - ORWDXC DELAY, ORWDXC DELORD, ORWDXC FILLID, ORWDXC ON, ORWDXC SESSION

## Files Created

- `apps/api/src/routes/cprs/order-check-types.ts`

## Files Modified

- `apps/api/src/vista/rpcRegistry.ts` — +5 exceptions
