# Compliance Mapping — VistA-Evolved

> **Owner**: Engineering / Compliance  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 90 days  
> **Frameworks**: HIPAA Security Rule, NIST SP 800-53r5, OWASP ASVS v4.0

---

## 1. Purpose

Map VistA-Evolved security controls to three compliance frameworks commonly
required for healthcare software: HIPAA Security Rule (mandatory for ePHI),
NIST SP 800-53r5 (federal baseline), and OWASP ASVS v4.0 (application security).

## 2. HIPAA Security Rule Mapping

### Administrative Safeguards (45 CFR 164.308)

| Standard                         | Ref        | VistA-Evolved Control                                            | Evidence                                                       |
| -------------------------------- | ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Security management process      | .308(a)(1) | Risk analysis (threat model), PHI leak scanner, evidence bundles | `docs/compliance/threat-model.md`, `scripts/phi-leak-scan.mjs` |
| Assigned security responsibility | .308(a)(2) | Documented in incident response plan                             | `docs/compliance/incident-response.md`                         |
| Workforce security               | .308(a)(3) | RBAC with VistA role mapping                                     | `access-control-policy.md`, `security.ts`                      |
| Information access management    | .308(a)(4) | Role-based permissions, break-glass                              | `imaging-authz.ts`, `session-store.ts`                         |
| Security awareness training      | .308(a)(5) | Developer onboarding (AGENTS.md), bug tracker                    | `AGENTS.md`, `docs/BUG-TRACKER.md`                             |
| Security incident procedures     | .308(a)(6) | Incident response plan                                           | `docs/compliance/incident-response.md`                         |
| Contingency plan                 | .308(a)(7) | Docker sandbox (dev), VistA persistence                          | `services/vista/docker-compose.yml`                            |
| Evaluation                       | .308(a)(8) | Phase verifiers, evidence bundles, CI gates                      | `scripts/verify-latest.ps1`, CI workflow                       |

### Physical Safeguards (45 CFR 164.310)

| Standard                  | Ref        | VistA-Evolved Control                      | Notes                        |
| ------------------------- | ---------- | ------------------------------------------ | ---------------------------- |
| Facility access controls  | .310(a)(1) | N/A — cloud/Docker deployment              | Infrastructure-level control |
| Workstation use           | .310(b)    | N/A                                        | Organization policy          |
| Workstation security      | .310(c)    | N/A                                        | Organization policy          |
| Device and media controls | .310(d)(1) | No local PHI storage. API is pass-through. | Data classification policy   |

### Technical Safeguards (45 CFR 164.312)

| Standard               | Ref             | VistA-Evolved Control                              | Evidence                                     |
| ---------------------- | --------------- | -------------------------------------------------- | -------------------------------------------- |
| Access control         | .312(a)(1)      | Session auth + RBAC + break-glass                  | `security.ts`, `imaging-authz.ts`            |
| — Unique user ID       | .312(a)(2)(i)   | VistA DUZ mapped to session                        | `session-store.ts`                           |
| — Emergency access     | .312(a)(2)(ii)  | Break-glass (patient-scoped, time-limited)         | `imaging-authz.ts`                           |
| — Automatic logoff     | .312(a)(2)(iii) | Session timeout (configurable)                     | `session-store.ts`, `server-config.ts`       |
| — Encryption (at rest) | .312(a)(2)(iv)  | VistA globals (M encryption if enabled)            | VistA-level control                          |
| Audit controls         | .312(b)         | General audit + hash-chained imaging audit         | `audit.ts`, `imaging-audit.ts`               |
| Integrity              | .312(c)(1)      | SHA-256 hash chain for imaging audit               | `imaging-audit.ts`, verify endpoint          |
| Authentication         | .312(d)         | XWB cipher auth + PBKDF2 portal auth               | `rpcBrokerClient.ts`, `portal-iam-routes.ts` |
| Transmission security  | .312(e)(1)      | TLS 1.2+ for external, Docker network for internal | Infrastructure config                        |

## 3. NIST SP 800-53r5 Mapping

| Family                        | Control                            | VistA-Evolved Implementation                              |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------- |
| **AC** Access Control         | AC-2 Account Management            | VistA user accounts, session management                   |
|                               | AC-3 Access Enforcement            | RBAC in security.ts, per-route auth levels                |
|                               | AC-6 Least Privilege               | Role-based permissions, imaging_view/admin split          |
|                               | AC-7 Unsuccessful Login            | Rate limiting on login endpoint (5/300s)                  |
|                               | AC-11 Session Lock                 | Idle timeout → session expiry                             |
|                               | AC-17 Remote Access                | TLS-only external access                                  |
| **AU** Audit                  | AU-2 Event Logging                 | Audit events per logging policy                           |
|                               | AU-3 Content of Audit Records      | Timestamp, user, action, patient DFN, result              |
|                               | AU-6 Audit Review                  | Admin audit endpoints, hash chain verify                  |
|                               | AU-10 Non-repudiation              | Hash-chained imaging audit                                |
| **CM** Config Management      | CM-2 Baseline Configuration        | `package.json` lockfile, Docker images pinned             |
|                               | CM-3 Config Change Control         | CI quality gates, evidence bundles                        |
|                               | CM-6 Configuration Settings        | `.env.example` template, `server-config.ts`               |
| **IA** Identification/Auth    | IA-2 User Identification           | VistA DUZ-based identity                                  |
|                               | IA-5 Authenticator Management      | Cipher pad encryption, PBKDF2                             |
|                               | IA-8 Non-organizational users      | Patient portal separate auth                              |
| **IR** Incident Response      | IR-4 Incident Handling             | Incident response plan                                    |
|                               | IR-5 Incident Monitoring           | Detection controls (scanner, audit, rate limit)           |
|                               | IR-6 Incident Reporting            | Defined in incident response plan                         |
| **RA** Risk Assessment        | RA-3 Risk Assessment               | Threat model (STRIDE)                                     |
|                               | RA-5 Vulnerability Monitoring      | `pnpm audit`, CodeQL, Dependabot                          |
| **SA** System Acquisition     | SA-11 Developer Testing            | Unit tests (25+), CI gates, phase verifiers               |
|                               | SA-15 Development Process          | Regulated SDLC (Phase 34), evidence bundles               |
| **SC** System/Comm Protection | SC-8 Transmission Confidentiality  | TLS 1.2+ for external connections                         |
|                               | SC-12 Crypto Key Management        | Session IDs (crypto.randomBytes), cipher pads (XUSRB1)    |
|                               | SC-13 Cryptographic Protection     | SHA-256 (audit), PBKDF2 (portal), MD5 (ROcto — PG compat) |
| **SI** System/Info Integrity  | SI-2 Flaw Remediation              | CI pipeline, evidence bundles, bug tracker                |
|                               | SI-4 System Monitoring             | Structured logging, analytics events                      |
|                               | SI-10 Information Input Validation | Fastify schema validation, parameterized RPCs             |

## 4. OWASP ASVS v4.0 Mapping

| Level | Category           | Requirement                                 | VistA-Evolved Control                  |
| ----- | ------------------ | ------------------------------------------- | -------------------------------------- |
| L1    | V1 Architecture    | 1.1.2 — Security controls documentation     | Compliance docs (this folder)          |
| L1    | V2 Authentication  | 2.1.1 — Password length ≥ 12                | VistA-enforced (verify code policy)    |
| L1    |                    | 2.2.1 — Anti-automation for login           | Rate limiting (5/300s)                 |
| L1    |                    | 2.7.1 — No default credentials in prod      | `NODE_ENV` gate on sandbox creds       |
| L1    | V3 Session         | 3.1.1 — Session creation on auth            | Session created after XWB auth success |
| L1    |                    | 3.3.1 — Logout invalidates session          | Session destroy + VistA BYE            |
| L1    |                    | 3.4.1 — Cookie-based with secure attributes | httpOnly, Secure (prod), SameSite      |
| L1    |                    | 3.7.1 — Session timeout                     | Idle + absolute timeout                |
| L1    | V4 Access Control  | 4.1.1 — Least privilege                     | RBAC, per-endpoint auth level          |
| L1    |                    | 4.1.3 — Deny by default                     | `security.ts` default auth requirement |
| L1    | V5 Validation      | 5.1.3 — Input validation                    | Fastify schema, parameterized RPCs     |
| L1    |                    | 5.3.1 — Output encoding                     | Next.js JSX auto-escaping              |
| L1    | V7 Error Handling  | 7.1.1 — Generic error messages              | No err.message to clients (Phase 34)   |
| L1    |                    | 7.1.2 — No stack traces to users            | Error responses contain message only   |
| L2    | V8 Data Protection | 8.1.1 — PHI data classification             | Data classification policy             |
| L2    |                    | 8.3.1 — Sensitive data not in logs          | 5-layer redaction, PHI leak scanner    |
| L2    |                    | 8.3.4 — No sensitive data in URLs           | Opaque session IDs, hex room tokens    |
| L2    | V9 Communications  | 9.1.1 — TLS for all connections             | TLS 1.2+ enforced for external         |
| L2    | V10 Malicious Code | 10.3.1 — No hardcoded credentials           | Secret scanner CI gate                 |
| L2    | V11 Business Logic | 11.1.1 — Sequential order processing        | LOCK/UNLOCK protocol for VistA orders  |
| L2    | V13 API            | 13.1.3 — Rate limiting                      | General + DICOMweb rate limiters       |
| L2    | V14 Configuration  | 14.2.1 — Up-to-date dependencies            | `pnpm audit`, Dependabot (future)      |

## 5. Gap Analysis

| Gap                             | Framework                   | Severity | Remediation Plan                       |
| ------------------------------- | --------------------------- | -------- | -------------------------------------- |
| No MFA for admin users          | HIPAA .312(d), ASVS 2.8     | Medium   | Future phase: TOTP or WebAuthn         |
| No TLS for RPC broker           | HIPAA .312(e)(1), NIST SC-8 | Medium   | Future: stunnel or VistA TLS module    |
| No WAF/CSP headers              | ASVS 14.4.3                 | Low      | Future: Content-Security-Policy header |
| No automated dependency updates | NIST SI-2                   | Low      | Future: Dependabot or Renovate         |
| Physical safeguards TBD         | HIPAA .310                  | N/A      | Deployment-specific — not app-level    |
| No penetration testing          | NIST CA-8                   | Medium   | Future: Annual pen test schedule       |

## 6. Evidence Artifacts

Each CI run produces an evidence bundle containing:

| Artifact           | File                  | What it proves                      |
| ------------------ | --------------------- | ----------------------------------- |
| Gate results       | `gate-results.json`   | All quality gates passed            |
| Summary            | `summary.md`          | Human-readable evidence record      |
| Type safety        | `typecheck.json`      | No type errors across 3 apps        |
| Unit tests         | `unit-tests.json`     | Redaction + logger tests pass       |
| Secret scan        | `secret-scan.json`    | No hardcoded credentials            |
| PHI leak scan      | `phi-leak-scan.json`  | No PHI leak patterns in server code |
| License report     | `license-report.json` | Open-source license compliance      |
| Vulnerability scan | `vuln-scan.json`      | Known vulnerability status          |
| SBOM (optional)    | `sbom.json`           | Software Bill of Materials          |

## 7. References

- [Data Classification Policy](data-classification.md)
- [Logging & Audit Policy](logging-policy.md)
- [Access Control Policy](access-control-policy.md)
- [Incident Response Plan](incident-response.md)
- [Threat Model](threat-model.md)
- [HIPAA Security Rule — 45 CFR 164](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [NIST SP 800-53r5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [OWASP ASVS v4.0](https://owasp.org/www-project-application-security-verification-standard/)
