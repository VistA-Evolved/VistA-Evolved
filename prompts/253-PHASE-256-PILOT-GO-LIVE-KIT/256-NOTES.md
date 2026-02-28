# Phase 256 — Notes

## Design Decisions

1. **Aggregation, not duplication.** The go-live kit references existing
   infrastructure (pilot site-config, preflight engine, verifiers, drills)
   rather than reimplementing any of it.

2. **GO/NO-GO gate.** The `run-go-live-gate.ps1` produces a binary verdict
   based on structural completeness. Runtime verification requires running
   each sub-verifier separately.

3. **Day-1 checklist is time-phased.** T-7, T-1, T-0, T+1 checkpoints
   give clear action items at each stage.

4. **Rollback plan has 3 tiers.** Immediate (< 5 min), Data (< 30 min),
   Full (< 1 hr) with escalating intervention levels.

5. **Sign-off table is multi-role.** Engineering, DevOps, Security,
   Clinical, and Site Contact must all sign.

## Dependencies
- Phase 246: Pilot hardening (site-config + preflight)
- Phases 248-255: All Wave 7 verifiers and drill scripts
- All existing runbooks referenced in the kit

## What This Phase Does NOT Do
- Does not modify existing pilot infrastructure
- Does not add new API endpoints
- Does not modify the preflight engine
- Does not run sub-verifiers (structural check only)
