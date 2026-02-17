# 18-01 — Phase 16: Production Readiness (IMPLEMENT)

> Phase: 16 — Production Readiness (Deploy + Observability + DR + Perf)
> Prompt-ref: prompts/18-PHASE-16-PRODUCTION-READINESS/18-01-Phase16-IMPLEMENT.md

## Context

Phase 15B enterprise hardening passed (77 PASS, 0 FAIL, 0 WARN).
This phase makes the system deployable, observable, and reliable for production use.

## Non-negotiable Requirements

1. No regressions: Phase 10→15B verifiers all still PASS
2. VistA-first alignment: no parallel auth/roles
3. Production deployability: reproducible build, containerization, secure config
4. Observability: request IDs, structured logs, metrics, audit events
5. Reliability: timeouts, circuit breakers, degraded mode
6. Performance: caching, load test harness
7. Disaster recovery: backup/restore runbooks and scripts

## Implementation Summary

### A) Deployment packaging
- `apps/api/Dockerfile` — multi-stage Node 22 Alpine build
- `apps/web/Dockerfile` — multi-stage Next.js standalone build
- `docker-compose.prod.yml` — nginx + api + web
- `nginx/nginx.conf` — reverse proxy with TLS placeholder

### B) Config & secrets
- `apps/api/src/config/env.ts` — Zod-validated env config
- `scripts/secret-scan.mjs` — CI secret pattern scanner
- Updated `apps/api/.env.example` with all supported env vars

### C) Health/readiness/version
- `/health` — process alive (existing, updated version tag)
- `/ready` — VistA connectivity probe (existing)
- `/version` — NEW: commit SHA, build time, node version
- `/metrics` — enhanced with process memory stats

### D) Observability
- Request correlation IDs (existing from Phase 15)
- Enhanced metrics endpoint with process memory
- Audit events (existing 63+ actions from Phase 15C)
- Degraded mode banner (new)

### E) Reliability & resilience
- RPC wrapper with timeout + circuit breaker + retry (existing from Phase 15B)
- `DegradedBanner.tsx` — polls /ready, shows warning, blocks writes when degraded
- Wired into CPRS layout

### F) Performance hardening
- RPC caching already exists (Phase 15B)
- Pagination already enforced on list endpoints
- `scripts/load-test.mjs` — smoke performance test harness

### G) Documentation
- `docs/runbooks/prod-deploy-phase16.md`
- `docs/runbooks/observability-phase16.md`
- `docs/runbooks/backup-restore-phase16.md`
- `docs/runbooks/incident-response-phase16.md`
- Updated `docs/runbooks/README.md`

### H) Prompts & verifier
- `prompts/18-PHASE-16-PRODUCTION-READINESS/18-01-Phase16-IMPLEMENT.md`
- `prompts/18-PHASE-16-PRODUCTION-READINESS/18-99-Phase16-VERIFY.md`
- `scripts/verify-phase16-production-readiness.ps1`
- `scripts/verify-latest.ps1` → Phase 16 verifier

## Files Touched

### New files
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.prod.yml`
- `nginx/nginx.conf`
- `apps/api/src/config/env.ts`
- `scripts/secret-scan.mjs`
- `scripts/load-test.mjs`
- `scripts/verify-phase16-production-readiness.ps1`
- `apps/web/src/components/cprs/DegradedBanner.tsx`
- `docs/runbooks/prod-deploy-phase16.md`
- `docs/runbooks/observability-phase16.md`
- `docs/runbooks/backup-restore-phase16.md`
- `docs/runbooks/incident-response-phase16.md`
- `prompts/18-PHASE-16-PRODUCTION-READINESS/18-01-Phase16-IMPLEMENT.md`
- `prompts/18-PHASE-16-PRODUCTION-READINESS/18-99-Phase16-VERIFY.md`

### Modified files
- `apps/api/src/index.ts` — /version endpoint, enhanced /metrics, updated version tag
- `apps/api/.env.example` — all supported env vars documented
- `apps/web/src/app/cprs/layout.tsx` — added DegradedBanner
- `docs/runbooks/README.md` — Phase 16 links
- `scripts/verify-latest.ps1` — points to Phase 16 verifier
