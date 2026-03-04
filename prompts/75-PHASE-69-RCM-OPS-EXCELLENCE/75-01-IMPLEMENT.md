# Phase 69 IMPLEMENT -- RCM Ops Excellence v1

## Mission

Enterprise-grade RCM ops: IB discovery, payer adapter framework, jobs posture, denial queue scaffolding.

## Deliverables

A) IB capability report from Vivian + live catalog -> artifacts/phase69/ib-plan.json
B) PayerAdapter interface (pluggable): eligibility, claim-status, denial workflows
C) Rate-limited polling job scheduler on top of existing InMemoryJobQueue
D) UI: eligibility status, claim status, denial queue posture
E) OS v3 verification

## Files Touched

- artifacts/phase69/ib-plan.json (plan artifact)
- apps/api/src/rcm/adapters/payer-adapter.ts (PayerAdapter interface + registry)
- apps/api/src/rcm/adapters/x12-adapter.ts (X12/clearinghouse skeleton)
- apps/api/src/rcm/adapters/philhealth-adapter.ts (PhilHealth skeleton)
- apps/api/src/rcm/adapters/sandbox-adapter.ts (dev/test adapter)
- apps/api/src/rcm/jobs/polling-scheduler.ts (rate-limited polling)
- apps/api/src/rcm/jobs/eligibility-poller.ts (eligibility poll job)
- apps/api/src/rcm/jobs/claim-status-poller.ts (claim status poll job)
- apps/api/src/rcm/rcm-routes.ts (new endpoints)
- apps/web/src/app/cprs/admin/rcm/page.tsx (new tabs)
- config/capabilities.json (new capabilities)
- apps/web/src/actions/actionRegistry.ts (new actions)
- scripts/verify-phase69-rcm-ops.ps1 (verify script)
- scripts/verify-latest.ps1 (delegate)
