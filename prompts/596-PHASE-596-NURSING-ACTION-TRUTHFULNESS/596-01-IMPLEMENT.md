# Phase 596 - Nursing Action Truthfulness

## User Request

Continue closing real end-user workflow gaps so the chart experience is truthful, production-grade, and VistA-first.

## Implementation Steps

1. Verify VEHU, platform-db, and the API are reachable before changing nursing chart metadata or docs.
2. Inventory the current Nursing chart MAR/task behavior, the eMAR routes it actually uses, and the current action registry entries before editing.
3. Fix the CPRS action registry so nursing task, MAR, and administration actions point to the real live endpoints and RPC posture instead of stale unsupported or legacy route metadata.
4. Update the eMAR runbook so chart-embedded nursing behavior, derived task posture, and CSRF-backed write verification steps match the actual implementation.
5. Append ops artifacts so the repo history reflects the nursing truthfulness correction.
6. Re-run live authenticated nursing/eMAR route checks and the latest verifier after the metadata update.

## Files Touched

- prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-01-IMPLEMENT.md
- prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-99-VERIFY.md
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/emar-bcma.md
- ops/summary.md
- ops/notion-update.json
