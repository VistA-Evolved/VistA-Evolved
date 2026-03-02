# Phase 451 — VERIFY

| # | Gate | Check |
|---|------|-------|
| 1 | Lane config | `config/compat-lanes.json` has >= 2 entries |
| 2 | Matrix script | `scripts/compat/run-matrix.ps1` exists |
| 3 | Lane probe | `scripts/compat/lane-probe.mjs` exists and is valid JS |
| 4 | Output shape | Artifacts JSON has lanes[] with passed/failed per lane |
