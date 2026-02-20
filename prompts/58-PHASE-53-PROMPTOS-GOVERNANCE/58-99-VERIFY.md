# Phase 53 — PromptOS v2.1 Governance + Anti-Sprawl Enforcement (VERIFY)

## Verification Gates

### Gate 1: No committed verification outputs
- `/reports` folder does NOT exist
- `/docs/reports` folder has NO committed verify outputs (only legacy artifacts moved out)
- No `*phase*-verify*.md` files committed outside `/artifacts`

### Gate 2: Artifacts directory
- `/artifacts/` exists and is gitignored
- `/artifacts/.gitkeep` or subdirectory structure present
- `.gitignore` contains `/artifacts/`, `/reports/`, `/docs/reports/`

### Gate 3: Prompts integrity
- `scripts/promptos/auditPrompts.ts` runs clean
- No gaps/duplicates in prompts folder prefixes
- Each phase folder contains IMPLEMENT + VERIFY files
- Headers match filenames

### Gate 4: Policy docs exist
- `docs/POLICY.md` exists with allowed/forbidden roots
- `docs/INDEX.md` exists as single entry point

### Gate 5: Doc policy gate
- `scripts/governance/checkDocsPolicy.ts` runs clean
- No files in forbidden roots

### Gate 6: Pre-commit hook
- `.hooks/pre-commit` exists and is executable concept
- Blocks banned paths when tested

### Gate 7: CI enforcement
- `ci-verify.yml` includes auditPrompts + checkDocsPolicy steps

### Gate 8: AGENTS.md updated
- Contains governance preamble
- Contains anti-sprawl rules

## Run
```powershell
.\scripts\verify-phase53-governance.ps1
```
