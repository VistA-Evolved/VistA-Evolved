# Logging & Audit Policy — VistA-Evolved

> **Owner**: Engineering / Compliance  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 90 days

---

## 1. Purpose

Define what VistA-Evolved logs, how it logs, and what must never appear in
log output. This policy directly implements HIPAA Security Rule requirements
for audit controls (45 CFR 164.312(b)) and integrity controls (45 CFR 164.312(c)(1)).

## 2. Logging Architecture

```
Request → Fastify hooks → Structured Logger (logger.ts)
                              ↓
                    Redaction Engine (inline + field)
                              ↓
                    JSON / text output → stdout
                              ↓
                    Log aggregator (production)
```

### 2.1 Structured Logger

- **Implementation**: `apps/api/src/lib/logger.ts` (Phase 15A)
- **Format**: JSON in production (`NODE_ENV=production`), human-readable text otherwise
- **Request context**: Automatic request ID propagation via `AsyncLocalStorage`
- **Levels**: `debug`, `info`, `warn`, `error` (configurable via `LOG_LEVEL` env var)

### 2.2 Audit Trail

- **General audit**: `apps/api/src/lib/audit.ts` — logs all clinical data access
- **Imaging audit**: `apps/api/src/services/imaging-audit.ts` — SHA-256 hash-chained, tamper-evident
- **Analytics**: `apps/api/src/services/analytics-store.ts` — PHI-safe event stream

## 3. What MUST Be Logged

| Event                                      | Required Fields                                         | Retention       |
| ------------------------------------------ | ------------------------------------------------------- | --------------- |
| Authentication success/failure             | Timestamp, user identifier, IP, result                  | 90 days min     |
| Clinical data access (read)                | Timestamp, DUZ, patient DFN, RPC name, action           | 6 years (HIPAA) |
| Clinical data write (note, allergy, order) | Timestamp, DUZ, patient DFN, RPC, result                | 6 years         |
| Imaging access                             | Timestamp, DUZ, study UID (not patient name), action    | 6 years         |
| Break-glass activation                     | Timestamp, DUZ, patient DFN, reason, TTL                | 6 years         |
| Admin action                               | Timestamp, DUZ, action type, target                     | 6 years         |
| Error (server-side)                        | Timestamp, request ID, error category, stack (redacted) | 90 days         |
| RPC broker connection/disconnect           | Timestamp, event type                                   | 90 days         |

## 4. What MUST NEVER Be Logged

The following must never appear in log output at any level:

| Data                                    | Enforcement                                                       |
| --------------------------------------- | ----------------------------------------------------------------- |
| Patient SSN                             | `INLINE_REDACT_PATTERNS` + `PHI_CONFIG.neverLogFields`            |
| Patient name                            | `redactPhi()` in AI redaction engine                              |
| Patient DOB                             | Inline regex + field blocklist                                    |
| Clinical note text                      | `PHI_CONFIG.neverLogFields: ['noteText', 'noteContent']`          |
| Medication details linked to patient    | Field redaction                                                   |
| VistA credentials (access/verify codes) | `REDACT_FIELDS` blocklist: `password`, `accessCode`, `verifyCode` |
| Bearer tokens                           | Inline regex: `Bearer [A-Za-z0-9…]` → `Bearer [REDACTED]`         |
| Session tokens                          | Inline regex: `[0-9a-f]{32,}` → `[REDACTED-HEX-TOKEN]`            |
| Full request bodies                     | PHI leak scanner blocks `JSON.stringify(req.body)`                |
| Full error messages to clients          | PHI leak scanner blocks `err.message` in responses                |
| DICOM pixel data                        | `sanitizeDetail()` strip                                          |

## 5. Redaction Stack

Redaction is defense-in-depth — multiple layers ensure no single bypass leaks PHI:

1. **Field-level** (`REDACT_FIELDS`): Masks known sensitive field names to `[REDACTED]`
2. **Inline regex** (`INLINE_REDACT_PATTERNS`): Catches SSN, Bearer tokens, hex sessions in any string
3. **PHI regex** (`redactPhi()`): 10-pattern engine for SSN, phone, email, DOB, MRN, address, names, DFN, DUZ
4. **Config blocklist** (`PHI_CONFIG.neverLogFields`): Fields that are dropped entirely, not just masked
5. **PHI leak scanner** (`scripts/phi-leak-scan.mjs`): CI-time static analysis catching `console.*`, `err.message`, raw body logging

## 6. Log Integrity

### 6.1 General Logs

- Written to stdout; integrity managed by log aggregator in production
- Request ID correlation enables trace reconstruction

### 6.2 Imaging Audit (Hash Chain)

- Each entry contains SHA-256 hash of previous entry
- Chain verifiable via `GET /imaging/audit/verify`
- Tamper detection: broken hash chain indicates modification

## 7. Log Access Control

| Role             | General Logs     | Audit Trail        | Imaging Audit       | Analytics            |
| ---------------- | ---------------- | ------------------ | ------------------- | -------------------- |
| Admin            | Read             | Read               | Read + verify       | Read + export        |
| Provider         | Own request logs | Own access records | Own imaging access  | View dashboards      |
| Ops              | Read             | No                 | No                  | View dashboards      |
| External auditor | Via export       | Via export         | Via verify endpoint | Via BI SQL (C3 only) |

## 8. Compliance Mapping

| Requirement           | HIPAA Reference      | Implementation                            |
| --------------------- | -------------------- | ----------------------------------------- |
| Audit controls        | 45 CFR 164.312(b)    | General audit + imaging audit + analytics |
| Integrity controls    | 45 CFR 164.312(c)(1) | Hash-chained imaging audit                |
| Person/entity auth    | 45 CFR 164.312(d)    | Session auth + DUZ tracking               |
| Transmission security | 45 CFR 164.312(e)(1) | TLS 1.2+ for all external                 |

## 9. References

- [Data Classification Policy](data-classification.md)
- [HIPAA Security Rule — 45 CFR 164.312](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
