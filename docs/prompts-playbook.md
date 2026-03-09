# Prompt Build Playbook

## Purpose

VistA Evolved uses a prompt-driven build system where every feature, fix,
and verification is tracked as a numbered phase with IMPLEMENT and VERIFY files.
This playbook ensures discipline and traceability.

## Current State

- **571 prompt folders** in `prompts/`
- **692 phases indexed** in `docs/qa/phase-index.json`
- **Highest prefix**: 721 (Phase 721 -- CPRS Labs View Continuity Recovery)
- **Governance**: `prompts/00-NAVIGATE-PROMPTS.md`

## Folder Naming Convention

```
<prefix>-PHASE-<phaseNum>-<TITLE>
```

- **Prefix**: Sequential ordering position (NOT the phase number)
- **Phase number**: The actual phase identifier used in code comments
- **Title**: UPPER-KEBAB-CASE description

Wave folders use: `<prefix>-W<wave>-P<position>-<TITLE>`

## Required Files

Every phase folder MUST contain:

| File | Purpose |
| ---- | ------- |
| `<phaseNum>-01-IMPLEMENT.md` | Implementation steps |
| `<phaseNum>-99-VERIFY.md` | Verification / acceptance criteria |
| `NOTES.md` (optional) | Context, redundancy markers, decisions |

Additional sub-phases: `*-02-IMPLEMENT.md` through `*-04-IMPLEMENT.md`
Additional verification: `*-90-VERIFY.md` through `*-98-VERIFY.md`

## How to Add a New Phase

1. Determine the next prefix number (currently next is 722+)
2. Create the folder:
   ```
   prompts/722-PHASE-722-YOUR-FEATURE-TITLE/
     722-01-IMPLEMENT.md
     722-99-VERIFY.md
   ```
3. Write implementation steps that follow VistA-first rules
4. Write verification steps that require live Docker proof
5. Regenerate the phase index:
   ```powershell
   node scripts/build-phase-index.mjs
   ```
6. Update `prompts/PROMPTS_INDEX.md`

## Phase Reference in Code

Code comments MUST use:
```typescript
// Phase <token> (PromptFolder: <foldername>)
```

Example:
```typescript
// Phase 722 (PromptFolder: 722-PHASE-722-SAAS-TENANT-PROVISIONING-PIPELINE)
```

For ambiguous phase numbers, the `PromptFolder:` qualifier is mandatory.

## Verification Rules

Every `*-99-VERIFY.md` file must include:
- Specific commands to run (not just "verify it works")
- Expected output for PASS/FAIL determination
- Docker-first verification (live VistA, not mocked)
- Evidence capture (what to save as proof)

## Index Maintenance

- `docs/qa/phase-index.json` -- machine-readable phase catalog
- `prompts/PROMPTS_INDEX.md` -- human-readable index
- Regenerate after any prompt folder change:
  ```powershell
  pnpm qa:phase-index
  ```
- CI gate checks freshness (<30 days since last regeneration)

## Anti-Patterns

- **Never skip VERIFY**: Every IMPLEMENT needs a matching VERIFY
- **Never reuse phase numbers**: Each number is unique forever
- **Never edit old prompts**: Create new phases for changes
- **Never assume prefix == phase number**: They are different things
- **Never create phases for documentation-only changes**: Phases track code changes

## Planned New Phases (722+)

| Prefix | Phase | Title | Plan Phase |
| ------ | ----- | ----- | ---------- |
| 722 | 722 | SaaS Tenant Provisioning Pipeline | Phase 6 |
| 723 | 723 | SaaS Marketing Site + Stripe | Phase 15 |
| 724 | 724 | Healthcare Facility Research | Phase 16 |
| 725 | 725 | Notion MCP Integration | Phase 17 |

Each will be created with full IMPLEMENT/VERIFY files when the corresponding
plan phase is executed.

## Tools

| Command | Purpose |
| ------- | ------- |
| `pnpm qa:phase-index` | Rebuild phase index |
| `node scripts/generate-phase-qa.mjs` | Generate test specs from index |
| `node scripts/phase-qa-runner.mjs phase <N>` | Run single phase QA |
| `node scripts/phase-qa-runner.mjs all` | Run all phase QA |
| `node scripts/qa-gates/phase-index-gate.mjs` | CI gate for index freshness |
