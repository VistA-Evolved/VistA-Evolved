# CI & Evidence Pack Runbook

> Phase 47 -- CI pipelines, evidence pack generation, and hard quality gates.

---

## Overview

Phase 47 introduces three layers of automated quality enforcement:

1. **CI Verify** (`ci-verify.yml`) -- typecheck, unit tests, quality gates
2. **CI Security** (`ci-security.yml`) -- secret scan, dependency audit
3. **Evidence Pack** (`generate-evidence-pack.ts`) -- full gate run + artifact

---

## CI Workflows

### ci-verify.yml

**Triggers**: Push to `main`, PRs to `main`

| Job | Steps |
|-----|-------|
| `quality-gates` | Install pnpm, typecheck (API), unit tests, prompts ordering gate, RPC registry gate, module gates check |
| `evidence-pack` | Runs only on push to main. Generates full evidence pack, uploads as artifact (90-day retention). |

### ci-security.yml

**Triggers**: Push to `main`, PRs to `main`, weekly schedule

| Job | Steps |
|-----|-------|
| `security-scan` | Secret scan (`secret-scan.mjs`), dependency audit (`pnpm audit`) |

### Existing Workflows

- `quality-gates.yml` -- Phase 34 legacy gates (redundant with ci-verify, kept for compat)
- `ci.yml` -- Simple build check
- `codeql.yml` -- GitHub CodeQL analysis (weekly + push)
- `verify.yml` -- Older typecheck + scan

---

## Quality Gate Scripts

### check-prompts-ordering.ts

Validates the `prompts/` directory structure:
- No duplicate numeric prefixes
- No gaps (warn only)
- All phase folders have .md content
- Folder naming follows `NN-PHASE-X-DESCRIPTION` pattern

```bash
npx tsx scripts/check-prompts-ordering.ts
```

### check-rpc-registry.ts

Ensures RPC integrity:
- All `callRpc`/`safeCallRpc` calls reference known RPCs
- All registry entries are in Vivian index or exception list
- Exception entries have valid reasons
- Orphaned entries (warn only)

```bash
npx tsx scripts/check-rpc-registry.ts
```

### check-module-gates.ts

Validates module toggle system:
- Route patterns compile to valid RegExp
- SKU profiles reference existing modules
- Module dependencies are valid
- No circular dependencies
- FULL_SUITE covers all modules

```bash
npx tsx scripts/check-module-gates.ts
```

---

## Evidence Pack

### Generation

```bash
# Local
npx tsx scripts/generate-evidence-pack.ts

# Custom build ID
BUILD_ID=v2.0-rc1 npx tsx scripts/generate-evidence-pack.ts
```

### Output

Written to `docs/evidence/<build-id>/`:

```
build-info.json         Git SHA, branch, date, Node version
gate-results.json       Per-gate pass/fail with durations
typecheck.json          tsc --noEmit output
unit-tests.json         vitest summary
secret-scan.json        Secret scan results
prompts-ordering.json   Prompts ordering gate
rpc-registry.json       RPC registry cross-check
module-gates.json       Module toggle integrity
summary.md              Human-readable summary
```

### CI Artifact

On push to `main`, the evidence pack is uploaded as a GitHub Actions
artifact with 90-day retention. Download from the Actions tab.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `check-rpc-registry` fails with unknown RPC | New RPC added without registry entry | Add to `rpcRegistry.ts` RPC_REGISTRY or RPC_EXCEPTIONS |
| `check-module-gates` fails with invalid pattern | Bad regex in `config/modules.json` | Fix the regex pattern |
| `check-prompts-ordering` fails with duplicates | Two folders share a numeric prefix | Renumber one folder |
| Evidence pack shows FAIL for typecheck | TypeScript errors introduced | Fix the errors, re-run |
| Secret scan false positive | Legitimate string matches secret pattern | Add to allowlist in `secret-scan.mjs` |

---

## Adding a New Gate

1. Create `scripts/check-<gate-name>.ts`
2. Support `EVIDENCE_OUTPUT` env var for JSON output
3. Exit 0 on pass, 1 on fail
4. Add to `generate-evidence-pack.ts` gate list
5. Add to `ci-verify.yml` quality-gates job
6. Update this runbook
