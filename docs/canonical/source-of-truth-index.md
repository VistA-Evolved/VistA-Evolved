# Source-of-Truth Index

> **Single index for which document governs what.**
> Use this when you need the canonical reference for repo rules, runtime truth, upstream sources, prompt sequencing, or verification.

---

## Governing documents (canonical pointers)

| Concern | Governing document | Purpose |
|--------|--------------------|---------|
| **Repo rules and proof discipline** | `docs/governance/PROOF-AND-GOVERNANCE.md` | Non-negotiable rules, 9-stage build order, required task/stage format, proof definition. |
| **Runtime truth** | `docs/canonical/runtime-truth.md` | What "runtime truth" means; where runtime truth is recorded (runbooks, health checks, live verification). |
| **Upstream source selection** | `docs/canonical/upstream-source-strategy.md` | How upstream VistA (and other) sources are chosen, pinned, and referenced; links to ADRs. |
| **Prompt sequencing** | `prompts/00-ORDERING-RULES.md` and `docs/canonical/prompt-system-canonicalization-plan.md` | How prompts are ordered; folder/file naming; IMPLEMENT/VERIFY/NOTES/EVIDENCE; recovery plan and legacy handling. |
| **Verification standards** | `docs/canonical/verification-standard.md` | What counts as proof; evidence requirements by verification type (terminal, RPC/API, browser, human review). |

---

## Supporting documents (reference)

| Concern | Document | Purpose |
|--------|----------|---------|
| Build protocol (slices, verification, human review) | `docs/canonical/governed-build-protocol.md` | One-slice-at-a-time, terminal/RPC/browser verification, no hidden stubs, evidence. |
| Repo status labels | `docs/canonical/repo-status-model.md` | VERIFIED_REAL, PARTIAL, PLACEHOLDER, STUB_OR_MOCK, BROKEN, LEGACY_REFERENCE, NOT_YET_AUDITED. |
| Documentation policy | `docs/POLICY.md` | Allowed/forbidden doc roots, artifacts, prompts directory rules. |
| Agent onboarding | `AGENTS.md` | Credentials, architecture, Docker-first verification, gotchas. |
| AI build guidance (Copilot) | `.github/copilot-instructions.md` | Docker-first, prompt capture, inventory-first, verify against live Docker. |
| AI build guidance (Cursor) | `.cursor/rules/governed-build-proof-rules.mdc` | Proof-driven build, no uncontrolled feature gen, stop after each stage. |

---

## Root governance summary

- **High-level transition and governed build** — `GOVERNANCE.md` (repo root). Short summary: repo as salvage/reference + governed proof-driven platform; future work follows the canonical governed build protocol.

---

## How to use this index

- When defining or changing **repo-wide rules** → update or follow `docs/governance/PROOF-AND-GOVERNANCE.md`.
- When defining or changing **what is considered runtime truth** → update or follow `docs/canonical/runtime-truth.md`.
- When defining or changing **upstream pinning or source selection** → update or follow `docs/canonical/upstream-source-strategy.md`.
- When defining or changing **prompt numbering or structure** → follow `prompts/00-ORDERING-RULES.md` and `docs/canonical/prompt-system-canonicalization-plan.md`.
- When defining or changing **what counts as proof** → update or follow `docs/canonical/verification-standard.md`.
