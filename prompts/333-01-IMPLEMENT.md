# Phase 333 — IMPLEMENT: Multi-Region DR & GameDays (W15-P7)

## User Request
Implement DR drill lifecycle, GameDay scenarios, evidence packs for compliance,
automated failover testing with grading, and scheduled drill automation.

## Implementation Steps
1. Create `apps/api/src/services/dr-gameday.ts`
   - GameDay scenario templates (failover/switchback step sequences)
   - DR drill lifecycle: schedule → start → advance steps → complete (with grade)
   - Grading algorithm: A-F based on step pass rate, RTO/RPO met, findings
   - Drill findings with severity levels
   - Evidence pack generation for SOC2/HIPAA compliance
   - Drill schedules with cron expressions
2. Create `apps/api/src/routes/dr-gameday-routes.ts`
   - 20 REST endpoints (scenarios, drills, steps, findings, evidence, schedules)
3. Wire AUTH_RULES, register-routes, store-policy

## Files Touched
- apps/api/src/services/dr-gameday.ts (NEW)
- apps/api/src/routes/dr-gameday-routes.ts (NEW)
- apps/api/src/middleware/security.ts (1 AUTH_RULE)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (5 store entries)
