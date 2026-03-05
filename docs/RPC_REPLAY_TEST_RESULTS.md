# RPC Replay/Boundary Test Results

**Date:** 2026-03-04  
**Target:** VEHU container (`worldvista/vehu:latest`) on port 9431  
**Script:** `pnpm -C apps/api test:rpc` (vitest, `tests/rpc-boundary.test.ts`)  
**API:** Fastify on `http://localhost:3001`

## Summary: 9/10 PASS, 1 FAIL (timeout)

**Duration:** 50.0s (tests took 49.7s)

### VistA Connectivity (3/3 PASS)

| Test                                        | Status | Duration |
| ------------------------------------------- | ------ | -------- |
| GET /vista/ping confirms VistA reachability | PASS   | 61ms     |
| GET /health reports circuit breaker state   | PASS   | 7ms      |
| GET /ready reports VistA reachability       | PASS   | 3ms      |

### Authenticated RPC Calls (4/5 — 1 FAIL)

| Test                                          | Status   | Duration | Detail                        |
| --------------------------------------------- | -------- | -------- | ----------------------------- |
| Patient search RPC returns structured results | PASS     | 3165ms   |                               |
| Default patient list RPC returns results      | PASS     | 3166ms   |                               |
| Allergies RPC returns structured data         | PASS     | 3123ms   |                               |
| Vitals RPC returns structured data            | PASS     | 3173ms   |                               |
| RPC capability probe returns status           | **FAIL** | 30011ms  | **Test timed out in 30000ms** |

### Error Handling (2/2 PASS)

| Test                                        | Status | Duration |
| ------------------------------------------- | ------ | -------- |
| Invalid DFN returns error without PHI leak  | PASS   | 731ms    |
| Missing DFN param returns appropriate error | PASS   | 2ms      |

## Failure Analysis

### FAIL: RPC capability probe returns status

**File:** `tests/rpc-boundary.test.ts` line 106  
**Endpoint:** `GET /vista/rpc-capabilities`  
**Root Cause:** Test timeout (30s default) vs endpoint execution time (~35s)

The `/vista/rpc-capabilities` endpoint probes 87 unique RPCs against the live VistA instance. Each probe requires an individual RPC call. The sequential probe takes ~35 seconds, exceeding the default vitest timeout of 30 seconds.

**This is NOT a code bug — it is a test configuration issue.**

The endpoint works correctly (verified via direct curl with 90s timeout — returned 64 available, 23 missing).

**Fix options:**

1. Increase test timeout: `it('...', async () => {...}, 120_000)`
2. Pre-warm the capability cache before the test runs
3. Skip this test when running against live VistA (the probe is expensive)
