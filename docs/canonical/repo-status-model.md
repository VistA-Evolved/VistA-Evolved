# Repo Status Model

> **Canonical labels for classifying code, routes, UI, and prompts.**
> Use these labels to mark status in indexes, runbooks, and code comments. Do not invent new status labels without adding them here and updating the source-of-truth index.

---

## Status Labels (definitions)

| Label | Meaning | When to use |
|-------|---------|-------------|
| **VERIFIED_REAL** | Proven against live VistA (or live dependency). Evidence exists: command + output or artifact. No stubs in the path. | Route/UI/RPC has been exercised against running Docker/API and evidence was captured. |
| **PARTIAL** | Some behavior is real, some is missing or stubbed. Explicitly documented what works vs what does not. | Feature is partially wired; e.g. read path is real, write path is integration-pending. |
| **PLACEHOLDER** | UI or API surface exists but does not call real backend; shows "integration pending" or equivalent. No fake success. | Button/page/endpoint exists for contract only; user sees clear pending state. |
| **STUB_OR_MOCK** | Intentional stub or mock for dev/test. Must be clearly labeled (e.g. adapter type `stub`, or comment in code). Never used in paths labeled as real. | Adapter is `stub`, or test double; not used as fallback in production code paths. |
| **BROKEN** | Known broken: fails at runtime or returns errors. Must have a ticket or doc reference; do not leave unmarked. | Failing tests, 500s, MUMPS errors; documented with reason and fix path. |
| **LEGACY_REFERENCE** | Kept for history/reference only. Not part of active build order. May be obsolete or superseded. | Old prompts, deprecated routes, or archived docs; index points to canonical replacement if any. |
| **NOT_YET_AUDITED** | Not yet classified. Default for existing work that has not been through the governed audit. | Anything that has not been assigned one of the above labels. |

---

## How to apply

- **Routes / API:** In runbooks or route comments, state status with one of the labels. Example: `// Status: VERIFIED_REAL (VEHU curl 2026-03-12)`.
- **Prompts:** In phase folder `NOTES.md` or in the source-of-truth index, mark phase status. Preserve legacy prompts as LEGACY_REFERENCE or NOT_YET_AUDITED until audited.
- **UI:** In UI estate or runtime truth docs, mark each page/flow with one label. No silent fallback to fake data in VERIFIED_REAL paths.
- **Indexes:** When building source-of-truth or runtime-truth indexes, include a status column using only these labels.

---

## Relation to other docs

- **Governed build protocol** (`docs/canonical/governed-build-protocol.md`) — Defines how work moves to VERIFIED_REAL (evidence, human review).
- **Verification standard** (`docs/canonical/verification-standard.md`) — Defines what evidence is required for VERIFIED_REAL.
- **Runtime truth** (`docs/canonical/runtime-truth.md`) — Runtime truth map uses these labels per route/flow.
