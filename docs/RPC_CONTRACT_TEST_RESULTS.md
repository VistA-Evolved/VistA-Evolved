# RPC Contract Test Results

**Date:** 2026-03-04  
**Target:** VEHU container (`worldvista/vehu:latest`) on port 9431  
**Script:** `pnpm -C apps/api test:contract` (vitest, `tests/contract.test.ts`)  
**API:** Fastify on `http://localhost:3001`

## Summary: 27/27 PASS

**Duration:** 34.0s (tests took 33.8s, includes VistA RPC round-trips)

### Public Endpoints (5/5 PASS)

| Test                                               | Status | Duration |
| -------------------------------------------------- | ------ | -------- |
| GET /health returns 200 with ok:true               | PASS   | 55ms     |
| GET /ready returns 200 with vista status           | PASS   | 5ms      |
| GET /version returns build metadata                | PASS   | 2ms      |
| GET /vista/ping returns connectivity status        | PASS   | 3ms      |
| GET /metrics/prometheus returns Prometheus metrics | PASS   | 5ms      |

### Auth-Required Endpoints Return 401 Without Session (8/8 PASS)

| Test                                        | Status | Duration |
| ------------------------------------------- | ------ | -------- |
| GET /vista/patient-search?q=test → 401      | PASS   | 2ms      |
| GET /vista/patient-demographics?dfn=3 → 401 | PASS   | 2ms      |
| GET /vista/allergies?dfn=3 → 401            | PASS   | 2ms      |
| GET /vista/vitals?dfn=3 → 401               | PASS   | 3ms      |
| GET /vista/medications?dfn=3 → 401          | PASS   | 2ms      |
| GET /vista/notes?dfn=3 → 401                | PASS   | 2ms      |
| GET /vista/problems?dfn=3 → 401             | PASS   | 2ms      |
| GET /vista/default-patient-list → 401       | PASS   | 2ms      |

### Authenticated Endpoint Contracts (9/9 PASS)

| Test                                                   | Status | Duration |
| ------------------------------------------------------ | ------ | -------- |
| GET /auth/session returns session info                 | PASS   | 2ms      |
| GET /auth/session without cookie returns ok:false      | PASS   | 1ms      |
| GET /vista/patient-search?q=ZZ returns results array   | PASS   | 3179ms   |
| GET /vista/allergies?dfn=3 returns results array       | PASS   | 3139ms   |
| GET /vista/vitals?dfn=3 returns results array          | PASS   | 3183ms   |
| GET /vista/problems?dfn=3 returns problems shape       | PASS   | 5177ms   |
| GET /vista/medications?dfn=3 returns medications shape | PASS   | 3178ms   |
| GET /vista/notes?dfn=3 returns notes shape             | PASS   | 3198ms   |
| GET /vista/default-patient-list returns results array  | PASS   | 3175ms   |

### PHI Leak Prevention (2/2 PASS)

| Test                                        | Status | Duration |
| ------------------------------------------- | ------ | -------- |
| Error responses do not contain stack traces | PASS   | 1ms      |
| 404 response is clean JSON                  | PASS   | 1ms      |

### Auth Flow (3/3 PASS)

| Test                                                        | Status | Duration |
| ----------------------------------------------------------- | ------ | -------- |
| POST /auth/login with valid creds returns session           | PASS   | 3124ms   |
| POST /auth/login with bad creds returns error (no PHI leak) | PASS   | 34ms     |
| POST /auth/logout destroys session                          | PASS   | 3134ms   |

## Notes

- All authenticated tests use VEHU credentials (PRO1234/PRO1234!!)
- Each authenticated request takes ~3s due to VistA RPC round-trip (auth + RPC call)
- Problems endpoint is slowest at ~5.2s (likely larger data set)
- Previous failure (Session 9) was due to wrong credentials — test defaults to PROV123 but VEHU needs PRO1234. Fixed by setting env vars before running.
