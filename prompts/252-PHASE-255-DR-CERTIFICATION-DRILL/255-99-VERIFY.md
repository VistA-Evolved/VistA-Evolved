# Phase 255 -- DR Certification Drill VERIFY

## Verification Gates (30 gates)

### DR Scripts (3 gates)

1. `scripts/dr/backup.mjs` exists
2. `scripts/dr/restore-verify.mjs` exists
3. `scripts/backup-restore.mjs` exists

### Backup Integrity (3 gates)

4. Backup uses pg_dump
5. Backup creates SHA-256 checksums
6. Backup creates manifest

### Restore Verification (5 gates)

7. Schema probes exist
8. Synthetic data probes exist
9. RLS verification exists
10. Drift detection exists
11. Checksum verification exists

### CI Workflow (3 gates)

12. DR nightly CI workflow exists
13. PG service container in CI
14. CI uploads artifacts

### Runbooks (3 gates)

15. disaster-recovery.md exists
16. pg-backup-pitr.md exists
17. incident-pg-outage.md exists

### Gauntlet (1 gate)

18. G16 DR gate exists

### Drill Infrastructure (2 gates)

19. DR drill script exists
20. DR certification checklist exists

### Vitest (2 gates)

21. dr-certification.test.ts exists
22. 8+ describe blocks in test suite

### Production Compose (2 gates)

23. docker-compose.prod.yml exists
24. PG service in prod compose

### Prompt Files (3 gates)

25. 255-01-IMPLEMENT.md exists
26. 255-99-VERIFY.md exists
27. 255-NOTES.md exists

## Run

```powershell
powershell -File scripts/verify-phase255-dr-certification.ps1
```

## Expected: 27+ PASS, 0 FAIL
