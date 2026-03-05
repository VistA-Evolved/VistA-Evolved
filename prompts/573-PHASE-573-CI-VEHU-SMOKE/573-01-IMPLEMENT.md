# Phase 573 — CI VEHU Smoke

## User Request

Add a GitHub Actions workflow that can prove "real VistA" periodically without
slowing PRs.

## Implementation Steps

1. Create `.github/workflows/ci-vehu-smoke.yml`:
   - Triggers: `workflow_dispatch` + nightly schedule (cron)
   - NOT on `pull_request` — must not slow PRs
   - Start VEHU via `docker compose --profile vehu`
   - Start PostgreSQL as a service container
   - Run `pnpm install --frozen-lockfile`
   - Run `pnpm verify:vista` (direct RPC bridge tests)
   - Start the API server in background
   - Run clinic-day-runner journey J1 (Tier-0 outpatient)
   - Upload artifacts (logs + reports) even on failure

## Verification Steps

1. `.github/workflows/ci-vehu-smoke.yml` exists
2. Workflow triggers: `workflow_dispatch` + `schedule` only (no `pull_request`)
3. Uses `worldvista/vehu` image
4. Runs `pnpm verify:vista`
5. Runs clinic-day runner
6. Uploads artifacts with `if: always()`
7. `pnpm qa:gauntlet:fast` passes

## Files Touched

- `.github/workflows/ci-vehu-smoke.yml` (created)
- `prompts/573-PHASE-573-CI-VEHU-SMOKE/573-01-IMPLEMENT.md` (this file)
- `prompts/573-PHASE-573-CI-VEHU-SMOKE/573-99-VERIFY.md`
- `prompts/573-PHASE-573-CI-VEHU-SMOKE/NOTES.md`
