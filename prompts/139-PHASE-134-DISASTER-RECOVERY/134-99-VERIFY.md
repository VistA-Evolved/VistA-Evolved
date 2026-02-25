# Phase 134 — VERIFY: Disaster Recovery & Resilience

## Verification Checklist

### Sanity
- [ ] Prompt folder 139-PHASE-134-DISASTER-RECOVERY/ has IMPLEMENT + VERIFY
- [ ] No new reports/ folder created
- [ ] /backups/ in .gitignore
- [ ] No backup files committed to git

### Feature Integrity
- [ ] `node scripts/dr/backup.mjs` runs and creates manifest.json + platform-pg.sql
- [ ] SHA-256 checksum in manifest matches actual dump file
- [ ] `node scripts/dr/restore-verify.mjs --from <dir>` passes all probes
- [ ] Temp schema dr_verify is created then dropped
- [ ] Synthetic data probe: write + read synthetic tenant data
- [ ] RLS probe: policies exist in public schema
- [ ] Schema drift probe: no column count mismatches

### CI/Gauntlet
- [ ] `.github/workflows/dr-nightly.yml` valid YAML
- [ ] G16 gate registered in cli.mjs for RC + FULL suites
- [ ] `node scripts/qa-gates/restart-chaos-gate.mjs` passes
- [ ] Gauntlet RC includes G16 and passes

### Regression
- [ ] TypeScript: 3/3 apps clean (api, web, portal)
- [ ] Builds: all pass
- [ ] Gauntlet FAST: 4+ passes
- [ ] Gauntlet RC: 14+ passes (includes G16)
- [ ] No PHI in DR scripts (verified by G16)
