# Phase 118 — Go-Live Hardening Pack (IMPLEMENT)

## User Request
> Role: SRE + security lead + QA director. Mode: IMPLEMENT.
>
> Deliverables:
> 1) Backups/restore runbooks + automated backup job (PG)
> 2) Audit immutability posture: hash-chained audit file sinks, tamper-evident verification
> 3) Incident runbooks: auth outage, VistA outage, PG outage, PACS outage
> 4) Performance/load gates: baseline load test, p95 latency CI gate
> 5) Security hardening: OWASP headers, CSP, session cookie posture, rate limiting, dep audit gate
>
> Acceptance: A new "release candidate" checklist passes in CI.

## Implementation Steps

### 1. PG Automated Backup Job
- Create `apps/api/src/jobs/pg-backup.ts` — scheduled PG backup via `pg_dump` (Graphile Worker task or setInterval)
- Create `docs/runbooks/pg-backup-restore.md` — consolidated PG backup/restore runbook

### 2. Audit Immutability Hardening
- Enable imaging audit file sink by default (`logs/imaging-audit.jsonl`)
- Add `/hardening/audit-verify` unified verification endpoint
- Ensure all 3 audit chains (IAM, imaging, RCM) have file sinks

### 3. Incident Runbooks
- Create `docs/runbooks/incident-auth-outage.md`
- Create `docs/runbooks/incident-vista-outage.md`
- Create `docs/runbooks/incident-pg-outage.md`
- Create `docs/runbooks/incident-pacs-outage.md`

### 4. Performance/Load Gates
- Create `tests/k6/rc-baseline.js` — release candidate baseline load test
- Create `scripts/rc-perf-gate.ps1` — CI gate that fails on p95 regression

### 5. Security Hardening
- Add CSP, Referrer-Policy, Permissions-Policy headers to security.ts
- Create `scripts/rc-dep-audit.ps1` — dependency vulnerability audit gate
- Create `scripts/rc-checklist.ps1` — unified release candidate checklist

### 6. Release Candidate Checklist Script
- Combines: tsc, dep audit, security headers check, audit chain verify, perf budgets, build

## Files Touched
- `apps/api/src/middleware/security.ts` — add OWASP headers
- `apps/api/src/services/imaging-audit.ts` — default file sink
- `apps/api/src/routes/hardening-routes.ts` — unified audit verify endpoint
- `apps/api/src/index.ts` — register hardening routes + backup scheduler
- `docs/runbooks/pg-backup-restore.md`
- `docs/runbooks/incident-*.md` (4 files)
- `tests/k6/rc-baseline.js`
- `scripts/rc-checklist.ps1`
- `scripts/rc-perf-gate.ps1`
- `scripts/rc-dep-audit.ps1`
- `scripts/verify-phase118-go-live-hardening.ps1`
