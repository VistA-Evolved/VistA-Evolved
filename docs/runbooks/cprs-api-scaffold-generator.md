# Runbook: CPRS API Scaffold Generator (Phase 10D)

## Purpose

A code generator that reads `rpc_catalog.json` and produces typed Fastify route
stubs per clinical domain. Each RPC gets its own endpoint that returns a
"not implemented" stub response until the actual RPC call logic is wired in.

This creates the skeleton for 404 RPC endpoints across 6 domains, giving
every CPRS RPC a discoverable API surface.

## Inputs

| Input            | Path                                            | Notes                   |
| ---------------- | ----------------------------------------------- | ----------------------- |
| RPC catalog      | `design/contracts/cprs/v1/rpc_catalog.json`     | 975 RPCs from Phase 10A |
| Screen registry  | `design/contracts/cprs/v1/screen_registry.json` | Screen → RPC mapping    |
| Generator script | `tools/cprs-extract/generate-api-stubs.mjs`     | Node ESM script         |

## Commands

```powershell
# Generate all route stub files
pnpm run cprs:generate-stubs
```

This executes `node tools/cprs-extract/generate-api-stubs.mjs`, which:

1. Reads `rpc_catalog.json`
2. Classifies RPCs into 6 domains by name prefix
3. Generates one Fastify route plugin per domain
4. Generates a barrel `index.ts` that registers all plugins

## Domain Classification

| Domain   | Prefix(es)                    | RPC Count |
| -------- | ----------------------------- | --------- |
| problems | `ORQQPL*`                     | 25        |
| meds     | `ORWPS*`, `ORWDPS*`           | 59        |
| notes    | `TIU*`, `ORWTIU*`             | 111       |
| orders   | `ORWDX*`, `ORWOR*`, `ORWORR*` | 135       |
| labs     | `ORWLRR*`, `ORWDLR*`          | 36        |
| reports  | `ORWRP*`, `ORWSR*`            | 38        |

## Expected Outputs

All files generated in `apps/api/src/routes/`:

| File          | Description                                               |
| ------------- | --------------------------------------------------------- |
| `index.ts`    | Barrel — `registerDomainRoutes()` registers all 6 plugins |
| `problems.ts` | 25 RPC stubs + catalog endpoint                           |
| `meds.ts`     | 59 RPC stubs + catalog endpoint                           |
| `notes.ts`    | 111 RPC stubs + catalog endpoint                          |
| `orders.ts`   | 135 RPC stubs + catalog endpoint                          |
| `labs.ts`     | 36 RPC stubs + catalog endpoint                           |
| `reports.ts`  | 38 RPC stubs + catalog endpoint                           |

### Route patterns

Each domain provides:

- `GET /vista/{domain}/rpcs` — lists all RPCs in the domain
- `GET /vista/{domain}/rpc/{slug}` — individual RPC stub

### Stub response format

```json
{
  "ok": false,
  "error": "Not implemented",
  "rpcName": "ORQQPL PROBLEM LIST",
  "domain": "problems",
  "slug": "orqqpl-problem-list",
  "hint": "Wire this stub: import { connect, callRpc, disconnect } from '../vista/rpcBrokerClient'"
}
```

## Validation

```powershell
# 1. Generator runs clean
pnpm run cprs:generate-stubs
# Should print "Done — 6 domain route files + index generated."

# 2. TypeScript build succeeds
pnpm -C apps/api build
# Exit code 0 = pass

# 3. All route files exist
@(
  "apps/api/src/routes/index.ts",
  "apps/api/src/routes/problems.ts",
  "apps/api/src/routes/meds.ts",
  "apps/api/src/routes/notes.ts",
  "apps/api/src/routes/orders.ts",
  "apps/api/src/routes/labs.ts",
  "apps/api/src/routes/reports.ts"
) | ForEach-Object {
  Write-Host "$_ : $(Test-Path $_)"
}

# 4. Spot-check: problems.ts contains expected RPC
(Get-Content apps/api/src/routes/problems.ts -Raw) -match 'ORQQPL PROBLEM LIST'
```

## Common Failures

| Symptom                                | Cause                   | Fix                                                     |
| -------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `ENOENT rpc_catalog.json`              | Contracts not generated | Run `pnpm run cprs:extract` first                       |
| TypeScript build error in routes       | Fastify types missing   | Run `pnpm -C apps/api install`                          |
| 0 RPCs classified                      | Prefix rules changed    | Check `DOMAIN_RULES` in `generate-api-stubs.mjs`        |
| Route conflict with existing endpoints | Slug collision          | Generator uses domain-scoped paths — should not collide |

## Wiring a Stub (next steps)

To implement an actual RPC call, replace the stub body in the route file:

```typescript
// Before (stub):
server.get("/vista/problems/rpc/orqqpl-problem-list", async (): Promise<StubResponse> => {
  return { ok: false, error: "Not implemented", ... };
});

// After (wired):
server.get("/vista/problems/rpc/orqqpl-problem-list", async (request) => {
  const dfn = (request.query as any)?.dfn;
  await connect();
  const lines = await callRpc("ORQQPL PROBLEM LIST", [String(dfn)]);
  disconnect();
  return { ok: true, results: lines };
});
```

> **Warning:** Generated route files have a "DO NOT EDIT BY HAND" header.
> Once you wire a stub, consider moving it out of the generated file into a
> hand-maintained route module to avoid overwrites on re-generation.

## No VA Terminology Check

Route paths use generic domain names (`problems`, `meds`, `notes`, etc.).
RPC names are VistA-native technical identifiers (e.g., `ORQQPL`, `TIU`),
not VA branding. No terminology changes needed.

## Related Prompts

- [12-07-Phase10D-API-Scaffold-Generator-IMPLEMENT.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-07-Phase10D-API-Scaffold-Generator-IMPLEMENT.md)
- [12-08-Phase10D-API-Scaffold-Generator-VERIFY.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-08-Phase10D-API-Scaffold-Generator-VERIFY.md)
