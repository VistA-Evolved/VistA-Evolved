# Phase 126 VERIFY -- RCM Durability Wave

## Verification Steps

1. TypeCheck: `pnpm -C apps/api exec tsc --noEmit` -- 0 errors
2. Restart durability gate: `node scripts/qa-gates/restart-durability.mjs` -- all PASS
3. Gauntlet FAST: `node qa/gauntlet/cli.mjs --suite fast` -- all gates PASS
4. Gauntlet RC (if PG available): `node qa/gauntlet/cli.mjs --suite rc` -- all gates PASS
5. Manual: confirm migration v10 applies on PG startup
6. Manual: confirm ack/status/pipeline write-through logs on API start

## Gates

- PG schema: 6 new tables in pg-schema.ts
- PG migration v10: 6 CREATE TABLE + indexes
- RLS: 6 new tables in applyRlsPolicies()
- PG repos: 4 new files with correct async exports
- Barrel: 4 new exports in pg/repo/index.ts
- ack-status-processor: initAckStatusRepo + write-through
- pipeline: initPipelineRepo + write-through
- index.ts: 4 new PG re-wire blocks
- restart-durability gate: 50+ Phase 126 checks
- phase-manifest: Phase 126 entry with rcm/durability/postgres tags
