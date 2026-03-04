# Phase 512 -- VistA Baseline Lane (IMPLEMENT)

## Goal

Remove ambiguity about "which VistA are we validating against" by documenting
the three baselines and adding a probe script.

## Deliverables

1. Create `docs/runbooks/vista-baselines.md` documenting all 3 VistA lanes.
2. Create `scripts/vista-baseline-probe.ps1` that probes VistA identity,
   listener ports, and RPC broker reachability.
3. Probe outputs JSON to `evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE/`.

## Evidence

- `evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE/baseline-probe.json`
