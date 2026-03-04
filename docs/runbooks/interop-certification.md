# Interop Certification Harness -- Runbook (Phase 290)

> **Purpose**: Validate FHIR R4, SMART-on-FHIR, and HL7v2 conformance via
> automated test suites that produce machine-readable JSON evidence.

---

## 1. Overview

The interop certification harness comprises three test suites, an
orchestrator script, and a shared assertion library:

| Suite            | File                                 | What it tests                                      |
| ---------------- | ------------------------------------ | -------------------------------------------------- |
| FHIR conformance | `tests/interop/fhir-conformance.mjs` | CapabilityStatement, resource search, content-type |
| SMART readiness  | `tests/interop/smart-readiness.mjs`  | .well-known discovery, OAuth endpoints, scopes     |
| HL7 pack suite   | `tests/interop/hl7-pack-suite.mjs`   | Pack list/detail, validation, template, pipeline   |

Shared: `tests/interop/assertions/fhir-assertions.mjs` (7 exported helpers).

Orchestrator: `tests/interop/run-interop-suite.ps1`.

---

## 2. Prerequisites

- Node.js >= 18 (uses native `fetch`)
- API running (default `http://localhost:3001`)
- Optional: VistA Docker for live RPC-backed responses
- Optional: Keycloak for OIDC/SMART endpoint testing

---

## 3. Running the Suites

### All suites at once

```powershell
.\tests\interop\run-interop-suite.ps1
```

### Single suite

```powershell
.\tests\interop\run-interop-suite.ps1 -Suite fhir
.\tests\interop\run-interop-suite.ps1 -Suite smart
.\tests\interop\run-interop-suite.ps1 -Suite hl7
```

### Against a different API

```powershell
.\tests\interop\run-interop-suite.ps1 -ApiUrl http://staging:3001
```

### Custom output directory

```powershell
.\tests\interop\run-interop-suite.ps1 -OutDir ./artifacts/interop
```

---

## 4. Output Format

Each suite writes a JSON results file:

```json
{
  "passed": 8,
  "failed": 2,
  "total": 10,
  "results": [
    { "name": "GET /fhir/r4/metadata returns 200", "passed": true, "detail": "..." },
    { "name": "fhirVersion is 4.0.x", "passed": false, "detail": "Got fhirVersion: undefined" }
  ]
}
```

The orchestrator writes `interop-manifest.json` combining all suite results.

---

## 5. Integration-Pending Results

Endpoints that are not yet implemented return `"integration-pending"`
markers rather than hard failures. These are expected in the sandbox
environment and will become hard-pass requirements for production
certification.

---

## 6. CI Integration

### GitHub Actions

```yaml
- name: Interop certification
  run: |
    node tests/interop/fhir-conformance.mjs --api ${{ env.API_URL }} --out artifacts/fhir.json
    node tests/interop/smart-readiness.mjs --api ${{ env.API_URL }} --out artifacts/smart.json
    node tests/interop/hl7-pack-suite.mjs --api ${{ env.API_URL }} --out artifacts/hl7.json
```

### Expected exit codes

| Code | Meaning                             |
| ---- | ----------------------------------- |
| 0    | All assertions passed               |
| 1    | At least one assertion failed       |
| 2    | Fatal error (network, script crash) |

---

## 7. Extending the Harness

1. Add test functions to the appropriate suite file
2. Push results to the `results` array using assertion helpers
3. Run `summarize(results)` for JSON-compatible output
4. If adding a new suite, register it in `run-interop-suite.ps1`

### Assertion helpers

```javascript
import {
  assert,
  assertJsonResponse,
  assertResourceType,
  assertSupportsResource,
  assertBundle,
  summarize,
} from './assertions/fhir-assertions.mjs';
```

---

## 8. Known Gaps

| Gap                                     | Target                           |
| --------------------------------------- | -------------------------------- |
| SMART `.well-known` not yet implemented | Phase TBD                        |
| FHIR R4 resource endpoints return 404   | Wire via data-portability-routes |
| HL7 pack validate returns mock data     | Connect to real HL7 parser       |
| OIDC discovery proxied from Keycloak    | Validate Keycloak realm export   |

---

## 9. Troubleshooting

| Symptom                      | Fix                                                                        |
| ---------------------------- | -------------------------------------------------------------------------- |
| All tests fail with status 0 | API not running -- start with `npx tsx --env-file=.env.local src/index.ts` |
| ECONNREFUSED                 | Check port 3001 and firewall                                               |
| Timeout on SMART tests       | OIDC not configured -- expected in dev                                     |
| HL7 validation returns empty | HL7 packs need to be registered at startup                                 |
