# Phase 323 — W14-P7: Integration Certification Pipeline

## User Request
Build a certification pipeline that validates partner integrations meet
conformance requirements before promotion to production.

## Implementation Steps
1. **Service layer** (`services/certification-pipeline.ts`):
   - CertificationSuite: reusable test suite definitions (HL7v2, X12, FHIR, transport, security, performance)
   - CertificationRun: execute suites against partner endpoints, record per-test results
   - ConformanceScore: weighted scoring with per-category minimums and blocking tests
   - IntegrationCertificate: issuance, verification (SHA-256 fingerprints), revocation, suspension
   - Built-in seed suites: HL7v2 ADT Conformance, X12 837 Claim Submission, FHIR R4 Conformance
   - Stats dashboard aggregation

2. **Routes** (`routes/certification-pipeline.ts`):
   - Suite CRUD: POST create, GET list, GET :id, POST activate, POST deprecate
   - Runs: POST start, POST record-result, POST complete, GET :runId, GET list
   - Certificates: POST issue, GET :id, GET list, GET verify, POST revoke, POST suspend, POST reinstate
   - Stats: GET /certification/stats

3. **Wiring**:
   - register-routes.ts: import + server.register
   - security.ts: `/certification/` → admin auth
   - store-policy.ts: 3 entries (suites/registry, runs/cache, certificates/critical)

## Verification Steps
- `npx tsc --noEmit` — zero errors
- All 16 endpoints properly registered
- Fingerprint tamper detection via SHA-256
- Built-in suites seeded on first load (3 suites, 18 test cases total)

## Files Touched
- `apps/api/src/services/certification-pipeline.ts` (NEW)
- `apps/api/src/routes/certification-pipeline.ts` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/middleware/security.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
