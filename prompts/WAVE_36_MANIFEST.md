# Wave 36 -- PromptOps Truth Repair + Phase Index Correctness + VistA Baseline Lane

**Phases 510-512 (K=3)**
**Objective:** Repair prompts tree health (missing NOTES stubs), harden phase
index builder for all folder conventions, and add VEHU baseline lane with
probe script.

## Phase Map

| Phase | Slug                           | Title                                     |
| ----- | ------------------------------ | ----------------------------------------- |
| 510   | W36-P1-PROMPT-TREE-REPAIR      | Prompt Tree Health Repair                 |
| 511   | W36-P2-PHASE-INDEX-CORRECTNESS | Phase Index Builder Correctness           |
| 512   | W36-P3-VISTA-BASELINE-LANE     | VistA Baseline Lane: VEHU Profile + Probe |

## Definition of Done

- `prompts-tree-health.mjs` passes with 0 FAIL and 0 WARN for notes-present
- `phase-index-gate.mjs` passes with wave-style folders indexed
- VistA baseline probe script exists and produces JSON evidence
- All prompt folders have IMPLEMENT.md + VERIFY.md + NOTES.md

## Commit Log

| Phase | Commit  | Title                           |
| ----- | ------- | ------------------------------- |
| 510   | 7c904f5 | Prompt Tree Health Repair       |
| 511   | ea54494 | Phase Index Builder Correctness |
| 512   | ee6f96f | VistA Baseline Lane             |
