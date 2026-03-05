# Phase 575 — Verification

## Gate 1: Migration v60 exists

```bash
grep "version: 60" apps/api/src/platform/pg/pg-migrate.ts
```

## Gate 2: All tables in CANONICAL_RLS_TABLES

```bash
grep "intake_brain_state\|mha_administration\|cp_result\|device_alarm" apps/api/src/platform/pg/pg-migrate.ts | grep -v "CREATE"
```

## Gate 3: TypeScript compiles

```bash
cd apps/api && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
