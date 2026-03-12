# VistA Evolved — Project Memory / Canonical Context

## Project direction
The project is shifting away from broad AI-driven feature generation and toward a slow, governed, proof-driven build method.

The user is not a programmer and primarily works by giving detailed instructions/prompts to an AI coder in VS Code / Cursor / Copilot-style tooling. Guidance should therefore be written as precise AI-agent instructions, not hand-coding steps.

## Current repo strategy
Do **not** start over in a new repo right now.

Use the **current repo** as:
- the working repo
- the salvage/reference archive
- the place where governance, canonical docs, runtime truth, and verification are installed

Do **not** treat the current repo as clean product truth.

A new clean repo is only a later option if, after governance is installed, legacy code still causes too much confusion. If that happens, only proven slices should be migrated.

## Canonical build order
1. Install repo governance and proof rules
2. Pin upstream VistA sources locally
3. Build custom Docker from **local sources only**
4. Establish runtime truth and health verification
5. Prove authentic web roll-and-scroll terminal
6. Build system administration/control slices
7. Build operational administration slices
8. Build executive read-only analytics
9. Build clinician-facing GUI slices one at a time

## Non-negotiable governed build protocol
For each slice:
1. Define the slice
2. Define the relevant VistA truth sources (manuals, routines, options, files, observed terminal behavior)
3. Implement the smallest possible vertical slice
4. Verify in terminal
5. Verify by RPC/API
6. Verify in browser
7. Stop for human review
8. Fix based on feedback
9. Only then move to the next slice

Rules:
- Never claim something works without proof
- Proof must include exact files, commands, outputs, pass/fail
- No hidden fallback from real VistA to stub/mock/placeholder in paths labeled real
- No uncontrolled feature generation
- No broad new scope before current stage is verified

## Upstream source strategy
Use:
- `WorldVistA/VistA-M` as the canonical M source baseline
- `WorldVistA/VistA` as the broader source/patch/tooling baseline
- `WorldVistA/VistA-VEHU-M` optionally as a seeded demo/test dataset
- `docker-vista` only as a reference/recipe source, **not** as canonical product truth

## Local-first source acquisition rule
The AI should download/clone the upstream repos **locally first**, then build Docker from those local folders.

Do **not** let Docker build retries keep re-downloading remote sources.

Desired workflow:
- first run: clone locally into vendor/upstream/
- later runs: reuse local repos
- if build fails: debug against same local source tree
- refresh sources only via explicit fetch/update script

## What the user wants from the AI coder
- Detailed prompts that leave nothing vague
- Governance files and rules installed inside the repo
- AI must verify what it builds
- AI must stop after each stage and report
- AI should open/check the browser when required
- AI should ask for human review before moving to the next slice

## Status from the most recent reported AI-coder run

### Stage 1 — governance installed
Created/updated canonical governance and source-of-truth docs, including governed build protocol, repo status model, verification standard, runtime truth, upstream source strategy, prompt recovery/canonicalization, root governance summary, and AI rules for Cursor/Copilot/AGENTS.

### Stage 2 — local upstream pinning setup created and later completed
Created vendor/upstream structure, lock file template, PowerShell fetch/pin/status scripts, and local-source workflow docs.

Later status update: `vendor/locks/worldvista-sources.lock.json` was populated with real SHAs:
- `VistA-M` = `b7aecb9029f9bb8639a7bfa63b635469065ab44d`
- `VistA` = `6c18f1bf98a3c2b33aa0c61ced6282a42c72e1aa`

### Stage 3 — custom local Docker build lane created
Created a custom Docker build pipeline using **local vendored sources only**.
Image build passed.
Canonical local dev ports were documented.
The first container start attempt failed due to host port conflict, which was later corrected by using the canonical local lane on RPC `9433` and SSH `2224`.

### Stage 4 — runtime truth checks created and later fully passed
Readiness levels were defined:
- CONTAINER_STARTED
- NETWORK_REACHABLE
- SERVICE_READY
- TERMINAL_READY
- RPC_READY

Initial healthcheck showed runtime not fully ready because the container was not actually Up and host ports were conflicting/misleading.

Later status update: full readiness pass was achieved on the local-vista lane with:
- RPC port `9433`
- SSH port `2224`
- container healthy
- all 5 readiness levels PASS

### Stage 5 — web roll-and-scroll terminal path audited and proven strongly enough to proceed
Mapped terminal-related backend/frontend code.
Created terminal criteria, architecture, and verification docs.
Created backend verification script and Playwright tests.

Initial proof established:
- backend terminal health/session checks
- browser terminal page load/smoke
- terminal UI presence

Later stronger proof established:
- live WebSocket connection
- terminal status connected state exposed via `data-terminal-status`
- browser test typed into the terminal (`D ^ZU`)
- session remained connected after input
- screenshot evidence captured at `apps/web/e2e-report/terminal-live-proof.png`
- Playwright reported 3 passing tests

Important caveat still remaining:
- exact VistA prompt/response text is not asserted automatically because xterm renders to canvas
- manual sign-in / exact text / resize / copy-paste checks are still recommended per `docs/canonical/terminal/web-terminal-verification.md`

### Planned first admin/control slice
Recommended first slice: **Security keys / roles overview (read-only)**.
Reason: foundational, small, already partly present, clearly tied to VistA truth, low-risk compared with write paths.
This slice is planned but **not yet implemented**.

## Most important current conclusion
The repo has now crossed the threshold where it is reasonable to begin **Slice 001 implementation**, with one caveat:
- runtime truth is sufficiently proven for the canonical local lane
- authentic browser terminal truth is sufficiently proven to proceed
- manual terminal fidelity checks are still recommended, but they no longer need to block Slice 001

So the correct next move is:
1. keep the runtime and terminal proof artifacts as the accepted baseline
2. start **Slice 001 — Security keys / roles overview (read-only)**
3. continue using the governed build protocol for the slice

## Exact next-step direction
Next AI instruction should be roughly:
- implement and verify Slice 001 using the planning pack already created
- use real VistA data or explicit integration-pending behavior
- no stub/mock key list
- verify by RPC/API and browser
- optionally add terminal/manual cross-check where feasible
- stop after Slice 001 evidence and wait for human review

## Product strategy / sequencing insight
Do **not** restart at CPRS broad GUI.
Do **not** jump first to broad executive dashboards.

Start from:
- real VistA truth
- authentic roll-and-scroll
- system administration/control
- operational administration
- executive read-only views
- clinician-facing GUI slices later, one by one

## Research / truth model for building future slices
There is no single perfect end-to-end manual for all of VistA.
For each slice, truth should come from a stack of:
- VistA/Kernel/FileMan/List Manager docs
- package-specific manuals
- actual M routines/options/files
- observed live terminal behavior
- only then modern UX reference research from Epic/Cerner/Oracle/etc.

Modern competitor systems should be used for UX inspiration, not as product truth.

## Style preference to remember
The user wants extremely explicit, world-class prompt engineering for the AI coder:
- detailed
- no ambiguity
- no hallucination
- no hidden pending work
- verification forced
- stop points enforced
- human approval before widening scope
