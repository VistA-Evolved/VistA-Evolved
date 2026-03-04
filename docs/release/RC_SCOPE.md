# RC-1 Scope Freeze — Must-Pass Gates

> Every gate listed here MUST pass before an RC build is tagged.
> `scripts/verify-rc.ps1` implements all of these.

## Gate Inventory

### G01 — Prompts Tree Health + Wave-Phase Lint

```powershell
node scripts/qa-gates/prompts-tree-health.mjs
```

**Pass criteria:** Exit 0. All phase folders have IMPLEMENT + VERIFY.

### G02 — Phase Index Freshness

```powershell
node scripts/qa-gates/phase-index-gate.mjs
```

**Pass criteria:** Exit 0. Phase count matches, freshness < 30 days.

### G03 — Integration-Pending Budget

```powershell
node scripts/qa-gates/integration-pending-budget.mjs
```

**Pass criteria:** Exit 0. No new integration-pending endpoints beyond the
budgeted count. Budget tracked in `docs/qa/integration-pending-budget.json`.

### G04 — Tier-0 Hospital Certification

```powershell
node scripts/qa-gates/certification-runner.mjs
```

**Pass criteria:** Exit 0. All tier-0 scenario gates pass.

### G05 — Regulatory / Country Conformance

```powershell
node scripts/qa-gates/country-conformance-runner.mjs
```

**Pass criteria:** Exit 0. All active country packs pass conformance.

### G06 — RPC Trace Compare

```powershell
node scripts/qa-gates/rpc-trace-compare.mjs
```

**Pass criteria:** Exit 0. No RPC regression vs. baseline.

### G07 — TypeScript Compile (API + Web + Portal)

```powershell
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
```

**Pass criteria:** Exit 0 for both.

### G08 — Security Pre-Cert Pack

```powershell
pwsh scripts/security/run-precert.ps1
```

**Pass criteria:** Exit 0. No critical/high vulns unless exception-filed.

### G09 — Performance Smoke

```powershell
pwsh scripts/perf/run-soak.ps1 -Mode smoke
```

**Pass criteria:** Exit 0 or NEEDS-RUN-IN-ENV with exact commands.

### G10 — Defect Budget

```powershell
pwsh scripts/qa/bug-bash-run.ps1 -Check
```

**Pass criteria:** Zero P0 defects in latest defect registry.

### G11 — Production Posture (offline)

```powershell
node scripts/qa-gates/prod-posture.mjs
```

**Pass criteria:** Exit 0. All file-existence checks pass.

### G12 — Data Plane Posture (offline)

```powershell
node qa/gauntlet/gates/g12-data-plane.mjs 2>$null; echo $LASTEXITCODE
```

**Pass criteria:** Exit 0 in fixture mode (PG not required for RC gate).

## Non-Blocking (Info Only)

- Playwright e2e suite (NEEDS-RUN-IN-ENV)
- k6 soak full run (NEEDS-RUN-IN-ENV)
- VistA outage simulation (NEEDS-RUN-IN-ENV)

## Scope Exclusions for RC-1

- OIDC IdP live integration (env-dependent; OIDC config validation is sufficient)
- PhilHealth/clearinghouse live submission (sandbox connector is tested)
- OCR/AI intake LLM provider (rules engine is default; LLM is opt-in)
