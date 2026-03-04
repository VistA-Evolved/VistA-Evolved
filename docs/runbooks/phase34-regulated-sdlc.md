# Phase 34 Runbook -- Regulated SDLC + Evidence Pack

> **Phase**: 34  
> **Goal**: CI quality gates, evidence bundles, compliance documentation, redaction hardening

---

## 1. What Changed

Phase 34 establishes a regulated software development lifecycle (SDLC) foundation:

- **CI pipeline** (`quality-gates.yml`) -- automated quality gates on every push/PR
- **Evidence bundle generator** (`generate-evidence-bundle.mjs`) -- deterministic audit artifacts
- **PHI leak scanner** (`phi-leak-scan.mjs`) -- static analysis for PHI exposure patterns
- **Unit tests** -- 25 tests covering redaction engine and structured logger
- **Compliance docs** -- 6 documents mapping controls to HIPAA, NIST SP 800-53, OWASP ASVS
- **Redaction hardening** -- 8 PHI leak patterns fixed across 5 server files

## 2. CI Pipeline

### How It Works

The `quality-gates.yml` workflow runs on every push to `main`/`develop` and all PRs:

**Unit gates** (every push + PR):

1. Install dependencies (`pnpm -r install --frozen-lockfile`)
2. Typecheck all 3 apps (API, Web, Portal)
3. Run unit tests (redaction + logger)
4. Run secret scan (`secret-scan.mjs`)
5. Run PHI leak scan (`phi-leak-scan.mjs`)
6. Build all packages

**Evidence bundle** (main branch push only):

1. Run `generate-evidence-bundle.mjs` with CI run number as build ID
2. Upload the evidence bundle as GitHub Actions artifact (90-day retention)

**Integration gates** (commented out -- requires self-hosted runner with Docker):

- Start VistA sandbox, run full `verify-latest.ps1`, stop sandbox
- Enable when a self-hosted runner is provisioned

### Viewing Results

- GitHub Actions tab shows pass/fail for unit-gates and evidence-bundle jobs
- Evidence bundles are downloadable as artifacts from the Actions run page

## 3. Evidence Bundle

### Generate Locally

```powershell
cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved
node scripts/generate-evidence-bundle.mjs --build-id manual-001
```

Output: `artifacts/evidence/manual-001/`

### Contents

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `gate-results.json`   | Machine-readable pass/fail for all gates     |
| `summary.md`          | Human-readable evidence record               |
| `typecheck.json`      | TypeScript compilation results (3 apps)      |
| `unit-tests.json`     | Unit test results                            |
| `secret-scan.json`    | Secret scan results                          |
| `phi-leak-scan.json`  | PHI leak scan results                        |
| `license-report.json` | Dependency license analysis                  |
| `vuln-scan.json`      | `pnpm audit` results                         |
| `sbom.json`           | SBOM (if @cyclonedx/cyclonedx-npm installed) |

## 4. PHI Leak Scanner

### Run Manually

```powershell
node scripts/phi-leak-scan.mjs
```

### What It Checks

1. `console.log/warn/error/info` in server files (except logger.ts and tests)
2. Stack traces in HTTP responses
3. `err.message` / `error.message` forwarded to clients
4. `JSON.stringify(request.body)` logging
5. Raw cookie/session logging

### Adding Allowlist Entries

Edit `scripts/phi-leak-scan.mjs` -- add paths to the `ALLOWLIST` array.

## 5. Unit Tests

### Run

```powershell
npx tsx --test apps/api/src/ai/redaction.test.ts apps/api/src/lib/logger.test.ts
```

### Test Coverage

| Suite               | Tests | What it covers                                                                                                          |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `redaction.test.ts` | 16    | SSN, phone, email, DOB, MRN, address, names, DFN, DUZ, mixed input, detectPhi, redactContext, getRedactionCategories    |
| `logger.test.ts`    | 9     | Field redaction, inline SSN, Bearer tokens, hex sessions, nested objects, arrays, null/undefined, max depth, PHI fields |

## 6. Compliance Documentation

All in `docs/compliance/`:

| Document                   | Content                                               |
| -------------------------- | ----------------------------------------------------- |
| `data-classification.md`   | 4-tier data classification (C1 PHI -- C4 Operational) |
| `logging-policy.md`        | What to log, what never to log, redaction stack       |
| `access-control-policy.md` | RBAC, sessions, break-glass, rate limiting            |
| `incident-response.md`     | SEV levels, response phases, breach notification      |
| `threat-model.md`          | STRIDE analysis, attack surface, risk register        |
| `compliance-mapping.md`    | HIPAA/NIST/ASVS control mapping + gap analysis        |

## 7. Verification

```powershell
.\scripts\verify-latest.ps1
```

Expected: ~60 gates, 0 FAIL.

## 8. Troubleshooting

| Problem                    | Fix                                                          |
| -------------------------- | ------------------------------------------------------------ |
| PHI leak scan fails        | Check which file has `console.*` -- fix or add to allowlist  |
| Evidence bundle errors     | Ensure `pnpm -r install` has been run first                  |
| CI workflow not triggering | Check branch matches (main/develop)                          |
| Unit test failures         | Run `npx tsx --test <file>` individually for detailed output |
| Secret scan warnings       | Check for hardcoded credentials per Phase 16 rules           |
