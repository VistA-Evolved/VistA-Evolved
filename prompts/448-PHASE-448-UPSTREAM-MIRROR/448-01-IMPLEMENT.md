# Phase 448 — W29-P2: Upstream Mirror Tooling + License Snapshotting

## Objective

Automate mirroring of upstream WorldVistA repos and capture license/version info.

## Deliverables

1. scripts/upstream/worldvista-sync.ps1 — clone/fetch repos, pin SHAs
2. vendor/worldvista/LOCK.json — repo -> SHA -> fetched_at -> license
3. scripts/upstream/snapshot-licenses.mjs — license inventory to evidence

## Evidence

- /evidence/wave-29/448-upstream-mirror/
