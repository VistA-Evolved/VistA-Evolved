# 12-03 — API Scaffold Generator (IMPLEMENT)

## User Request
In apps/api, add a scaffold generator that reads `design/contracts/cprs/v1/rpc_catalog.json`
and creates typed endpoint stubs per domain (problems, meds, notes, orders, labs, reports).
Each stub calls the existing rpcBrokerClient with the correct RPC name and params placeholder.
Include a "not implemented" response until wired.

## Implementation Steps

1. **Create generator script** — `tools/cprs-extract/generate-api-stubs.mjs`
   - Reads `rpc_catalog.json` + `screen_registry.json`
   - Groups RPCs by domain using prefix-based classification:
     - problems → `ORQQPL*`
     - meds → `ORWPS*`, `ORWDPS*`
     - notes → `TIU*`, `ORWTIU*`
     - orders → `ORWDX*`, `ORWOR*`, `ORWORR*`
     - labs → `ORWLRR*`, `ORWDLR*`
     - reports → `ORWRP*`, `ORWSR*`
   - Generates one TypeScript route file per domain under `apps/api/src/routes/`
   - Each file exports a Fastify plugin with typed stubs per RPC

2. **Generated route files** — `apps/api/src/routes/{domain}.ts`
   - Import `connect`, `disconnect`, `callRpc` from `../vista/rpcBrokerClient`
   - Each RPC gets a GET endpoint: `/vista/{domain}/rpc/{rpc-slug}`
   - Returns `{ ok: false, error: "Not implemented", rpcName, domain, params: [] }`
   - Typed interfaces for request/response

3. **Route index** — `apps/api/src/routes/index.ts`
   - Barrel export registering all domain plugins

4. **Wire into server** — Update `apps/api/src/index.ts`
   - Import and register the route plugins

5. **npm script** — `cprs:generate-stubs` in root package.json

## Files Touched
- `tools/cprs-extract/generate-api-stubs.mjs` (new)
- `apps/api/src/routes/problems.ts` (generated)
- `apps/api/src/routes/meds.ts` (generated)
- `apps/api/src/routes/notes.ts` (generated)
- `apps/api/src/routes/orders.ts` (generated)
- `apps/api/src/routes/labs.ts` (generated)
- `apps/api/src/routes/reports.ts` (generated)
- `apps/api/src/routes/index.ts` (generated)
- `apps/api/src/index.ts` (modified — register route plugins)
- `package.json` (modified — add script)
- `prompts/12-PHASE-10-CPRS-EXTRACT/12-03-api-scaffold-IMPLEMENT.md` (this file)

## Verification
- `pnpm run cprs:generate-stubs` completes without errors
- `pnpm -C apps/api build` compiles clean
- Generated files contain correct RPC names per domain
