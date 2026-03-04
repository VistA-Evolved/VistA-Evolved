# Phase 302 — VERIFY — Orders Writeback Core (W12-P4)

## Verification Gates

| #   | Gate                             | Check                                    |
| --- | -------------------------------- | ---------------------------------------- |
| 1   | orders-executor.ts exists        | File present                             |
| 2   | Implements RpcExecutor interface | Has execute() and dryRun()               |
| 3   | 5 intents mapped                 | PLACE, DISCONTINUE, VERIFY, SIGN, FLAG   |
| 4   | ORWDX LOCK/UNLOCK pattern        | PLACE, DISCONTINUE, SIGN all LOCK+UNLOCK |
| 5   | VERIFY_ORDER has no LOCK         | Only ORWDXA VERIFY                       |
| 6   | FLAG_ORDER has no LOCK           | Only ORWDXA FLAG                         |
| 7   | esCode hashed for SIGN_ORDER     | SHA-256 hash, not raw                    |
| 8   | Error classification             | permanent vs transient in throw          |
| 9   | Barrel re-exports ordersExecutor | executors/index.ts updated               |
| 10  | Contract tests exist             | orders-contract.test.ts present          |
| 11  | Contract tests pass              | vitest runs clean                        |
| 12  | No PHI in executor               | No SSN/DOB/patient names                 |

## Script

```powershell
scripts/verify-phase302-orders-writeback.ps1
```
