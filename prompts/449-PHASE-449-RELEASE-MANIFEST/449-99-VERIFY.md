# Phase 449 — VERIFY

## Gates

| #   | Gate                     | Check                                                                             |
| --- | ------------------------ | --------------------------------------------------------------------------------- |
| 1   | Schema valid             | JSON Schema is valid Draft-07                                                     |
| 2   | Emitter runs             | `node scripts/upstream/emit-release-manifest.mjs` exits 0                         |
| 3   | Manifest shape           | Output contains required fields (schemaVersion, buildSha, upstreamShas, rpcCount) |
| 4   | build-images integration | `build-images.ps1` references manifest emitter                                    |
