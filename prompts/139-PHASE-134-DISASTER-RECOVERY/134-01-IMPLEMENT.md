# Phase 134 — IMPLEMENT: Disaster Recovery & Resilience

## User Request
Make DR real, not aspirational. A hospital will ask: "Show me restore."

## Implementation Steps

### A) Backup tooling
- `scripts/dr/backup.mjs`: pg_dump logical backup with SHA-256 checksums + manifest.json
- WAL/PITR posture check (wal_level, archive_mode)
- Table inventory (names + counts only, no PHI)
- Credential redaction in manifest

### B) Restore verification
- `scripts/dr/restore-verify.mjs`: creates temporary `dr_verify` schema
- 5-phase durability probes:
  1. Schema integrity (table count, critical tables)
  2. Synthetic data write+read (no PHI)
  3. RLS policy verification
  4. Schema drift detection (column count comparison)
  5. Manifest checksum verification
- Auto-cleanup of temp schema

### C) CI wiring
- `.github/workflows/dr-nightly.yml`: nightly schedule + manual dispatch
- PG 16 service container, migration run, backup + verify
- Artifact upload (7-day retention)

### D) Chaos restart gate
- `scripts/qa-gates/restart-chaos-gate.mjs`: validates DR posture
- `qa/gauntlet/gates/g16-dr-chaos.mjs`: G16 gate wrapper
- Wired into RC + FULL gauntlet suites

### E) Documentation
- `docs/runbooks/disaster-recovery.md`: single runbook covering backup, restore, PITR, CI, recovery procedures
- `/backups/` added to `.gitignore`

## Files Touched
- `scripts/dr/backup.mjs` (new)
- `scripts/dr/restore-verify.mjs` (new)
- `scripts/qa-gates/restart-chaos-gate.mjs` (new)
- `qa/gauntlet/gates/g16-dr-chaos.mjs` (new)
- `qa/gauntlet/cli.mjs` (modified: G16 in RC + FULL)
- `.github/workflows/dr-nightly.yml` (new)
- `docs/runbooks/disaster-recovery.md` (new)
- `.gitignore` (modified: /backups/)
- `prompts/139-PHASE-134-DISASTER-RECOVERY/` (new)

## Verification Steps
See 134-99-VERIFY.md
