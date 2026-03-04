# Phase 478 — W32-P6: VistA Capability Snapshot

## Goal

Create a unified `/vista/capabilities` API endpoint and offline snapshot
generator script that produces sanitized, PHI-free capability baselines.

## Implementation Steps

1. **Extend `capabilities.ts`** — Add `GET /vista/capabilities` that combines:
   - Live RPC probe results (from `discoverCapabilities`)
   - RPC registry metadata (total registered + exceptions, domain breakdown)
   - Per-domain summaries
   - Snapshot version metadata

2. **Create `scripts/vista-capability-snapshot.mjs`** — Offline script that:
   - Calls `GET /vista/capabilities` on a running API
   - Writes `data/vista/capability-snapshot.json` (latest, overwritten)
   - Writes timestamped archive copy
   - Prints summary to console
   - Supports `--api`, `--refresh`, `--no-timestamp`, `--cookie` flags

3. **Import `getFullRpcInventory`** from `rpcRegistry.ts` in `capabilities.ts`.

## Files Changed

- `apps/api/src/routes/capabilities.ts` — added `/vista/capabilities` endpoint
- `scripts/vista-capability-snapshot.mjs` — new offline snapshot generator

## No PHI

Output contains only RPC names, availability booleans, domain names, and counts.
No patient data, no credentials.
