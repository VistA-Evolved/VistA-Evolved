# Phase 147 -- Scheduling Realism Pack (VERIFY)

## Gate checks

### Gate 1: TypeScript compiles clean
- `pnpm -C apps/api exec tsc --noEmit` => 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` => 0 errors

### Gate 2: SDES RPCs in registry
- rpcRegistry.ts has 19+ new scheduling RPCs (SDES x11, SDVW x2, SD W/L ref x3, ORWPT x1)
- All have matching RPC_EXCEPTIONS entries

### Gate 3: Adapter interface + implementations match
- interface.ts has 6 new types + 6 new methods
- vista-adapter.ts implements all 6 methods
- stub-adapter.ts implements all 6 methods

### Gate 4: Scheduling routes registered
- 6 new Phase 147 endpoints in scheduling routes (31 total)
- GET /scheduling/appointment-types
- GET /scheduling/cancel-reasons
- GET /scheduling/clinic/:ien/resource
- GET /scheduling/sdes-availability
- GET /scheduling/verify/:ref
- GET /scheduling/mode

### Gate 5: Portal UX updated
- appointments/page.tsx shows writeback mode badge
- Mode badge fetches from /api/scheduling/mode

### Gate 6: ZVESDSEED.m exists
- services/vista/ZVESDSEED.m present and well-formed
- Has EN, CLINICS, APPTTYPES, APPTS, VERIFY entry points

### Gate 7: Immutable audit
- scheduling.truth_gate in ImmutableAuditAction type

### Gate 8: Gauntlet RC
- 0 FAIL gates
