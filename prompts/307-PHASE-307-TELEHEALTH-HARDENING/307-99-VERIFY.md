# Phase 307 -- W12-P9 VERIFY

## Telehealth Provider Hardening

### Verification Gates

| #   | Gate                                                                                                   | Method             |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| 1   | encounter-link.ts exists with createEncounterLink, updateLinkStatus, hashPatientRef                    | File content check |
| 2   | consent-posture.ts exists with recordConsent, evaluateConsentPosture, withdrawConsent                  | File content check |
| 3   | session-hardening.ts exists with recordHeartbeat, sweepStaleSessions, getSessionMetrics                | File content check |
| 4   | Contract tests file exists with encounter-link, consent-posture, session-hardening describes           | File content check |
| 5   | immutable-audit.ts contains telehealth audit actions                                                   | Grep check         |
| 6   | store-policy.ts contains telehealth-encounter-links, telehealth-consent-records, telehealth-heartbeats | Grep check         |
| 7   | No PHI in any new file (scan for SSN, DOB, patientName patterns)                                       | Content scan       |
| 8   | encounter-link has vistaGrounding metadata for integration-pending states                              | Content check      |
| 9   | consent-posture defaults recording OFF (AGENTS.md #59 compliance)                                      | Content check      |
| 10  | session-hardening has configurable env vars for timeouts                                               | Content check      |

### Pass Criteria

All 10 gates must PASS.
