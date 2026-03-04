# Phase 53 — PromptOS v2.1 Governance + Anti-Sprawl Enforcement (IMPLEMENT)

## Mission

Eliminate repo drift permanently by enforcing:

- `/prompts` as the canonical instruction system
- Verification results as artifacts only (`/artifacts`, gitignored)
- Curated, minimal documentation
- Scripts + CI + pre-commit guard enforcement

## MANDATORY GOVERNANCE PREAMBLE

1. Canonical inputs live ONLY in: `/prompts`, `/scripts`, `/docs/runbooks`, `/docs/decisions`
2. Verification outcomes are ARTIFACTS -- write to `/artifacts/**` (gitignored), never committed
3. VistA-first rule: all VistA interactions through rpcRegistry, every RPC in Vivian index or allowlisted
4. No dead clicks: every clickable element works OR shows "integration pending" with target RPCs
5. Prompts folder integrity: each phase has XX-01-IMPLEMENT.md and XX-99-VERIFY.md
6. Minimal edits, inventory first, deterministic changes, commit discipline

## Definition of Done

1. No committed verification outputs remain (no `/reports`, no `/docs/reports`)
2. `/artifacts/**` is gitignored and used by all verifiers/audits
3. `/prompts` passes: no gaps/duplicates, correct ordering, correct headers, IMPLEMENT+VERIFY per phase
4. CI fails if docs/prompt policy is violated
5. A pre-commit hook prevents committing banned paths

## Implementation Steps

### A) POLICY: Single Source of Truth

- Create `docs/POLICY.md` (short, strict, enforceable)
- Create `docs/INDEX.md` (single curated entry point)
- POLICY defines allowed/forbidden doc roots

### B) Artifacts Directory + .gitignore

- Ensure `/artifacts/.gitkeep` exists
- Update `.gitignore` to block `/artifacts/`, `/reports/`, `/docs/reports/`, verify output patterns
- Protect curated runbooks and ADRs from being ignored

### C) Remove Existing Reports Folders

- Move `docs/reports/` contents to `/artifacts/_legacy_verify_outputs/` (untracked)
- Delete committed `docs/reports/` files
- Verify no code/docs links to deleted files

### D) PromptOS Audit + Fix Tooling

- Create `scripts/promptos/auditPrompts.ts` with contiguity, uniqueness, IMPLEMENT+VERIFY checks
- Create `scripts/promptos/fixPrompts.ts` with safe backup + rename logic
- Outputs go to `/artifacts/promptos/`

### E) Doc Policy Gate Tool

- Create `scripts/governance/checkDocsPolicy.ts`
- Fails on files outside allowed roots
- Fails on forbidden folders with content
- Fails on verify outputs in docs/

### F) Pre-Commit Hook

- Create `.hooks/pre-commit` (cross-platform)
- Blocks staged files under `/reports`, `/docs/reports`, `/artifacts`
- Blocks staged verification output patterns
- Document in AGENTS.md

### G) CI Enforcement

- Add `auditPrompts.ts` and `checkDocsPolicy.ts` to CI workflows
- CI must fail on any policy violation

### H) Update AGENTS.md

- Add governance preamble
- State: no reports folders, no committed verify outputs, prompts are canonical

## Files Touched

- `docs/POLICY.md` (new)
- `docs/INDEX.md` (new)
- `.gitignore` (updated)
- `scripts/promptos/auditPrompts.ts` (new)
- `scripts/promptos/fixPrompts.ts` (new)
- `scripts/governance/checkDocsPolicy.ts` (new)
- `.hooks/pre-commit` (new)
- `.github/workflows/ci-verify.yml` (updated)
- `AGENTS.md` (updated)
- `scripts/verify-phase53-governance.ps1` (new)
