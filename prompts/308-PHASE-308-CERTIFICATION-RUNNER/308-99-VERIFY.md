# Phase 308 -- W12-P10 VERIFY

## Departmental Certification Runner

### Verification Gates

| #   | Gate                                                                                 | Method             |
| --- | ------------------------------------------------------------------------------------ | ------------------ |
| 1   | certification-runner.ts exists with runCertification, getCertificationSummary        | File content check |
| 2   | certification-runner has 17 checks (4 infra + 6 domain + 3 telehealth + 4 safety)    | Content check      |
| 3   | writeback-routes.ts has /writeback/certification endpoint                            | Content check      |
| 4   | writeback-routes.ts has /writeback/certification/summary endpoint                    | Content check      |
| 5   | index.ts exports runCertification + getCertificationSummary                          | Content check      |
| 6   | Contract tests file exists with 14+ test cases                                       | Content check      |
| 7   | CertificationReport type has overallStatus, summary, checks, gateConfig, environment | Content check      |
| 8   | All 6 domains validated by executor dry-run                                          | Content check      |
| 9   | Safety checks include dry-run default, kill-switch, intent mapping, PHI guard        | Content check      |
| 10  | No PHI in certification output (SSN/cred patterns)                                   | Content scan       |

### Pass Criteria

All 10 gates must PASS.
