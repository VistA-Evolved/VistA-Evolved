# Upstream Source Strategy

> **How upstream VistA (and other) sources are selected, pinned, and referenced.**
> This document is the canonical reference for upstream source strategy; it does not implement pinning (that is Stage 2).

---

## 1. Scope

- **VistA:** Kernel, RPC broker, M routines, File 8994 RPC registry, and any VistA-derived images or runtimes.
- **Other upstreams:** Node/TS dependencies, Docker base images, platform DB — version pinning is out of scope here except where they affect VistA runtime.

---

## 2. Governing principle

- **Traceability:** Every runtime that claims to be "VistA" or "VistA-compatible" must be traceable to a defined upstream (e.g. repo, tag, image digest).
- **No silent substitution:** The repo must not silently use a different upstream than the one documented. If a fallback is used (e.g. stub), it must be explicit and status-labeled (see `docs/canonical/repo-status-model.md`).
- **Local-first (post–Stage 2):** The governed build order calls for "Pin upstream VistA sources locally" (Stage 2) and "Build custom Docker from local sources only" (Stage 3). This document defines the strategy; implementation is in those stages.

---

## 3. Existing references (salvage / current state)

- **Runtime lanes:** `docs/runbooks/runtime-lanes.md` — VEHU, Legacy, Compose, Distro.
- **VistA baselines:** `docs/runbooks/vista-baselines.md` — multi-lane reference.
- **ADRs:** 
  - `docs/adrs/ADR-W29-VISTA-UPSTREAM-SOURCE.md` (if present) — upstream source decision.
  - `docs/adrs/ADR-W29-VISTA-PATCH-TRAIN.md`, `docs/adrs/ADR-W29-OSS-HARVEST.md` — patch and harvest strategy.
- **Docker:** `services/vista/docker-compose.yml`, `services/vista-distro/` — current image references.
- **RPC catalog / probe:** `data/vista/rpc-catalog-snapshot.json`, `services/vista/ZVEPROB.m` — RPC availability and versioning.

These remain the reference until Stage 2 pins and documents exact sources (commits, tags, digests).

---

## 4. What "pinning" will mean (Stage 2+)

- **VistA source:** A single identified upstream (e.g. Git repo + ref, or image + digest) that this repo builds or runs against.
- **Local copy:** Upstream refs are cloned under `vendor/upstream/` (VistA-M, VistA, optionally VistA-VEHU-M). The lock file `vendor/locks/worldvista-sources.lock.json` records repo name, URL, branch, commit SHA, local path, fetch date, and purpose.
- **Scripts:** `scripts/upstream/fetch-worldvista-sources.ps1` (clone once / fetch updates), `scripts/upstream/pin-worldvista-sources.ps1` (pin to exact commits), `scripts/upstream/show-worldvista-source-status.ps1` (show status). Config: `scripts/upstream/worldvista-sources.config.json`.
- **Documentation:** `docs/canonical/upstream/local-source-workflow.md`, `docs/canonical/upstream/worldvista-repo-role-explanations.md`. Future Docker builds (Stage 3) use local paths only; no direct remote clone in the product build path.

---

## 5. Relation to other docs

- **Source-of-truth index** — `docs/canonical/source-of-truth-index.md` (points here for upstream source selection).
- **Runtime truth** — `docs/canonical/runtime-truth.md` (runtime truth may reference which upstream a given lane uses).
- **Governed build protocol** — `docs/canonical/governed-build-protocol.md` (no hidden fallback; stub vs real must be explicit).
