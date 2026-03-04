# Phase 63 — VERIFY

## Gates

- G63-01: sd-plan.json exists at artifacts/phase63/ with RPC inventory
- G63-02: /scheduling/appointments route exists and uses SDOE RPCs
- G63-03: /scheduling/clinics route exists and uses SD W/L RETRIVE HOSP LOC
- G63-04: VistA adapter wired to real RPCs (not hollow)
- G63-05: Portal appointments page wired to scheduling API
- G63-06: Clinician scheduling page exists
- G63-07: Appointment request flow audited (immutable-audit)
- G63-08: Double-booking prevention (lock mechanism)
- G63-09: No mock/seed data in scheduling API responses
- G63-10: Dead-click audit passes (all buttons functional)
- G63-11: Cancel/reschedule endpoints exist with VistA targets
- G63-12: verify-latest.ps1 delegates to phase 63 and passes
- G63-13: Runbook exists at docs/runbooks/scheduling-vista-sd.md
- G63-14: Ops artifacts exist (summary + notion update)

## Output

- /artifacts/phase63/verify.txt (artifact only, gitignored)
