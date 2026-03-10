# Phase 725 - Enterprise Readiness Program - VERIFY

## Verification Steps
1. Confirm required Docker containers are healthy and reachable.
2. Start the API using the canonical `.env.local` path and verify clean startup with no migration failures.
3. Verify `/vista/ping` and `/health` return successful live responses.
4. Run the canonical repository verifier and record the first failing required gates.
5. Run focused live checks for representative domains: clinical reads, write-path guards, scheduling, portal auth, tenant posture, and admin modules.
6. Verify that any fixes made in this phase are backed by exact reruns of the failing command or workflow.
7. Confirm docs and runbooks match the runtime behavior that was just proven.
8. Publish evidence in ops artifacts with commands, outputs, and remaining prioritized gaps.

## Acceptance Criteria
1. Work is driven by runtime proof, not assumptions or code-only inspection.
2. At least one concrete production-readiness blocker is closed and re-verified.
3. The evidence trail is reproducible by another engineer on Windows.
4. The readiness report distinguishes proven, partial, and missing capabilities truthfully.
5. The prompt pack, runbooks, and ops artifacts point to the same canonical reality.

## Files Touched
- prompts/725-PHASE-725-ENTERPRISE-READINESS-PROGRAM/725-01-IMPLEMENT.md
- prompts/725-PHASE-725-ENTERPRISE-READINESS-PROGRAM/725-99-VERIFY.md
- docs/runbooks/<relevant-runbooks>.md
- ops/summary.md
- ops/notion-update.json
- <runtime, test, docs, and code files identified during this phase>