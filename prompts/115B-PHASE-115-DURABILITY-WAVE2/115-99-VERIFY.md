# Phase 115-99: VERIFY -- Durability Wave 2

## Verification command

```powershell
.\scripts\verify-phase115-durability-wave2.ps1
```

## Gates (35 checks)

1. **Schema gates (7)**: All 7 tables defined in `schema.ts`
2. **DDL gate (1)**: All 7 CREATE TABLE blocks in `migrate.ts`
3. **Repo file gates (6)**: All 6 repo files exist
4. **Barrel export gate (1)**: `repo/index.ts` exports all 6
5. **Init function gates (6)**: Each store has `initXxxRepo` export
6. **Wiring gates (6)**: `index.ts` has all 6 wiring blocks
7. **Cache rename gates (4)**: Primary stores renamed to `*Cache`
8. **No em-dash gate (1)**: BUG-055 compliance

## Pass criteria

All 35 gates PASS. No TypeScript compile errors.

## TypeScript check

```powershell
cd apps/api; npx tsc --noEmit
```
