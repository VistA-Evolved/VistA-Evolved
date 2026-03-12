# WorldVistA repo role explanations

> **What each WorldVistA repository is for and how this repo uses it.**

---

## Canonical baselines (Stage 2+)

### WorldVistA/VistA-M

- **What it is:** OSEHRA VistA M components — the MUMPS/M routines and core VistA kernel M code.
- **Role here:** Canonical **M source baseline** for building and auditing. All M code used in the governed build should be traceable to this repo (or a pinned fork/ref).
- **Local path:** `vendor/upstream/VistA-M`
- **Used for:** Docker builds that need the M codebase; RPC and routine reference; future patch application against a known baseline.

### WorldVistA/VistA

- **What it is:** The broader OSEHRA VistA repo — packaging, tooling, documentation, patches, and non-M assets.
- **Role here:** Canonical **broader source/patch/tooling baseline**. Complements VistA-M for build scripts, patches, and reference.
- **Local path:** `vendor/upstream/VistA`
- **Used for:** Build and patch context; tooling reference; documentation and alignment with upstream.

---

## Optional: demo / test dataset

### WorldVistA/VistA-VEHU-M

- **What it is:** VEHU (CPRS Demo) VistA test database — a seeded demo/test dataset.
- **Role here:** Optional. Used when we want a **seeded demo/test dataset** for development or testing. Controlled by `vehuEnabled` in `scripts/upstream/worldvista-sources.config.json`.
- **Local path:** `vendor/upstream/VistA-VEHU-M`
- **Used for:** Local or CI test data; demo environments. Not required for building the core M baseline.

---

## Reference only (not canonical product truth)

### WorldVistA/docker-vista

- **What it is:** Dockerfiles and scripts for running VistA in Docker.
- **Role here:** **Reference material only.** We do not use it as the canonical source of product truth for our Docker build. Our canonical path is: local VistA-M + VistA (and optionally VistA-VEHU-M) under `vendor/upstream/`, then our own Docker build (Stage 3) using those local folders.
- **If needed:** Consult for ideas or compatibility; do not depend on it for pinning or for “what we build from.”

---

## Summary

| Repo | Canonical? | Purpose |
|------|------------|---------|
| VistA-M | Yes | M source baseline |
| VistA | Yes | Broader source/patch/tooling baseline |
| VistA-VEHU-M | Optional | Seeded demo/test dataset |
| docker-vista | No (reference) | Reference only; not product truth |

All canonical and optional sources are fetched once into `vendor/upstream/` and recorded in `vendor/locks/worldvista-sources.lock.json`. Docker builds (Stage 3) use these local paths only.
