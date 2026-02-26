# Phase 145 — State-of-the-Union Convergence + Gap Burn-Down Plan (IMPLEMENT)

## Goal
Create a deterministic, repo-truth-based "what's done / what's not" snapshot
and lock the next burn-down plan to it. No new features -- only audit,
convergence artifacts, and hard gates.

## Non-negotiables
1. No new features in this phase. Only: audit, convergence, and hard gates.
2. No scattered docs or reports folders. Use:
   - `docs/audits/system-audit.md` (auto-generated)
   - `qa/gauntlet/system-gap-matrix.json` (auto-generated)
   - `artifacts/*` for big outputs (gitignored)
3. Evidence-based only: every gap references a file path and a real marker.
4. Must preserve "VistA-first" and "no fake integrations" rules.

## Steps

### Step 1 -- Re-run system audit and capture diff
- Run `pnpm audit:system`
- Copy generated `qa/gauntlet/system-gap-matrix.json` to
  `artifacts/phase145/system-gap-matrix.after.json`
- Copy the previous one (from git HEAD~1) to
  `artifacts/phase145/system-gap-matrix.before.json`
- Generate automated diff: `artifacts/phase145/gap-diff.json`
  - gaps added / removed / severity changes
  - Map store count changes
  - dead-click marker changes
  - stub/not_implemented count changes

### Step 2 -- Identify the "Top 10 real blockers"
- Use the diff + current matrix to compute Top 10 blockers
- Severity (high/med/low), scope (module), why it matters, exact files
- Write into `docs/audits/phase145-priority-backlog.md` (max 2 pages)

### Step 3 -- Enforce gates: "no drift allowed"
- `G19_system_audit_snapshot`: fails if matrix cannot generate or has invalid schema
- `G20_no_new_stub_growth` (soft/warn): warns if stub/not_implemented counts increase
- `G21_no_new_critical_map_store` (hard): fails if new high-risk Map stores appear in critical modules

### Step 4 -- Prepare burn-down phase scaffolds (146-148)
- `146`: Durability + store elimination wave
- `147`: Scheduling realism + SD depth + seeding posture
- `148`: Production VistA distro lane

## Files touched
- `prompts/150-PHASE-145-CONVERGENCE/` (this folder)
- `artifacts/phase145/` (gitignored)
- `docs/audits/phase145-priority-backlog.md`
- `qa/gauntlet/gates/g19-system-audit-snapshot.mjs`
- `qa/gauntlet/gates/g20-no-new-stub-growth.mjs`
- `qa/gauntlet/gates/g21-no-new-critical-map-store.mjs`
- `qa/gauntlet/cli.mjs` (add G19-G21 to suites)
- `prompts/151-PHASE-146-DURABILITY-WAVE3/`
- `prompts/152-PHASE-147-SCHEDULING-DEPTH-V2/`
- `prompts/153-PHASE-148-PROD-VISTA-DISTRO/`
