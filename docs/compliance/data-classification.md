# Data Classification Policy — VistA-Evolved

> **Owner**: Engineering / Compliance  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 90 days or when a new data flow is introduced

---

## 1. Purpose

Define how all data handled by VistA-Evolved is classified, stored, transmitted,
and protected. This policy governs engineering decisions, logging behaviour,
audit trail design, and access-control rules.

## 2. Classification Tiers

| Tier   | Label         | Description                                                   | Examples                                                                         |
| ------ | ------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **C1** | PHI / ePHI    | HIPAA-defined Protected Health Information                    | Patient name, SSN, DOB, DFN, diagnoses, medications, note text, DICOM pixel data |
| **C2** | De-identified | Clinical data with all 18 HIPAA identifiers removed or hashed | Salted-hashed DFN, age bracket, ICD code without patient linkage                 |
| **C3** | Aggregated    | Statistical summaries — no individual-level data              | Daily order counts, average RPC latency, modality volume                         |
| **C4** | Operational   | Infrastructure telemetry — no clinical content                | API uptime, heap memory, circuit breaker state, rate limit counters              |

### 2.1 PHI Identifiers (18 HIPAA elements)

The following are always treated as C1 regardless of context:

1. Name
2. Address (anything more specific than state)
3. Dates (DOB, admission, discharge, death — except year)
4. Phone number
5. Fax number
6. Email
7. SSN
8. MRN / DFN
9. Health plan beneficiary number
10. Account number
11. Certificate/license number
12. Vehicle/device identifiers
13. URLs
14. IP addresses
15. Biometric identifiers
16. Full-face photo
17. Any other unique identifier
18. Age > 89

## 3. Handling Rules per Tier

### C1 — PHI

| Aspect                 | Rule                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **At rest**            | VistA globals only (^DPT, ^TIU, ^GMR, etc.). API never persists C1 data.                  |
| **In transit**         | TLS 1.2+ required for all external links. RPC broker uses TCP inside Docker network only. |
| **In memory**          | Short-lived cache (≤60 s TTL), per-user+patient key, auto-evict.                          |
| **In logs**            | NEVER. Redaction engine strips SSN, DOB, patient name, note text before any log write.    |
| **In error responses** | NEVER. Generic error messages only; no `err.message` forwarding.                          |
| **Access**             | Authenticated session + clinical role + per-patient audit.                                |
| **Audit**              | Every read/write logged (user, timestamp, action, patient DFN — in audit store only).     |

### C2 — De-identified

| Aspect         | Rule                                                           |
| -------------- | -------------------------------------------------------------- |
| **At rest**    | Analytics event stream (in-memory ring buffer or JSONL file).  |
| **In transit** | Internal API only; no external export without analytics_admin. |
| **In logs**    | Allowed (hashed user IDs, event types, counts).                |
| **Access**     | `analytics_viewer` or `analytics_admin` permission.            |

### C3 — Aggregated

| Aspect         | Rule                                                   |
| -------------- | ------------------------------------------------------ |
| **At rest**    | ROcto SQL tables, BI exports.                          |
| **In transit** | PG wire protocol (MD5 auth) over Docker network.       |
| **Access**     | `analytics_viewer` permission, `bi_readonly` SQL user. |

### C4 — Operational

| Aspect         | Rule                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| **At rest**    | Structured log files, /metrics endpoint.                                    |
| **In transit** | HTTP inside cluster; TLS for external monitoring.                           |
| **Access**     | Ops staff. No auth required for /metrics in sandbox; auth required in prod. |

## 4. Data Flow Boundaries

```
Patient ←→ VistA (C1) ←→ RPC Broker ←→ API (pass-through) ←→ Browser (session-scoped)
                                            ↓
                                       Redaction Engine
                                            ↓
                                  Structured Logger (C4 only)
                                            ↓
                                  Analytics Store (C2/C3)
                                            ↓
                                  ROcto SQL (C3 only)
```

**Rule**: Data may only flow _downward_ through classification tiers (C1 → C2 → C3 → C4).
It must never flow upward. Crossing a boundary requires an explicit transformation
(hashing, aggregation, redaction).

## 5. Redaction Controls

The codebase enforces data classification through multiple layers:

| Layer                   | File                                       | What it does                                                                               |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Inline redaction**    | `apps/api/src/lib/logger.ts`               | Strips SSN, Bearer tokens, session IDs from all log output                                 |
| **Field redaction**     | `apps/api/src/lib/logger.ts`               | Masks `password`, `accessCode`, `verifyCode`, `authorization` fields                       |
| **PHI redaction**       | `apps/api/src/ai/redaction.ts`             | 10-pattern regex engine for SSN, phone, email, DOB, MRN, address, names, DFN, DUZ          |
| **Config**              | `apps/api/src/config/server-config.ts`     | `PHI_CONFIG.neverLogFields` blocklist, `LOG_CONFIG.redactHeaders`                          |
| **PHI leak scanner**    | `scripts/phi-leak-scan.mjs`                | CI gate: fails build if `console.*`, `err.message` to client, or raw body logging detected |
| **Analytics sanitizer** | `apps/api/src/services/analytics-store.ts` | `sanitizeAnalyticsTags()` strips PHI patterns before storage                               |
| **Audit sanitizer**     | `apps/api/src/services/imaging-audit.ts`   | `sanitizeDetail()` strips pixel data, HL7, credentials, SSN, DOB                           |

## 6. Violations

Any code change that:

- Logs a C1 field to structured logs or stdout
- Returns `err.message` containing possible C1 data to a client
- Stores C1 data outside VistA globals
- Exposes C1 data in an analytics event or aggregation
- Omits audit logging for a C1 data access

…is a **data classification violation** and must be fixed before merge.
The PHI leak scanner (`scripts/phi-leak-scan.mjs`) and unit tests
(`redaction.test.ts`, `logger.test.ts`) enforce this in CI.

## 7. References

- [Phase 25 Analytics Data Classification](../analytics/phase25-data-classification.md)
- [HIPAA Security Rule — 45 CFR 164.312](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [NIST SP 800-66r2 — Implementing the HIPAA Security Rule](https://csrc.nist.gov/pubs/sp/800/66/r2/final)
