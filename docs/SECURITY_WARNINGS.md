# Security Warnings — ESLint Plugin Security

**Date:** 2026-03-04
**Tool:** `eslint-plugin-security` v4.0.0
**Scope:** `apps/api/src/**/*.ts`, `packages/**/*.ts`

## Summary

| Rule                                      | Severity | Count   | Risk                                              |
| ----------------------------------------- | -------- | ------- | ------------------------------------------------- |
| `security/detect-object-injection`        | warn     | 482     | Medium — dynamic property access can be exploited |
| `security/detect-non-literal-fs-filename` | warn     | 152     | High — path traversal risk                        |
| `security/detect-non-literal-regexp`      | warn     | 26      | Medium — ReDoS risk                               |
| `security/detect-possible-timing-attacks` | warn     | 1       | High — credential comparison timing leak          |
| **Total**                                 |          | **661** |                                                   |

---

## 1. `security/detect-possible-timing-attacks` (1 warning) — HIGHEST PRIORITY

Timing attacks allow attackers to infer secret values by measuring response times.

| File                                      | Line | Description                                 |
| ----------------------------------------- | ---- | ------------------------------------------- |
| `apps/api/src/hl7/message-event-store.ts` | 223  | Potential timing attack, right side: `true` |

**Action:** Review and use constant-time comparison (`crypto.timingSafeEqual`) if comparing secrets.

---

## 2. `security/detect-non-literal-regexp` (26 warnings)

Non-literal RegExp constructors are vulnerable to ReDoS (Regular Expression Denial of Service).

| File                                                  | Line | Description                    |
| ----------------------------------------------------- | ---- | ------------------------------ |
| `apps/api/src/adapters/scheduling/vista-adapter.ts`   | 1641 | Non-literal RegExp constructor |
| `apps/api/src/ai/prompt-registry.ts`                  | 209  | Non-literal RegExp constructor |
| `apps/api/src/analytics/deid-service.ts`              | 163  | Non-literal RegExp constructor |
| `apps/api/src/analytics/deid-service.ts`              | 214  | Non-literal RegExp constructor |
| `apps/api/src/cds/cds-store.ts`                       | 140  | Non-literal RegExp constructor |
| `apps/api/src/devices/alarm-store.ts`                 | 304  | Non-literal RegExp constructor |
| `apps/api/src/devices/alarm-store.ts`                 | 314  | Non-literal RegExp constructor |
| `apps/api/src/devices/alarm-store.ts`                 | 321  | Non-literal RegExp constructor |
| `apps/api/src/devices/poct1a-parser.ts`               | 80   | Non-literal RegExp constructor |
| `apps/api/src/devices/poct1a-parser.ts`               | 89   | Non-literal RegExp constructor |
| `apps/api/src/devices/poct1a-parser.ts`               | 99   | Non-literal RegExp constructor |
| `apps/api/src/lib/logger.ts`                          | 82   | Non-literal RegExp constructor |
| `apps/api/src/lib/phi-redaction.ts`                   | 138  | Non-literal RegExp constructor |
| `apps/api/src/migration/ccda-parser.ts`               | 76   | Non-literal RegExp constructor |
| `apps/api/src/migration/ccda-parser.ts`               | 82   | Non-literal RegExp constructor |
| `apps/api/src/migration/ccda-parser.ts`               | 92   | Non-literal RegExp constructor |
| `apps/api/src/migration/mapping-engine.ts`            | 66   | Non-literal RegExp constructor |
| `apps/api/src/migration/mapping-engine.ts`            | 204  | Non-literal RegExp constructor |
| `apps/api/src/modules/module-registry.ts`             | 110  | Non-literal RegExp constructor |
| `apps/api/src/modules/validation/boundary-checker.ts` | 55   | Non-literal RegExp constructor |
| `apps/api/src/modules/validation/boundary-checker.ts` | 102  | Non-literal RegExp constructor |
| `apps/api/src/rcm/claim-lifecycle/scrubber.ts`        | 100  | Non-literal RegExp constructor |
| `apps/api/src/rcm/rules/payer-rules.ts`               | 230  | Non-literal RegExp constructor |
| `apps/api/src/vista/contracts/sanitize.ts`            | 48   | Non-literal RegExp constructor |
| `apps/api/src/vista/contracts/sanitize.ts`            | 57   | Non-literal RegExp constructor |
| `apps/api/src/vista/contracts/sanitize.ts`            | 59   | Non-literal RegExp constructor |

**Action:** Validate/sanitize user input before passing to `new RegExp()`. Consider using `escapeRegExp()` helper or literal patterns where possible.

---

## 3. `security/detect-non-literal-fs-filename` (152 warnings)

Dynamic filesystem paths can lead to path traversal attacks.

**Top affected files (36 files total):**

| File                                                      | Count |
| --------------------------------------------------------- | ----- |
| `apps/api/src/rcm/connectors/clearinghouse-gateway-v2.ts` | 14    |
| `apps/api/src/routes/hl7-use-cases.ts`                    | 10    |
| `apps/api/src/routes/ops-admin.ts`                        | 10    |
| `apps/api/src/routes/certification-evidence.ts`           | 9     |
| `apps/api/src/rcm/philhealth-eclaims3/transport.ts`       | 8     |
| `apps/api/src/lib/immutable-audit.ts`                     | 7     |
| `apps/api/src/routes/admin-payer-db-routes.ts`            | 7     |
| `apps/api/src/rcm/payers/payer-persistence.ts`            | 6     |
| `apps/api/src/rcm/payerOps/ingest.ts`                     | 6     |
| `apps/api/src/rcm/payer-registry/registry.ts`             | 5     |
| `apps/api/src/services/analytics-store.ts`                | 5     |
| `apps/api/src/lib/audit.ts`                               | 5     |
| `apps/api/src/posture/backup-posture.ts`                  | 5     |
| `apps/api/src/services/imaging-audit.ts`                  | 4     |
| `apps/api/src/audit-shipping/shipper.ts`                  | 4     |
| `apps/api/src/platform/pg/pg-db.ts`                       | 3     |
| `apps/api/src/platform/pg/pg-seed.ts`                     | 3     |
| `apps/api/src/platform/country-pack-loader.ts`            | 3     |
| (+ 18 more files with 1-3 warnings each)                  |       |

**Action:** Use `path.resolve()` with allowlist validation. Ensure user input cannot traverse directories. Use `path.join(BASE_DIR, sanitizedFilename)` pattern.

---

## 4. `security/detect-object-injection` (482 warnings)

Dynamic property access (`obj[variable]`) can be exploited if the key comes from user input.

**Top affected files (95 files total):**

| File                                              | Count |
| ------------------------------------------------- | ----- |
| `apps/api/src/routes/vista-interop.ts`            | 19    |
| `apps/api/src/routes/emar/index.ts`               | 12    |
| `apps/api/src/rcm/rcm-routes.ts`                  | 9     |
| `apps/api/src/migration/mapping-engine.ts`        | 9     |
| `apps/api/src/analytics/rcm-analytics.ts`         | 8     |
| `apps/api/src/rcm/audit/rcm-audit.ts`             | 8     |
| `apps/api/src/modules/module-registry.ts`         | 8     |
| `apps/api/src/rcm/hmo-portal/adapter-manifest.ts` | 7     |
| `apps/api/src/migration/recon-engine.ts`          | 7     |
| `apps/api/src/vista/rpcCapabilities.ts`           | 7     |
| `apps/api/src/analytics/deid-service.ts`          | 7     |
| `apps/api/src/hl7/fhir-bridge.ts`                 | 7     |
| `packages/locale-utils/src/audit-keys.ts`         | 7     |
| `packages/locale-utils/src/index.ts`              | 6     |
| `apps/api/src/services/certification-pipeline.ts` | 5     |
| `apps/api/src/qa/rpc-contract-trace.ts`           | 5     |
| `apps/api/src/services/cost-attribution.ts`       | 5     |
| `apps/api/src/adapters/adapter-loader.ts`         | 5     |
| `apps/api/src/auth/step-up-auth.ts`               | 5     |
| `apps/api/src/analytics/reporting-service.ts`     | 5     |
| (+ 75 more files with 1-4 warnings each)          |       |

**Action:** Most are legitimate Map/Record lookups with validated keys. Review any that use user-supplied keys directly. Consider using `Map.get()` instead of bracket notation where possible.

---

## Prioritized Remediation Plan

1. **Immediate (P1):** Fix the 1 timing attack warning — use `crypto.timingSafeEqual()`
2. **Short-term (P2):** Review 26 non-literal RegExp — add input sanitization or use literal patterns
3. **Medium-term (P3):** Audit 152 filesystem path warnings — ensure path traversal protection
4. **Ongoing (P4):** Triage 482 object injection warnings — most are false positives in typed code, but each should be reviewed for user-input sourced keys
