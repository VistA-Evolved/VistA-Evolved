# VistA-Evolved Documentation Policy

> **This file is the single authoritative source for documentation rules.**
> Last updated: Phase 53 (PromptOS v2.1 Governance)

---

## 1. Allowed Documentation Roots

| Path                   | Purpose                              | Committed? |
| ---------------------- | ------------------------------------ | ---------- |
| `docs/POLICY.md`       | This file                            | Yes        |
| `docs/INDEX.md`        | Single curated entry point           | Yes        |
| `docs/runbooks/**`     | Step-by-step operational guides      | Yes        |
| `docs/decisions/**`    | Architecture Decision Records (ADRs) | Yes        |
| `docs/architecture/**` | Architecture specifications          | Yes        |
| `docs/security/**`     | Security documentation               | Yes        |
| `docs/compliance/**`   | Regulatory compliance docs           | Yes        |
| `docs/vista/**`        | VistA capability maps and grounding  | Yes        |
| `docs/BUG-TRACKER.md`  | Bug tracker (single file)            | Yes        |
| `docs/README.md`       | Docs readme                          | Yes        |

## 2. Forbidden Roots (NEVER commit content here)

| Path                                | Reason                                              |
| ----------------------------------- | --------------------------------------------------- |
| `reports/**`                        | Verification outputs are artifacts, not docs        |
| `docs/reports/**`                   | Same -- verification outputs belong in `/artifacts` |
| `docs/verify/**`                    | Verification outputs are artifacts                  |
| Any `*-verify-report.md` in `docs/` | Use `/artifacts` instead                            |
| Any `*-verify-output*` anywhere     | Use `/artifacts` instead                            |

## 3. Artifact Output Rules

- **All verification outputs go to `/artifacts/`** (gitignored).
- Scripts that produce verification results MUST write to `/artifacts/<tool>/`.
- Evidence packs go to `/artifacts/evidence/` (uploaded as CI artifacts, never committed).
- Never commit verification output files. CI artifact upload is the delivery mechanism.

## 4. Prompts Directory Rules

- `/prompts` is the canonical instruction system.
- Phase folder prefix is for ordering (supports 1--3 digits): `N-`, `NN-`, `NNN-`.
- Folder naming: `<prefix>-PHASE-<phaseNum>-<TITLE>` (e.g., `179-PHASE-211-PROMPTOPS-GOVERNANCE`).
- File prefix inside the folder uses the **phase number**, not the folder prefix.
- Each phase folder MUST contain:
  - An IMPLEMENT file (e.g., `211-01-IMPLEMENT.md`) with implementation steps and files touched.
  - A VERIFY file (e.g., `211-99-VERIFY.md`) with verification steps and acceptance criteria.
- Playbooks and wave aggregation docs belong in `prompts/00-PLAYBOOKS/`, not as phase folders.
- Prompts are the source of truth for what was built and how to verify it.
- See `prompts/00-ORDERING-RULES.md` for detailed naming conventions.

## 5. Commit Discipline

- One coherent commit per phase.
- Include: code, prompt files, runbook updates, ops artifacts.
- Do NOT include: verification outputs, temporary reports, debug logs.
- Pre-commit hook enforces banned path rules.

## 6. Enforcement

- `scripts/promptos/auditPrompts.ts` -- validates prompt structure
- `scripts/governance/checkDocsPolicy.ts` -- validates doc policy
- `.hooks/pre-commit` -- blocks banned paths before commit
- CI (`ci-verify.yml`) -- runs all gates on every PR
