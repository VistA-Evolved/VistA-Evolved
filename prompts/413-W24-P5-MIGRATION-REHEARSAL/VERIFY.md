# Phase 413 — W24-P5: Data Migration Rehearsal Program — VERIFY

## Gates

1. `scripts/migrate-rehearsal.ps1` exists
2. Dry-run mode passes with `-SkipLive`: 0 failures
3. Evidence JSON produced at `evidence/wave-24/413-migration/`
4. Migration script validates idempotency (ON CONFLICT)
5. Rollback path validated (DR env + backup restore)

## Verification Command

```powershell
.\scripts\migrate-rehearsal.ps1 -Mode dry-run -SkipLive
```

Must exit with code 0.
