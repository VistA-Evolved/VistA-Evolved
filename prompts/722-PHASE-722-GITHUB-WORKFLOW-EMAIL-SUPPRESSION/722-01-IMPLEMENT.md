# Phase 722 - GitHub Workflow Email Suppression

## Implementation Steps

1. Inventory the workflows shown in the failure emails and confirm they are the automated sources of repeated GitHub notifications.
2. Preserve the workflow files but convert their triggers to manual-only execution with `workflow_dispatch` so they no longer fire on push, pull request, or schedule.
3. Keep the workflow job definitions intact so maintainers can still run them deliberately from GitHub when needed.
4. Avoid changing unrelated CI workflows that were not part of the reported email noise.
5. Create a local checkpoint commit after the workflow trigger changes so the local workspace can be pushed in a saved state.

## Files Touched

- .github/workflows/resilience-certification.yml
- .github/workflows/supply-chain-security.yml
- .github/workflows/ci-vehu-smoke.yml
- .github/workflows/perf-acceptance-gate.yml
- .github/workflows/codeql.yml
- .github/workflows/dr-nightly.yml
- .github/workflows/qa-gauntlet.yml
