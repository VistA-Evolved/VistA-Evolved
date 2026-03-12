# Verification Standard

> **What counts as proof and what evidence is required.**
> Aligns with `docs/governance/PROOF-AND-GOVERNANCE.md` and `docs/canonical/governed-build-protocol.md`.

---

## 1. Proof definition

**Proof** means all of the following are present:

- **Exact files created or changed** — Paths listed; no "various files" without listing.
- **Exact commands run** — Copy-pasteable; includes working directory and env where relevant (e.g. from repo root, with `.env.local`).
- **Exact outputs observed** — Full command output or a clear reference to an artifact file (e.g. under `/artifacts/`).
- **Exact pass/fail result** — Explicit statement: pass or fail for each verification step. No implied success.

**Not proof:** "Should work," "looks correct," "verification deferred," "tests pass" without showing the run, or marking done without a live test when the protocol requires one.

---

## 2. Evidence requirements by verification type

| Type | Required evidence |
|------|--------------------|
| **Terminal** | Commands run; full stdout/stderr or path to log under `/artifacts/`; exit code and pass/fail. |
| **RPC/API** | Request (e.g. `curl` or equivalent); response body (or key fields); `ok`/`rpcUsed`/errors; pass/fail. |
| **Browser** | URL; steps; screenshot or test log; pass/fail. |
| **Human review** | Completion report (what was done, not done, verified, unverified, next step); explicit approval or instruction to proceed. |

---

## 3. Where evidence lives

- **Verification outputs** → `/artifacts/` (gitignored). Use subdirs per tool or run, e.g. `/artifacts/governance/`, `/artifacts/evidence/`.
- **Never commit** verification outputs to `/reports/`, `/docs/reports/`, or `/docs/verify/` (see `docs/POLICY.md`).
- CI may upload artifact directories; the repo itself does not commit them.

---

## 4. Status and proof

- **VERIFIED_REAL** (see `docs/canonical/repo-status-model.md`) requires evidence that meets this standard for the relevant verification type(s).
- **PARTIAL** requires evidence for what is verified and a clear statement of what is not.
- **PLACEHOLDER** / **STUB_OR_MOCK** / **NOT_YET_AUDITED** do not imply proof of real behavior; they are classification labels, not evidence.

---

## 5. Relation to other docs

- **Governance** — `docs/governance/PROOF-AND-GOVERNANCE.md`
- **Protocol** — `docs/canonical/governed-build-protocol.md`
- **Status model** — `docs/canonical/repo-status-model.md`
- **Source-of-truth index** — `docs/canonical/source-of-truth-index.md`
