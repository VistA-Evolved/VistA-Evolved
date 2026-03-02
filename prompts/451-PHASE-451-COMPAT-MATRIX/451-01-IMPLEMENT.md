# Phase 451 — W29-P5: Compatibility Matrix

## Objective
Define a compat-matrix test harness that verifies VistA-Evolved against 2+ VistA
lanes (dev sandbox, distro lane). Output: structured JSON evidence for patch-train
staging gates.

## Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `scripts/compat/run-matrix.ps1` | Runs API smoke against N VistA lanes |
| 2 | `scripts/compat/lane-probe.mjs` | Node.js lane probe (RPC smoke + health) |
| 3 | `config/compat-lanes.json` | Lane definitions (host, port, label) |

## Acceptance Criteria
1. Matrix runs against at least 2 lane definitions
2. Each lane gets: TCP probe, RPC count probe, routine install check
3. Output is `artifacts/compat-matrix-<timestamp>.json`
