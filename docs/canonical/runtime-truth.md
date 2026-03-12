# Runtime Truth

> **What "runtime truth" means and where it is recorded.**
> Runtime truth = the actual behavior of the running system, verified with evidence — not assumed or documented-only.

---

## 1. Definition

- **Runtime truth** is the state of the system as observed when services are running: API, VistA (or stub), DB, and (when applicable) UI.
- It is established by **running** the system and **recording** results (commands, responses, logs, artifacts). It is not established by code review alone or by "should work" statements.
- Routes, RPCs, and UI flows are assigned a status (e.g. VERIFIED_REAL, PARTIAL, PLACEHOLDER) using `docs/canonical/repo-status-model.md` based on this observed behavior.

---

## 2. Where runtime truth is recorded

- **Runbooks:** `docs/runbooks/` — step-by-step how to run and verify; often include curl commands and expected responses.
- **Health and ping:** `/vista/ping`, `/health`, `/ready` — documented in AGENTS.md and runbooks; used as first-line runtime checks.
- **Verification scripts:** `scripts/verify-*.ps1`, `scripts/verify-latest.ps1`, phase verifiers — produce evidence under `/artifacts/` when run from repo root.
- **Runtime truth map (if present):** e.g. `pnpm qa:runtime-truth` → `artifacts/runtime-truth-map/latest.json` — generated map of route/flow status; see `docs/INDEX.md` and runbooks.
- **RPC availability:** `services/vista/ZVEPROB.m`, `data/vista/rpc-catalog-snapshot.json`, AGENTS.md §8 — which RPCs exist in VEHU vs missing.
- **Canonical docs:** This file and `docs/canonical/governed-build-protocol.md` define how runtime truth is pursued (one slice, verification, evidence); `docs/canonical/verification-standard.md` defines the evidence bar.

---

## 3. How to maintain runtime truth

- **Before/after code changes:** Run the relevant verifier or curl path; capture output; update status in runbooks or indexes if behavior changes.
- **No silent fallback:** If a path is intended to be "real" VistA, do not silently return stub data; return explicit integration-pending or error state (see `docs/canonical/governed-build-protocol.md`).
- **Windows-first:** Prefer commands that run on the repo owner's environment (PowerShell, curl.exe); document Bash/WSL where needed.

---

## 4. Relation to other docs

- **Source-of-truth index** — `docs/canonical/source-of-truth-index.md` (points here for "what governs runtime truth").
- **Governed build protocol** — `docs/canonical/governed-build-protocol.md` (terminal, RPC/API, browser verification).
- **Verification standard** — `docs/canonical/verification-standard.md` (evidence requirements).
- **AGENTS.md** — Docker-first verification, VEHU test data, `/vista/ping` and route testing.
