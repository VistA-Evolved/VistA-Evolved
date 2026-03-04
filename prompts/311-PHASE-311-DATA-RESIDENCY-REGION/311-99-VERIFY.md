# Phase 311 — VERIFY: Data Residency & Region Routing

> Wave 13-P3 verification gates

## Gates

| #   | Gate                          | Check                                          |
| --- | ----------------------------- | ---------------------------------------------- |
| 1   | Data residency module exists  | `platform/data-residency.ts` exists            |
| 2   | DataRegion type has 6 regions | DATA_REGIONS array has 6 entries               |
| 3   | Region catalog complete       | REGION_CATALOG has metadata for all 6          |
| 4   | Immutability enforced         | Route blocks re-assignment                     |
| 5   | Cross-border validation       | validateCrossBorderTransfer exported           |
| 6   | PG URL resolution             | resolveRegionPgUrl handles per-region env vars |
| 7   | Audit bucket resolution       | resolveRegionAuditBucket is region-scoped      |
| 8   | Routes file exists            | data-residency-routes.ts exists                |
| 9   | Transfer agreement types      | DataTransferAgreement interface defined        |
| 10  | Prompts complete              | IMPLEMENT + VERIFY + NOTES exist               |
| 11  | Evidence exists               | evidence file exists                           |

## Run

```powershell
.\scripts\verify-phase311-data-residency-region.ps1
```
