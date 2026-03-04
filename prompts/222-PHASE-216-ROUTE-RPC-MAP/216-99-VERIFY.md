# Phase 216 -- Verify: Route-RPC Map

## Verification Steps

1. `node tools/rpc-extract/build-route-rpc-map.mjs` runs without error
2. Output JSON contains route entries with method, path, file, RPCs
3. Output MD is human-readable
4. `pnpm qa:prompts` passes

## Acceptance Criteria

- [ ] Route-RPC map generated with >= 30 route entries
- [ ] Each route entry includes method, path, sourceFile, rpcs[]
- [ ] RPCs cross-referenced with registry metadata
- [ ] No unregistered RPCs found in routes
