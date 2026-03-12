# Proof-Driven Governance — VistA-Evolved

> **This document is the canonical source for repo governance and proof discipline.**
> It encodes the non-negotiable rules and the governed build order. Every agent and developer MUST follow it.
> Last installed: Stage 1 (Install repo governance and proof rules).

---

## 1. Non-Negotiable Rules

1. **Never claim something is working unless you show proof.**
2. **Proof means:**
   - Exact files created or changed
   - Exact commands run
   - Exact outputs observed
   - Exact pass/fail result
3. **Do not build broad new features** until governance, upstream source pinning, runtime truth, and verification discipline are installed first.
4. **Do not silently fall back** from real VistA behavior to stubs, mocks, placeholders, or fake data in any path labeled as real.
5. **Do not widen scope.** Complete one stage fully before moving to the next.
6. **Preserve the current repo as salvage/reference history.** Do not delete large areas of work just because they are messy. Archive, index, and mark status instead.
7. **Every stage must end with:**
   - What was done
   - What was not done
   - What is verified
   - What remains unverified
   - What exact next step should happen
8. **Stop after each stage and wait.** Do not continue unless explicitly instructed.
9. **If runtime dependencies are missing or broken,** say so clearly and do not pretend verification happened.
10. **Prefer Windows-first local developer execution** where practical (VS Code on Windows, work driven through an AI coder).

---

## 2. Canonical Build Order

New work MUST follow this order. Do not skip stages. Do not start a later stage until the previous one is verified and signed off.

| Stage | Name |
|-------|------|
| 1 | Install repo governance and proof rules |
| 2 | Pin upstream VistA sources locally |
| 3 | Build custom Docker from local sources only |
| 4 | Establish runtime truth and health verification |
| 5 | Prove authentic web roll-and-scroll terminal |
| 6 | Build system administration/control slices |
| 7 | Build operational administration slices |
| 8 | Build executive read-only analytics |
| 9 | Build clinician-facing GUI slices one at a time |

---

## 3. Required Response Format for Every Task

Every task (and every stage completion) MUST use this format. Do not skip evidence.

| Section | Content |
|---------|---------|
| **Objective** | What this task/stage was meant to achieve |
| **Files inspected** | Exact paths read or searched |
| **Files changed** | Exact paths created or modified |
| **Commands run** | Exact commands executed (copy-pasteable) |
| **Results** | Exact outputs observed (or “not run” if dependencies missing) |
| **Verified truth** | What was proven with evidence |
| **Unverified areas** | What was not tested or could not be verified |
| **Risks** | Known gaps or assumptions |
| **Next step** | The single, concrete next action (or “Stop; wait for instruction to proceed to Stage N”) |

---

## 4. Stage Completion Checklist

At the end of every stage, the deliverable MUST include:

- **What was done** — Bullet list of completed items with file/command evidence.
- **What was not done** — Explicitly list anything deferred or out of scope.
- **What is verified** — With proof (command + output or artifact path).
- **What remains unverified** — Dependencies not run, paths not tested, etc.
- **What exact next step should happen** — One sentence; usually “Proceed to Stage N” or “Fix X then re-run Y.”

---

## 5. Proof Definition (Reminder)

- **Proof** = exact files + exact commands + exact outputs + pass/fail.
- **No proof** = “should work,” “looks correct,” “verification deferred,” or marking done without a live test.
- Verification outputs go to `/artifacts/` (gitignored). Never commit them to `/reports/` or `/docs/reports/` (see `docs/POLICY.md`).

---

## 6. Relation to Other Governance

- **AGENTS.md** — Agent onboarding; includes Docker-first verification (Rule Zero). Must align with this document.
- **docs/POLICY.md** — Documentation roots, forbidden paths, artifact rules. Governance docs live under `docs/governance/`.
- **CONTRIBUTING.md** — PR workflow, QA gates, session log. Must not contradict proof discipline.
- **Pre-commit hook** (`.hooks/pre-commit`) — Blocks committing banned paths. On Windows, use Git Bash or WSL to run the hook; or run `npx tsx scripts/governance/checkDocsPolicy.ts` before commit.

---

## 7. Enforcement

- **AI agents:** Follow this document and the required response format. Stop after each stage unless the user instructs continuation.
- **Humans:** Run `npx tsx scripts/governance/checkDocsPolicy.ts` to validate doc policy. Set `git config core.hooksPath .hooks` to enable the pre-commit gate.
- **CI:** Existing gates (e.g. `ci-verify.yml`, gauntlet) remain; this document does not replace them but adds the proof and stage-discipline requirements.
