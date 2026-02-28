# Phase 216 -- Fix Contract/RPC Drift: Generate Route-RPC Map

## Implementation Steps
1. Create `tools/rpc-extract/build-route-rpc-map.mjs` that:
   - Parses Fastify route registrations (server.get/post/put/delete/patch) from all route files
   - Associates each route handler with the RPC calls inside that handler
   - Cross-references with rpcRegistry.ts for domain/tag metadata
   - Outputs `docs/vista-alignment/route-rpc-map.json` and `route-rpc-map.md`
2. Add `pnpm qa:route-rpc-map` script
3. Create Q216 prompt files

## Files Touched
- tools/rpc-extract/build-route-rpc-map.mjs (new)
- docs/vista-alignment/route-rpc-map.json (generated)
- docs/vista-alignment/route-rpc-map.md (generated)
- package.json (new script)
