# Phase 47 -- CI + Evidence Pack + Hard Quality Gates

## User Request
Implement hard quality gates that prevent drift/regressions:
1. CI workflows: verify on every PR, secret/PHI scan
2. Evidence pack generation (no PHI)
3. Prompts ordering gate
4. Vivian/RPC registry "no unknown RPC" rule
5. Module gating integrity

## Implementation Steps
- A: GitHub Actions CI workflows (ci-verify.yml, ci-security.yml)
- B: Evidence pack generator (scripts/generate-evidence-pack.ts)
- C: Prompts ordering gate (scripts/check-prompts-ordering.ts)
- D: Vivian/RPC gating check (scripts/check-rpc-registry.ts)
- E: Module toggle integrity (scripts/check-module-gates.ts)
- F: Docs (runbook + evidence README)

## Verification
- tsc --noEmit clean
- vitest run all pass
- Each check script runs successfully
- CI YAML validates

## Files Touched
- .github/workflows/ci-verify.yml (new)
- .github/workflows/ci-security.yml (new)
- scripts/generate-evidence-pack.ts (new)
- scripts/check-prompts-ordering.ts (new)
- scripts/check-rpc-registry.ts (new)
- scripts/check-module-gates.ts (new)
- docs/runbooks/ci-and-evidence-pack.md (new)
- docs/evidence/README.md (new)
