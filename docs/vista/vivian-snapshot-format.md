# Vivian Snapshot Format

> How VistA-Evolved stores and updates its canonical RPC reference index.

## Source

The WorldVistA **Vivian/DOX** project maintains a comprehensive index of all
VistA packages, RPCs, routines, and file structures:

- **Vivian Data**: https://vivian.worldvista.org/vivian-data
- **DOX Browser**: https://vivian.worldvista.org/dox

## Files

| File                                                   | Purpose                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `docs/grounding/vivian-index.json`                     | Raw snapshot (90K lines, 200 packages, 3,700+ RPCs, HL7 interfaces, dependencies) |
| `scripts/vivian_snapshot.ts`                           | Fetcher/updater tool that pulls fresh data from Vivian                            |
| `data/vista/vivian/rpc_index.json`                     | Normalized flat RPC list (deduplicated, sorted, sanitized)                        |
| `data/vista/vivian/rpc_index.hash`                     | SHA-256 hash of rpc_index.json for change detection                               |
| `apps/api/src/tools/vivian/normalizeVivianSnapshot.ts` | Normalizer tool                                                                   |

## rpc_index.json Schema

```json
{
  "_meta": {
    "generatedAt": "ISO-8601",
    "source": "docs/grounding/vivian-index.json",
    "description": "Normalized deduplicated RPC index from WorldVistA Vivian/DOX",
    "totalRpcs": 3747,
    "tool": "apps/api/src/tools/vivian/normalizeVivianSnapshot.ts"
  },
  "rpcs": [
    { "name": "ACKQAUD1", "package": "QUASAR" },
    { "name": "ACKQAUD2", "package": "QUASAR" },
    ...
  ]
}
```

Each RPC entry contains:

- **name**: Canonical RPC name as registered in VistA File 8994
- **package**: VistA package prefix (namespace) that owns the RPC

## How to Update

1. **Re-fetch from Vivian** (when the remote index changes):

   ```bash
   cd apps/api
   npx tsx ../../scripts/vivian_snapshot.ts
   ```

   This updates `docs/grounding/vivian-index.json`.

2. **Re-normalize** (after fetching):

   ```bash
   cd apps/api
   npx tsx src/tools/vivian/normalizeVivianSnapshot.ts
   ```

   This regenerates `data/vista/vivian/rpc_index.json` and `.hash`.

3. **Re-run coverage matrix** (after normalizing):
   ```bash
   cd apps/api
   npx tsx src/tools/vista/buildRpcCoverageMatrix.ts --api http://127.0.0.1:3001
   ```
   This regenerates `data/vista/vista_instance/rpc_*.json` and `docs/vista/rpc-coverage-report.md`.

## Sanitization Rules

The normalizer strips:

- SSN patterns (###-##-####)
- IPv4 addresses
- Password/secret/token/credential strings
- Known sandbox credentials (PROV123, etc.)

Only `name` and `package` fields are emitted per RPC.

## Verification

The Phase 41 verifier (`scripts/verify-phase41-rpc-catalog.ps1`) checks:

- `rpc_index.json` exists and has 3,000+ entries
- Hash file matches content
- All RPCs in `rpcRegistry.ts` are in the Vivian index or `RPC_EXCEPTIONS`
- All RPCs in `actionRegistry.ts` are in `rpcRegistry.ts`
