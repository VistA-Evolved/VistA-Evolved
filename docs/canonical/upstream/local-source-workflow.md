# Local-source-first workflow

> **Why we download upstream VistA sources once into a local vendor area, pin them, and use those paths for all later Docker builds.**

**First-time clone:** The WorldVistA repos are large; the first run of `fetch-worldvista-sources.ps1` can take several minutes (e.g. 5–15 minutes depending on network). Let it complete; do not interrupt. Later runs reuse existing clones and are fast.

---

## 1. Why download once locally first

- **No re-download on failure:** When a Docker or build step fails, re-running must not trigger a full clone again. Clones live under `vendor/upstream/`; scripts reuse them. If something breaks, you fix the build or the environment — you do not re-fetch by default.
- **Controlled refresh:** Refreshing upstream is an explicit action: run `scripts/upstream/fetch-worldvista-sources.ps1` (and optionally `pin-worldvista-sources.ps1`). There is no automatic “pull latest” during a build.
- **Reproducibility:** The lock file `vendor/locks/worldvista-sources.lock.json` records commit SHAs and fetch date. Future Docker builds (Stage 3+) must use the local paths and, when pinning is used, the pinned commits — not “whatever is on the remote today.”
- **Windows-first:** Scripts are PowerShell-first; run from VS Code/Cursor on Windows. Clone/fetch happens on the host; Docker builds consume the local folders via bind mount or copy, not `git clone` inside the container.

---

## 2. Which repo is used for what

| Repo | Role | Config key | Purpose |
|------|------|------------|---------|
| **WorldVistA/VistA-M** | Canonical M baseline | VistA-M | OSEHRA VistA M components; primary M source for builds. |
| **WorldVistA/VistA** | Broader baseline | VistA | OSEHRA VistA: patches, tooling, packaging, docs. |
| **WorldVistA/VistA-VEHU-M** | Optional demo/test | VistA-VEHU-M | VEHU (CPRS Demo) test database; seeded dataset. Enabled via `vehuEnabled` in config. |
| **WorldVistA/docker-vista** | Reference only | (not in config) | Not canonical product truth; use as reference later if needed. |

See `docs/canonical/upstream/worldvista-repo-role-explanations.md` for more detail.

---

## 3. Later Docker builds use local paths only

- **Stage 3 (Build custom Docker from local sources only)** will assume:
  - All VistA sources are already under `vendor/upstream/` (VistA-M, VistA, optionally VistA-VEHU-M).
  - Build context or Dockerfile COPY/ADD uses these local paths (e.g. `vendor/upstream/VistA-M`, `vendor/upstream/VistA`).
  - No `RUN git clone ...` of these repos inside the image unless it is explicitly copying from a build arg that points at the host’s `vendor/upstream`.
- **No direct remote pull in product path:** The product build must not depend on “clone from GitHub at build time” for WorldVistA sources. Fetch once locally; then build from local.

---

## 4. Avoiding endless re-download loops during failed build/debug

- **First run:** `fetch-worldvista-sources.ps1` clones into `vendor/upstream/<name>/`. Lock file is written with commit SHA and date.
- **Later runs:** If the directory already exists and is a Git repo, the script fetches (and optionally updates), then updates the lock. It does **not** delete and re-clone.
- **Build fails:** Re-running the build (or a Docker build) does not run the fetch script by default. You fix the failure; you do not “try again by re-downloading.”
- **Explicit refresh:** To refresh from upstream, the user runs `scripts/upstream/fetch-worldvista-sources.ps1` (and optionally pins with `pin-worldvista-sources.ps1`). CI or local workflows that need a fresh pin can call these scripts explicitly in a dedicated step.

---

## 5. Scripts and config

| Item | Purpose |
|------|---------|
| `scripts/upstream/worldvista-sources.config.json` | Repo URLs, local paths, branches, vehuEnabled, allowUpdates, hardReset. |
| `scripts/upstream/fetch-worldvista-sources.ps1` | Clone if missing; fetch if present; update lock. Do not re-clone on failure. |
| `scripts/upstream/pin-worldvista-sources.ps1` | Pin repos to exact commits; update lock. |
| `scripts/upstream/show-worldvista-source-status.ps1` | Show lock contents and vendor/upstream disk status. |
| `vendor/locks/worldvista-sources.lock.json` | Record of repo name, URL, branch, commit SHA, local path, fetch date, purpose. |

---

## 6. Relation to other docs

- **Upstream source strategy** — `docs/canonical/upstream-source-strategy.md`
- **WorldVistA repo roles** — `docs/canonical/upstream/worldvista-repo-role-explanations.md`
- **Governed build protocol** — `docs/canonical/governed-build-protocol.md` (no hidden fallback; evidence required)
