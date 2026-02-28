# Phase 242 — Payer Adapter Scale Hardening (Wave 6 P5)

## Context
The RCM payer connector system has 10 connectors registered as singletons with
no connection pooling, the submit route bypasses the resilience wrapper, there's
no batch processing, and health probing is on-demand only.

P5 hardens three areas:
1. Wire resilientConnectorCall into the submit flow
2. Add batch claim processing endpoint  
3. Add background payer health monitoring

## Files Changed/Created

### New
- `apps/api/src/rcm/edi/batch-processor.ts` — Batch claim collector + grouped submission
- `apps/api/src/rcm/connectors/health-monitor.ts` — Background health probe timer + history
- `apps/api/src/routes/rcm-scale.ts` — Scale-hardening endpoints (batch submit, health dashboard)

### Modified
- `apps/api/src/server/register-routes.ts` — Register rcm-scale routes
- `apps/api/src/server/lifecycle.ts` — Start/stop health monitor

## Verification
- scripts/verify-phase242-payer-scale.ps1 (7 gates)
