# VistA-Evolved: Governed Build Platform

This repository is **transitioning from an exploratory AI-built codebase to a governed, proof-driven platform.**

## Current repo

- **Salvage / reference:** Existing code, prompts, and documentation remain as **salvage and reference**. They are not deleted for being messy. They are indexed and status-marked (see `docs/canonical/repo-status-model.md`).
- **No broad cleanup in this phase:** Governance and canonical docs are installed first; product code is preserved and gradually audited, not rewritten in one pass.

## Future work

- **Canonical governed build protocol:** All new work follows the protocol in `docs/canonical/governed-build-protocol.md`: one slice at a time, terminal and RPC/API (and browser) verification, human review stop, no hidden fallback to fake behavior, evidence required.
- **Proof discipline:** Nothing is claimed "done" without proof (exact files, commands, outputs, pass/fail). See `docs/governance/PROOF-AND-GOVERNANCE.md` and `docs/canonical/verification-standard.md`.
- **Build order:** Work proceeds in the 9-stage order in `docs/governance/PROOF-AND-GOVERNANCE.md`. Do not skip stages; stop after each stage until explicitly instructed to continue.

## Where to look

| What | Where |
|------|--------|
| Repo rules, build order, task format | `docs/governance/PROOF-AND-GOVERNANCE.md` |
| Which doc governs what | `docs/canonical/source-of-truth-index.md` |
| Build protocol (slices, verification, evidence) | `docs/canonical/governed-build-protocol.md` |
| Status labels (VERIFIED_REAL, PARTIAL, etc.) | `docs/canonical/repo-status-model.md` |
| Verification bar and evidence | `docs/canonical/verification-standard.md` |
| Agent onboarding + Docker-first | `AGENTS.md` |
