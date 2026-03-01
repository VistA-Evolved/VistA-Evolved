# Phase 335 — W15-P9: Verification Checklist

## Gates
- [ ] `sre-support-posture.ts` exports all domain functions
- [ ] `sre-support-posture-routes.ts` registers 26 endpoints under `/platform/sre/`
- [ ] AUTH_RULES: `/platform/sre/` → admin
- [ ] register-routes.ts imports and registers sreSupportPostureRoutes
- [ ] store-policy.ts has 9 SRE store entries
- [ ] tsc --noEmit passes with 0 errors
- [ ] Incident lifecycle: declare → investigate → mitigate → resolve → postmortem
- [ ] Status page derives overall state from worst component
- [ ] Maintenance windows: create → advance state
- [ ] On-call: upsert schedule, get current rotation member
- [ ] Runbooks: CRUD + version tracking + test marking
- [ ] SLA definitions + report generation
- [ ] Support tickets: create → assign → message → status transitions
- [ ] Tenant communications linked to incidents/maintenance
- [ ] SRE posture summary endpoint aggregates all subsystems
- [ ] Audit trail: 10K ring buffer with action/actor/detail
