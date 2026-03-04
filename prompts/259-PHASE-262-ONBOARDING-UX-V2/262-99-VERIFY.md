# Phase 262 — Onboarding UX v2 — VERIFY

## Phase ID

262 (Wave 8, P6)

## Verifier Script

```powershell
.\scripts\verify-phase262-onboarding-ux-v2.ps1
```

## Gates (20)

| #   | Gate                    | What it checks                           |
| --- | ----------------------- | ---------------------------------------- |
| G01 | integration-steps-store | Store file exists                        |
| G02 | integration-kind-type   | IntegrationKind exported                 |
| G03 | five-kinds              | All 5 kinds present                      |
| G04 | three-steps             | integrations, connectivity, preflight    |
| G05 | create-session          | createIntegrationSession function        |
| G06 | upsert-endpoint         | upsertEndpoint function                  |
| G07 | probe-endpoints         | probeEndpoints function                  |
| G08 | run-preflight           | runPreflight function                    |
| G09 | routes-exist            | Routes file present                      |
| G10 | kinds-endpoint          | GET /admin/onboarding/integrations/kinds |
| G11 | create-endpoint         | POST /admin/onboarding/integrations      |
| G12 | upsert-route            | POST endpoints upsert                    |
| G13 | probe-route             | POST probe                               |
| G14 | preflight-route         | POST preflight                           |
| G15 | advance-route           | POST advance                             |
| G16 | test-file               | Test file present                        |
| G17 | base-store-intact       | onboarding-store.ts untouched            |
| G18 | base-routes-intact      | onboarding-routes.ts untouched           |
| G19 | prompt-implement        | IMPLEMENT prompt                         |
| G20 | prompt-verify           | VERIFY prompt                            |

## Expected Result

20 PASS, 0 FAIL
