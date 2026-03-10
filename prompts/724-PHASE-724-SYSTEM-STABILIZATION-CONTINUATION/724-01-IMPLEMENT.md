# Phase 724 - System Stabilization Continuation - IMPLEMENT

## User Request
- Continue without stopping.
- Fix the whole system end-to-end until all modules and workflows are production-ready.
- Ensure backend, frontend, UX/UI, and live VistA communication all work as intended.

## Implementation Steps
1. Verify Docker baseline first (`vehu`, `ve-platform-db`) and confirm both are healthy.
2. Start API using `npx tsx --env-file=.env.local src/index.ts` and capture startup logs.
3. Eliminate API startup instability (port/process collisions, startup race, config mismatch).
4. Inventory impacted files before each patch and keep edits minimal.
5. Fix backend defects blocking module routes or causing false degraded states.
6. Fix frontend UX/UI workflow breakages discovered during live route and browser checks.
7. Validate auth/session/CSRF behavior for CPRS + portal flows with cookie-based sessions.
8. Validate VistA read routes with live data (`dfn=46`) after each backend change.
9. Validate write-path guards return truthful statuses (signed, blocked, integration-pending).
10. Re-run verifier (`scripts/verify-latest.ps1`) until clean required gates.
11. Record findings, changes, and verification in ops artifacts for handoff.

## Files Touched
- prompts/724-PHASE-724-SYSTEM-STABILIZATION-CONTINUATION/724-01-IMPLEMENT.md
- prompts/724-PHASE-724-SYSTEM-STABILIZATION-CONTINUATION/724-99-VERIFY.md
- scripts/start-api-safe.ps1
- package.json
- scripts/dev-up.ps1
- docs/runbooks/windows-port-3001-fix.md
- ops/summary.md
- ops/notion-update.json
