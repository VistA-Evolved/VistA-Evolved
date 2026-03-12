# Governed Build Protocol

> **How development proceeds: one slice at a time, with verification and human review.**
> This document defines the protocol that all new work must follow. No moving to the next slice without approval. No hidden fallback to fake behavior.

---

## 1. One-slice-at-a-time development

- **Slice** = one coherent unit of work: one route family, one UI flow, one RPC integration, or one admin capability — scoped so it can be verified in isolation.
- Only one slice is "in progress" at a time for a given stage or feature area.
- A slice is **complete** only when it has passed terminal verification, RPC/API verification, and (if applicable) browser verification, and has been signed off in a human review stop.
- Do not start the next slice until the current slice is verified and approved.

---

## 2. Terminal verification

- **What:** Prove that the runtime environment and CLI/script path work.
- **How:** Run exact commands (e.g. start API, start VistA Docker, run verifier script) and capture exact output.
- **Evidence:** Commands (copy-pasteable) and full output or artifact path. Pass/fail must be explicit.
- **Windows-first:** Prefer PowerShell commands that work on the repo owner's machine; document Git Bash/WSL where required.

---

## 3. RPC/API verification

- **What:** Prove that API routes and VistA RPC calls return real data (or documented integration-pending) — no silent stub.
- **How:** Call the API (e.g. `curl` with login + route) against running Docker; inspect response for `ok`, `rpcUsed`, and absence of MUMPS errors.
- **Evidence:** Exact `curl` (or equivalent) and response snippet. For integration-pending, response must state that clearly.
- **Rule:** In any path labeled as "real" VistA, do not fall back to mocks, stubs, or fake data without explicitly returning a status that says so (e.g. `integration-pending`).

---

## 4. Browser verification

- **What:** When the slice includes UI, prove that the UI loads and the critical path works in a browser.
- **How:** Manual or automated (e.g. Playwright) steps; document URL and steps.
- **Evidence:** Screenshot, recording, or test run log. For "integration pending" UI, the user must see that state, not fake success.

---

## 5. Human review stop

- **What:** Before the next slice starts, a human (or explicit approval) confirms the slice is done.
- **Deliverable:** Stage/slice completion report with: what was done, what was not done, what is verified (with evidence), what remains unverified, and the exact next step.
- **No auto-advance:** Do not proceed to the next slice or stage without this stop and explicit instruction to continue.

---

## 6. No moving to the next slice without approval

- Completion of verification does not by itself start the next slice.
- The next slice begins only after: (1) evidence is recorded, (2) completion report is produced, (3) human/explicit approval to proceed is given.
- AI agents must stop after each slice/stage and wait for instruction.

---

## 7. No hidden fallback to fake behavior

- In any code path that is supposed to use real VistA (or real dependency), do not silently substitute stubs, mocks, or placeholder data.
- If the real dependency is unavailable, the response must be explicit: e.g. `ok: false`, `status: "integration-pending"`, or a clear message to the user. No fake success, no "looks correct" without proof.
- Adapters and feature flags (e.g. stub vs vista) must be explicit and documented; stub use is allowed only where the design clearly labels it as stub/dev.

---

## 8. Evidence requirements

- **Every verified slice** must have:
  - **Files changed:** Exact paths created or modified.
  - **Commands run:** Exact, copy-pasteable commands.
  - **Results:** Exact outputs or artifact paths (e.g. under `/artifacts/`).
  - **Pass/fail:** Explicit statement of pass or fail for each verification step.
- Evidence is written to `/artifacts/` (gitignored). It is not committed; CI may upload artifacts.
- Claiming "done" without this evidence is not allowed. See `docs/canonical/verification-standard.md` and `docs/governance/PROOF-AND-GOVERNANCE.md`.

---

## 9. Relation to other docs

- **Proof and governance** — `docs/governance/PROOF-AND-GOVERNANCE.md` (non-negotiable rules, build order, task format).
- **Verification standard** — `docs/canonical/verification-standard.md` (detailed evidence and proof bar).
- **Repo status model** — `docs/canonical/repo-status-model.md` (labels such as VERIFIED_REAL, PARTIAL, STUB_OR_MOCK).
- **Source-of-truth index** — `docs/canonical/source-of-truth-index.md` (which doc governs what).
