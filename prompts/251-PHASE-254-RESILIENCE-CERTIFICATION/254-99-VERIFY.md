# Phase 254 — Resilience Certification VERIFY

## Verification Gates (27 gates)

### Drill Infrastructure (7 gates)
1. `ops/drills/resilience-drills.ts` exists
2. `ops/drills/run-vista-down-drill.ps1` exists
3. `ops/drills/run-circuit-breaker-drill.ps1` exists
4. `ops/drills/run-health-readiness-drill.ps1` exists
5. `ops/drills/run-posture-audit-drill.ps1` exists
6. Drill config defines 5+ drill scenarios
7. Vitest suite exists at `apps/api/tests/resilience-certification.test.ts`

### Circuit Breaker Pattern (4 gates)
8. `apps/api/src/lib/rpc-resilience.ts` exists
9. Exports `safeCallRpc`
10. Implements open/closed/half-open state machine
11. Exports stats for observability

### Graceful Shutdown (5 gates)
12. `apps/api/src/middleware/security.ts` exists
13. Handles SIGTERM
14. Handles SIGINT
15. Configurable drain timeout
16. Disconnects RPC broker on shutdown

### Health vs Readiness (2 gates)
17. `/health` endpoint exists
18. `/ready` endpoint exists

### Posture Endpoints (2 gates)
19. `apps/api/src/posture/` directory exists
20. 5+ posture domain files present

### Backup & Recovery (2 gates)
21. `scripts/backup-restore.mjs` exists
22. `.github/workflows/dr-nightly.yml` exists

### CI & Test (3 gates)
23. `.github/workflows/resilience-certification.yml` exists
24. Vitest suite has 8+ describe blocks
25. Vitest suite passes

### Prompt Files (2 gates)
26. `254-01-IMPLEMENT.md` exists
27. `254-99-VERIFY.md` exists

## Run
```powershell
powershell -File scripts/verify-phase254-resilience.ps1
```

## Expected: 27 PASS, 0 FAIL
