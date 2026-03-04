# Phase 34 -- Regulated SDLC + Evidence Pack (IMPLEMENT)

## User Request

Build the "Regulated SDLC + Evidence Pack" foundation for VistA-Evolved:

1. CI pipeline (GitHub Actions) running same quality gates as local verification
2. Evidence bundle generator producing deterministic, auditable output
3. Security/compliance documentation (HIPAA, NIST SP 800-53, OWASP ASVS mapping)
4. Redaction hardening -- no PHI leaks in server code
5. Phase 34 verifier script
6. Prompt folder, runbook, and ops documentation

NO breaking changes to app functionality.

## Implementation Steps

### Task 0 -- Inventory & Baseline

- Inspected existing CI workflows (ci.yml, verify.yml, codeql.yml)
- Read package.json for all 3 apps (api, web, portal)
- Read existing security tools (secret-scan.mjs, license-guard.ps1)
- Read redaction engine (redaction.ts, logger.ts, server-config.ts)
- Found zero existing unit tests in the codebase

### Task 1 -- Quality Gates (Local)

- Created `scripts/generate-evidence-bundle.mjs` -- runs 8 gates, produces artifacts/evidence/<build-id>/
- Created `scripts/phi-leak-scan.mjs` -- static analysis for PHI leak patterns
- Created `apps/api/src/ai/redaction.test.ts` -- 16 unit tests for PHI redaction
- Created `apps/api/src/lib/logger.test.ts` -- 9 unit tests for logger redaction
- All 25 tests pass; PHI leak scan clean

### Task 2 -- GitHub Actions CI Workflow

- Created `.github/workflows/quality-gates.yml`
- Unit gates job: typecheck (3 apps), unit tests, secret scan, PHI leak scan, build
- Evidence bundle job: runs on main push, uploads artifacts with 90-day retention
- Integration gates: documented as commented-out (requires self-hosted runner)

### Task 3 -- Security & Compliance Documentation

- Created `docs/compliance/data-classification.md` -- 4-tier classification (C1-C4)
- Created `docs/compliance/logging-policy.md` -- what to log, what never to log
- Created `docs/compliance/access-control-policy.md` -- RBAC, sessions, break-glass
- Created `docs/compliance/incident-response.md` -- SEV levels, phases, breach notification
- Created `docs/compliance/threat-model.md` -- STRIDE analysis, trust boundaries, risk register
- Created `docs/compliance/compliance-mapping.md` -- HIPAA/NIST/ASVS mapping + gap analysis

### Task 4 -- Redaction Hardening

- Ran PHI leak scanner: found 8 violations in 5 files
- Fixed all 8: console.log -> structured logger, err.message -> generic strings
- Files fixed: audit.ts, portal-iam-routes.ts (x2), capabilities.ts, imaging.ts, inbox.ts (x2)
- Re-verified: 0 violations, TSC compiles clean

### Task 5 -- Phase 34 Verifier

- Created `scripts/verify-phase1-to-phase34.ps1` -- ~60 gates
- Updated `scripts/verify-latest.ps1` to delegate to Phase 34
- Gates cover: regression, prompts, TSC, CI workflow, evidence bundle, PHI scanner,
  unit tests, compliance docs content, redaction hardening, runbook, gitignore, secret scan

### Task 6 -- Documentation

- Created this prompt file (`36-01-regulated-sdlc-IMPLEMENT.md`)
- Created verify prompt (`36-99-regulated-sdlc-VERIFY.md`)
- Created runbook (`docs/runbooks/phase34-regulated-sdlc.md`)

## Verification Steps

```powershell
.\scripts\verify-latest.ps1
```

## Files Touched

### Created

- `.github/workflows/quality-gates.yml`
- `scripts/generate-evidence-bundle.mjs`
- `scripts/phi-leak-scan.mjs`
- `scripts/verify-phase1-to-phase34.ps1`
- `apps/api/src/ai/redaction.test.ts`
- `apps/api/src/lib/logger.test.ts`
- `docs/compliance/data-classification.md`
- `docs/compliance/logging-policy.md`
- `docs/compliance/access-control-policy.md`
- `docs/compliance/incident-response.md`
- `docs/compliance/threat-model.md`
- `docs/compliance/compliance-mapping.md`
- `docs/runbooks/phase34-regulated-sdlc.md`
- `prompts/36-PHASE-34-REGULATED-SDLC/36-01-regulated-sdlc-IMPLEMENT.md`
- `prompts/36-PHASE-34-REGULATED-SDLC/36-99-regulated-sdlc-VERIFY.md`

### Modified

- `scripts/verify-latest.ps1` -- points to Phase 34
- `.gitignore` -- added `artifacts/`
- `apps/api/src/lib/audit.ts` -- console.log -> process.stdout.write
- `apps/api/src/portal-iam/portal-iam-routes.ts` -- err.message -> generic (x2)
- `apps/api/src/routes/capabilities.ts` -- removed console.error + err.message
- `apps/api/src/routes/imaging.ts` -- removed console.log
- `apps/api/src/routes/inbox.ts` -- err.message -> generic (x2)
