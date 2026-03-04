# 18-99 — Phase 16: Production Readiness (VERIFY)

> Phase: 16 — Production Readiness (Deploy + Observability + DR + Perf)
> Prompt-ref: prompts/18-PHASE-16-PRODUCTION-READINESS/18-99-Phase16-VERIFY.md

## Verification Checklist

### P1 — Prompts Directory Ordering (regression)

- [ ] No duplicate folder numbers
- [ ] Phase 16 folder exists: `18-PHASE-16-PRODUCTION-READINESS`
- [ ] File prefixes match folder numbers
- [ ] No stale folder references

### P2 — Phase 15B Regression (all prior checks)

- [ ] Security infrastructure files exist
- [ ] Auth route hardening intact
- [ ] CORS + auth gateway correct
- [ ] Error response sanitization active
- [ ] Write-backs + console use structured logger
- [ ] TypeScript compilation clean (API + Web)
- [ ] Security scans pass (no hardcoded creds)

### P3 — Deployment Packaging

- [ ] `apps/api/Dockerfile` exists
- [ ] `apps/web/Dockerfile` exists
- [ ] `docker-compose.prod.yml` exists
- [ ] `nginx/nginx.conf` exists
- [ ] Dockerfiles have HEALTHCHECK
- [ ] Dockerfiles run as non-root user

### P4 — Config & Secrets

- [ ] `apps/api/src/config/env.ts` exists
- [ ] Zod schema validates env vars
- [ ] `.env.example` has all supported env vars
- [ ] `scripts/secret-scan.mjs` exists and passes

### P5 — Health/Ready/Version

- [ ] `/health` returns ok
- [ ] `/ready` returns ok with vista status
- [ ] `/version` returns commit SHA and build time
- [ ] `/metrics` returns process memory + RPC health

### P6 — Observability

- [ ] Request IDs in response headers
- [ ] Metrics endpoint responds
- [ ] Audit events queryable

### P7 — Reliability

- [ ] DegradedBanner.tsx exists
- [ ] Wired into CPRS layout
- [ ] Circuit breaker exists (regression)
- [ ] Graceful shutdown exists (regression)

### P8 — Performance

- [ ] `scripts/load-test.mjs` exists
- [ ] Smoke perf check completes

### P9 — Documentation

- [ ] `docs/runbooks/prod-deploy-phase16.md` exists
- [ ] `docs/runbooks/observability-phase16.md` exists
- [ ] `docs/runbooks/backup-restore-phase16.md` exists
- [ ] `docs/runbooks/incident-response-phase16.md` exists
- [ ] `docs/runbooks/README.md` has Phase 16 links

### P10 — Verifier

- [ ] `scripts/verify-phase16-production-readiness.ps1` exists
- [ ] `scripts/verify-latest.ps1` points to Phase 16 verifier
- [ ] All checks PASS (0 FAIL, 0 WARN)

## Run Verification

```powershell
.\scripts\verify-latest.ps1
```

Expected: All PASS, 0 FAIL, 0 WARN.
