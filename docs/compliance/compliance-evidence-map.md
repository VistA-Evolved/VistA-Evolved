# Compliance Evidence Map

> Generated from `apps/api/src/services/compliance-matrix.ts` (Phase 315).
> This is a human-readable reference. The machine-readable version is served
> via `GET /compliance/matrix`.

## Coverage Summary

| Framework | Total | Implemented | Partial | Planned | N/A | Coverage |
| --------- | ----- | ----------- | ------- | ------- | --- | -------- |
| HIPAA     | 12    | 8           | 2       | 1       | 1   | 91%      |
| DPA_PH    | 6     | 5           | 0       | 1       | 0   | 83%      |
| DPA_GH    | 5     | 4           | 0       | 1       | 0   | 80%      |

Coverage = (implemented + partial) / (total - not_applicable) \* 100

## HIPAA (US)

### Access Control (164.312(a))

| Requirement              | Status      | Evidence                                            |
| ------------------------ | ----------- | --------------------------------------------------- |
| Access Control (a)(1)    | Implemented | policy-engine.ts, module-guard.ts, imaging-authz.ts |
| Unique User ID (a)(2)(i) | Implemented | rpcBrokerClient.ts (DUZ), oidc-provider.ts          |
| Auto Logoff (a)(2)(iii)  | Implemented | Session TTL, socket idle timeout                    |
| Encryption (a)(2)(iv)    | Partial     | Cookie secure flags, TLS in production              |

### Audit & Integrity (164.312(b,c))

| Requirement        | Status      | Evidence                                                          |
| ------------------ | ----------- | ----------------------------------------------------------------- |
| Audit Controls (b) | Implemented | immutable-audit.ts, imaging-audit.ts, rcm-audit.ts, audit shipper |
| Integrity (c)(1)   | Implemented | Hash chains, SHA-256 manifests, idempotency guard                 |

### Authentication & Transmission (164.312(d,e))

| Requirement                  | Status      | Evidence                                         |
| ---------------------------- | ----------- | ------------------------------------------------ |
| Authentication (d)           | Implemented | VistA RPC, OIDC, WebAuthn passkeys               |
| Transmission Security (e)(1) | Partial     | TLS at infrastructure level, cookie secure flags |

### Data Minimization & Patient Rights

| Requirement                   | Status      | Evidence                                           |
| ----------------------------- | ----------- | -------------------------------------------------- |
| Minimum Necessary (530(c))    | Implemented | phi-redaction.ts, analytics no-DFN, OTel PHI strip |
| Patient Access (524)          | Implemented | Patient portal, clinical reports                   |
| Breach Notification (404-408) | Planned     | Breach workflow not yet built                      |
| BAA (502(e))                  | N/A         | Legal contract, not software                       |

## DPA Philippines (R.A. 10173)

| Requirement                     | Status      | Evidence                                        |
| ------------------------------- | ----------- | ----------------------------------------------- |
| Data Subject Rights (Sec 16)    | Implemented | consent-engine.ts (all-or-nothing + revocation) |
| Security Measures (Sec 20)      | Implemented | policy-engine.ts, immutable-audit.ts            |
| Consent (Sec 21)                | Implemented | DPA_PH profile, PH country pack                 |
| Cross-Border Transfer (Sec 12)  | Implemented | data-residency.ts, PH pack config               |
| Breach Notification (NPC 16-01) | Planned     | 72-hour NPC notification not yet built          |
| Data Retention (Sec 11(e))      | Implemented | 5yr min / 10yr max in PH pack                   |

## DPA Ghana (Act 843)

| Requirement                    | Status      | Evidence                               |
| ------------------------------ | ----------- | -------------------------------------- |
| Data Subject Rights (Sec 17)   | Implemented | consent-engine.ts, GH country pack     |
| Data Security (Sec 26)         | Implemented | Shared security infrastructure         |
| Cross-Border Transfer (Sec 37) | Implemented | data-residency.ts, GH pack config      |
| Consent (Sec 30)               | Implemented | DPA_GH profile, all-or-nothing         |
| Breach Notification (Sec 31)   | Planned     | 72-hour DPC notification not yet built |

## Gap Analysis

### Across All Frameworks

| Gap                             | Frameworks            | Category   | Priority |
| ------------------------------- | --------------------- | ---------- | -------- |
| Breach notification workflow    | HIPAA, DPA_PH, DPA_GH | breach     | High     |
| At-rest encryption verification | HIPAA                 | encryption | Medium   |
| TLS enforcement verification    | HIPAA                 | encryption | Medium   |

### Mitigation Notes

- **Breach notification**: Audit trail provides forensic evidence. Workflow
  requires organizational procedures + notification templates per framework.
- **Encryption**: Depends on deployment infrastructure (PG encryption, S3
  bucket policies, TLS certificates). Application enforces secure cookies
  and never stores plaintext credentials.
