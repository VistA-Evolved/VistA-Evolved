# Phase 306 — VERIFY — Imaging/PACS Validation (W12-P8)

| # | Gate | Check |
|---|------|-------|
| 1 | img-executor.ts exists | File present |
| 2 | Implements RpcExecutor | execute + dryRun |
| 3 | 2 intents | PLACE_IMAGING, LINK_IMAGING |
| 4 | LOCK/UNLOCK for PLACE | finally pattern |
| 5 | LINK is sidecar (no VistA RPC) | local operation |
| 6 | Barrel exports imgExecutor | index.ts |
| 7 | Contract tests exist | img-contract.test.ts |
| 8 | No PHI | No SSN/DOB/creds |
