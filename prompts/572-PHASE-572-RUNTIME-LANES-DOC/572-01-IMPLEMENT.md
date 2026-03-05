# Phase 572 — Runtime Lanes Documentation

## User Request

Make the repo understandable to a senior dev and to hospital IT by explicitly
documenting runtime lanes.

## Implementation Steps

1. Create `docs/runbooks/runtime-lanes.md` covering four lanes:
   - Lane A: VEHU (recommended dev/test baseline)
   - Lane B: Legacy worldvista-ehr
   - Lane C: All-in-one compose (root docker-compose.yml)
   - Lane D: Distro lane (build-your-own)
     Per lane: ports, docker compose command, env template, expected truth evidence.
2. Update `AGENTS.md` Section 4 ("Running Everything") to reference VEHU as
   the recommended lane and link to `docs/runbooks/runtime-lanes.md`.
3. Update `README.md` to link to the runtime-lanes runbook from the Quick Start.

## Verification Steps

1. `docs/runbooks/runtime-lanes.md` exists with all four lanes documented.
2. `AGENTS.md` Section 4 mentions VEHU and links to the runbook.
3. `README.md` links to the runbook.
4. `pnpm qa:gauntlet:fast` passes.

## Files Touched

- `docs/runbooks/runtime-lanes.md` (created)
- `AGENTS.md` (updated Section 4)
- `README.md` (added runbook link)
- `prompts/572-PHASE-572-RUNTIME-LANES-DOC/572-01-IMPLEMENT.md` (this file)
- `prompts/572-PHASE-572-RUNTIME-LANES-DOC/572-99-VERIFY.md`
- `prompts/572-PHASE-572-RUNTIME-LANES-DOC/NOTES.md`
