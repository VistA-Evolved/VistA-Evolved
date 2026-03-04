# Phase 305 — VERIFY — Inpatient ADT Writeback (W12-P7)

| #   | Gate                       | Check                      |
| --- | -------------------------- | -------------------------- |
| 1   | adt-executor.ts exists     | File present               |
| 2   | Implements RpcExecutor     | execute + dryRun           |
| 3   | 3 intents mapped           | ADMIT, TRANSFER, DISCHARGE |
| 4   | All integration-pending    | throws with vistaGrounding |
| 5   | vistaGrounding metadata    | DGPM routines, File 405    |
| 6   | Barrel exports adtExecutor | index.ts updated           |
| 7   | Contract tests exist       | adt-contract.test.ts       |
| 8   | No PHI                     | No SSN/DOB/creds           |
