# Phase 475 — W32-P3: Notes

## Root Cause

- `build-phase-index.mjs` line 113: filter `/^\d{2,3}-PHASE-/` only matches legacy folders
- `phase-index-gate.mjs` line 58: same limited filter
- Wave folders (`NNN-W##-P##-TITLE`) were invisible to both scripts

## Fix

- Broadened regex to match all numbered phase folders
- Shared constant for folder discovery pattern
