# Phase 46 Verification Report -- National Gateway Packs

**Date:** 2026-02-20
**Commit under test:** d04b4d1 (Phase46: national gateway packs)
**Verifier:** Copilot automated

---

## Summary

| Gate | Description | Result |
|------|-------------|--------|
| G46-1 | PhilHealth eClaims 3.0 posture | **PASS** |
| G46-2 | AU ECLIPSE posture | **PASS** |
| G46-3 | SG NPHC posture | **PASS** |
| G46-4 | NZ ACC posture | **PASS** |
| G46-5 | Security / regression | **PASS** |

**Overall: 5/5 PASS**

---

## G46-1 PhilHealth eClaims 3.0 Posture

### Readiness dashboard exists
- **PASS** -- `GatewaysTab` component in `apps/web/src/app/cprs/admin/rcm/page.tsx` (line 1716)
- Tab registered as `{ id: 'gateways', label: 'Gateway Readiness' }` (line 52)
- Rendered at `{tab === 'gateways' && <GatewaysTab />}` (line 102)
- Fetches from `/rcm/gateways/readiness` and `/rcm/conformance/gateways`

### Probes verify config/certs/endpoint placeholders
- **PASS** -- `probePhilHealth()` in `apps/api/src/rcm/gateways/readiness.ts` (line 67)
- Checks 7 items: `PHILHEALTH_FACILITY_CODE` (required), `PHILHEALTH_API_TOKEN` (required), `PHILHEALTH_API_ENDPOINT` (optional), `PHILHEALTH_CERT_PATH` (required), `PHILHEALTH_CERT_KEY_PATH` (required), `PHILHEALTH_SOA_SIGNING_KEY` (optional), production mode flag
- Each check returns green/amber/red with remediation guidance

### SOA generator interface exists and explicitly blocks scanned PDF flows
- **PASS** -- `apps/api/src/rcm/gateways/soa-generator.ts` (219 lines)
- `isScannedPdf()` detects `%PDF` magic bytes and `JVBERi` base64 header
- `PhilHealthConnector.submit()` calls `isScannedPdf(payload)` and returns error code `PH-SOA-FORMAT-INVALID` on match
- `generateElectronicSoa()` produces structured JSON SOA with HMAC-SHA256 signing
- `validateSoaInput()` validates 10+ required fields
- `verifySoaSignature()` for integrity checking

### Docs mention disable by Mar 31 2026 and mandatory Apr 1 2026
- **PASS** -- Deadlines in code:
  - `readiness.ts` line 98: `{ date: '2026-03-31', description: 'eClaims 2.5 and earlier DISABLED' }`
  - `readiness.ts` line 99: `{ date: '2026-04-01', description: 'eClaims 3.0 REQUIRED for all submissions' }`
- Runbook `docs/runbooks/rcm-philhealth-eclaims3-enrollment.md` lines 88-89 repeat both dates
- Test `gateway-packs.test.ts` line 107 asserts `2026-03-31` deadline present

---

## G46-2 AU ECLIPSE Posture

### Enrollment packet + runbook exists
- **PASS** -- `docs/runbooks/rcm-au-eclipse-enrollment.md` (96 lines)
- Covers: PRODA registration, device creation, PKI cert, Medicare provider number, HPI-I, test environment, go-live
- Prerequisite table lists 6 env vars: `ECLIPSE_PRODA_ORG_ID`, `ECLIPSE_DEVICE_NAME`, `ECLIPSE_CERT_PATH`, `ECLIPSE_PROVIDER_NUMBER`, `ECLIPSE_HPI_I`, `ECLIPSE_API_ENDPOINT`

### Readiness probe exists
- **PASS** -- `probeEclipse()` in `readiness.ts` (line 115)
- Checks 6 items: PRODA org ID, device name, PKI cert, API endpoint, provider number, HPI-I
- Connector `eclipse-au-connector.ts` enhanced with PRODA enrollment guidance in doc header (7-step process)
- `healthCheck()` lists specific missing config items

---

## G46-3 SG NPHC Posture

### Enrollment/access runbook exists
- **PASS** -- `docs/runbooks/rcm-sg-nphc-access.md` (97 lines)
- Covers: CorpPass registration, MOH API access, NRIC authorization, facility license, sandbox testing, go-live
- Prerequisite table lists 5 env vars: `NPHC_CORPPASS_CLIENT_ID`, `NPHC_CORPPASS_SECRET`, `NPHC_FACILITY_LICENSE`, `NPHC_USER_NRIC_HASH`, `NPHC_API_ENDPOINT`

### Readiness probe exists
- **PASS** -- `probeNphc()` in `readiness.ts` (line 148)
- Checks 5 items: CorpPass client ID, CorpPass secret, facility license, API endpoint, user NRIC hash
- Connector `nphc-sg-connector.ts` enhanced with 6-step enrollment process in doc header
- `healthCheck()` lists specific missing items and warns about missing NRIC hash

---

## G46-4 NZ ACC Posture

### Connector models create/park and throttle-safe retry semantics
- **PASS** -- `acc-nz-connector.ts` documents create/park/submit workflow:
  - Line 20-24: `POST /claims/v2 -> create`, `PUT /claims/v2/{claimNo} -> update`, `POST .../submit -> submit`
  - Rate limit constants: `rateLimitPerMinute = 50`, `maxRetries = 3`, `baseRetryDelayMs = 1000`
  - Submit metadata includes workflow type, rate limit, and retry info
  - `healthCheck()` reports workflow type and rate limit
- Readiness probe `probeAcc()` checks 5 items including sandbox environment

### Runbook exists
- **PASS** -- `docs/runbooks/rcm-nz-acc-claim-api.md` (113 lines)
- Covers: provider registration, OAuth2 setup, create/park/submit workflow, rate limiting, NHI numbers, sandbox testing
- Prerequisite table lists 5 env vars: `ACC_NZ_CLIENT_ID`, `ACC_NZ_CLIENT_SECRET`, `ACC_NZ_PROVIDER_ID`, `ACC_NZ_API_ENDPOINT`, `ACC_NZ_SANDBOX_ENDPOINT`

---

## G46-5 Security / Regression

### tsc --noEmit
- **PASS** -- Clean exit (0 errors)

### vitest run
- **PASS** -- 184 tests passed, 7 test files, 0 failures
- Phase 46 test file: `gateway-packs.test.ts` -- 33 tests across 7 describe blocks

### PHI log scan
- **PASS** -- 0 `console.log` in Phase 46 files
- Runtime source: 2 acceptable occurrences (OTel bootstrap in `register.ts`)
- Remaining 20 in offline CLI tools (`tools/` directory) -- exempt

### Secret scan
- **PASS** -- No `PROV123`, `PHARM123`, or `NURSE123` in any Phase 46 file
- Existing occurrences all in exempted locations: `config.ts` (comment), `login/page.tsx` (NODE_ENV-gated), `tools/` (offline), `logger.test.ts` (test)

---

## Files Verified

### New files (Phase 46)
| File | Lines | Purpose |
|------|-------|---------|
| `apps/api/src/rcm/gateways/readiness.ts` | 284 | Gateway readiness model + probes |
| `apps/api/src/rcm/gateways/soa-generator.ts` | 219 | Electronic SOA generator + PDF blocker |
| `apps/api/src/rcm/conformance/gateway-conformance.ts` | ~300 | Per-gateway conformance data |
| `apps/api/tests/gateway-packs.test.ts` | ~340 | 33 tests |
| `docs/runbooks/rcm-philhealth-eclaims3-enrollment.md` | 96 | PH enrollment |
| `docs/runbooks/rcm-philhealth-electronic-soa.md` | ~80 | PH electronic SOA |
| `docs/runbooks/rcm-au-eclipse-enrollment.md` | 96 | AU enrollment |
| `docs/runbooks/rcm-sg-nphc-access.md` | 97 | SG enrollment |
| `docs/runbooks/rcm-nz-acc-claim-api.md` | 113 | NZ API guide |

### Modified files (Phase 46)
| File | Changes |
|------|---------|
| `apps/api/src/rcm/connectors/philhealth-connector.ts` | eClaims 3.0 upgrade, scanned PDF rejection, cert probes |
| `apps/api/src/rcm/connectors/eclipse-au-connector.ts` | PRODA enrollment, provider number, HPI-I config |
| `apps/api/src/rcm/connectors/nphc-sg-connector.ts` | CorpPass enrollment, NRIC hash config |
| `apps/api/src/rcm/connectors/acc-nz-connector.ts` | Create/park/submit workflow, rate limiting |
| `apps/api/src/rcm/audit/rcm-audit.ts` | +5 gateway audit actions |
| `apps/api/src/rcm/rcm-routes.ts` | +6 gateway/conformance routes |
| `apps/web/src/app/cprs/admin/rcm/page.tsx` | +GatewaysTab component |

---

## Test Breakdown

| Describe Block | Tests |
|----------------|-------|
| Gateway Readiness | 7 |
| SOA Generator | 8 |
| Conformance Harness | 8 |
| PhilHealth Connector (eClaims 3.0) | 4 |
| ECLIPSE AU Connector | 2 |
| NPHC SG Connector | 1 |
| ACC NZ Connector | 3 |
| **Total** | **33** |

Full suite: 184 tests, 7 files, all passing.
