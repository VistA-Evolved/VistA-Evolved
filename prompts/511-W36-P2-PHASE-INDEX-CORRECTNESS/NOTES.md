# Phase 511 -- Notes

> Wave 36 A2: Phase Index Builder Correctness

## Summary
The phase index builder already handles both `NNN-PHASE-*` and `NNN-W##-P##-*`
folder patterns (implemented in Phase 108). This phase verifies that correctness,
regenerates the index with the new Wave 36 folders, and ensures the gate passes.
