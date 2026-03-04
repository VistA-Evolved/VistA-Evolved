# Phase 261 — Payer Adapters at Scale — VERIFY

## Phase ID

261 (Wave 8, P5)

## Verifier Script

```powershell
.\scripts\verify-phase261-payer-adapters-scale.ps1
```

## Gates (20)

| #   | Gate                 | What it checks                           |
| --- | -------------------- | ---------------------------------------- |
| G01 | adapter-sdk-exists   | adapter-sdk.ts file exists               |
| G02 | base-payer-adapter   | BasePayerAdapter abstract class exported |
| G03 | rate-limiter         | AdapterRateLimiter class exported        |
| G04 | idempotency-store    | AdapterIdempotencyStore class exported   |
| G05 | metrics-collector    | AdapterMetricsCollector class exported   |
| G06 | sandbox-test-cases   | SANDBOX_TEST_CASES array present         |
| G07 | sha256-idemp         | SHA-256 used for idempotency keys        |
| G08 | sdk-routes-exists    | adapter-sdk-routes.ts file exists        |
| G09 | sdk-adapter-list     | GET /rcm/sdk/adapters endpoint           |
| G10 | sdk-test-cases       | GET /rcm/sdk/test-cases endpoint         |
| G11 | sdk-test-run         | POST /rcm/sdk/test-cases/run endpoint    |
| G12 | sdk-capabilities     | GET /rcm/sdk/capabilities endpoint       |
| G13 | sdk-rate-limits      | GET /rcm/sdk/rate-limits endpoint        |
| G14 | test-file-exists     | Test file present                        |
| G15 | payer-adapter-exists | Existing payer-adapter.ts intact         |
| G16 | connector-resilience | Existing connector-resilience.ts intact  |
| G17 | sandbox-adapter      | Existing sandbox-adapter.ts intact       |
| G18 | prompt-implement     | IMPLEMENT prompt present                 |
| G19 | prompt-verify        | VERIFY prompt present                    |
| G20 | no-phi-in-sdk        | No PHI fields in adapter SDK             |

## Expected Result

20 PASS, 0 FAIL
