# Phase 336 — W15-P10: Verification Checklist

## Gates
- [ ] `scale-cert-runner.ts` exports all domain functions
- [ ] `scale-cert-runner-routes.ts` registers 16 endpoints under `/platform/cert/`
- [ ] AUTH_RULES: `/platform/cert/` → admin
- [ ] register-routes.ts imports and registers scaleCertRunnerRoutes
- [ ] store-policy.ts has 4 certification store entries
- [ ] tsc --noEmit passes with 0 errors
- [ ] 20 gate definitions across 8 categories (multi-cluster, global-routing,
      data-plane, queue-cache, cost, dr-gameday, scale-perf, sre-posture, infra)
- [ ] Scoring: pass=1, warn=0.5, fail=0, skip excluded; score 0-100
- [ ] Verdicts: CERTIFIED (0 fails + score >= minScore), CONDITIONAL
      (score >= warnScore), NOT_CERTIFIED (otherwise)
- [ ] Evidence hash: SHA-256 of full run JSON
- [ ] Profiles: custom required gates + score thresholds
- [ ] Schedules: cron expression + enable/disable toggle
- [ ] Trends: last N runs with score/verdict/gate counts
- [ ] Badge: latest verdict + 30-day expiry
- [ ] Gate catalog endpoint lists all gate definitions
- [ ] Audit trail: 10K ring buffer with action/actor/detail
