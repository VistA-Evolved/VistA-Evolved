# AI Risk Controls — VistA-Evolved

> Phase 33 — Detailed risk analysis and mitigation for AI features.

## 1. Risk Matrix

| #   | Risk                                                           | Severity | Likelihood | Mitigation                                           |
| --- | -------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------- |
| R1  | AI produces incorrect clinical summary                         | High     | Medium     | RAG grounding + mandatory clinician confirmation     |
| R2  | AI generates diagnosis or treatment plan                       | Critical | Low        | Safety layer regex + post-response scan + hard block |
| R3  | PHI leaked to cloud model                                      | Critical | Low        | Default `redactPhi: true`, on-prem-only default      |
| R4  | Prompt injection via user input                                | Medium   | Medium     | Structured prompt templates, allowedVariables only   |
| R5  | Patient acts on AI lab explanation without consulting provider | Medium   | Medium     | Mandatory disclaimer on every response               |
| R6  | Audit trail gaps                                               | Medium   | Low        | Synchronous audit logging in gateway pipeline        |
| R7  | Model hallucination (fabricated data)                          | High     | Medium     | Citation extraction + confidence scoring             |
| R8  | Rate abuse / denial of service                                 | Medium   | Low        | Per-user hourly rate limiting, configurable          |
| R9  | Unauthorized access to AI features                             | Medium   | Low        | Session auth + role checks + facility policy         |
| R10 | Prompt template tampering                                      | Medium   | Low        | SHA-256 content hashing, drift detection             |

## 2. Safety Layer Design

### 2.1 Pre-Request Checks

- Scan user input for disallowed category patterns
- Validate use case is allowed by facility policy
- Check user role has permission for the use case
- Enforce rate limits

### 2.2 Post-Response Checks

- Scan model output for disallowed category patterns
- If detected: block response, log event, return safe error
- Add safety disclaimers to all outputs

### 2.3 Disallowed Category Detection

Each of 6 categories has regex patterns:

```typescript
CATEGORY_PATTERNS = {
  diagnosis: [/\bdiagnos(is|ed|e)\b/i, /\bmost likely\b.*\bcondition\b/i, ...],
  treatment_plan: [/\btreatment plan\b/i, /\brecommend(ed)? treatment\b/i, ...],
  prescribing_guidance: [/\bprescribe\b/i, /\bdosage.*adjust/i, ...],
  autonomous_ordering: [/\border (a|an|the) /i, /\bplace.*order\b/i, ...],
  prognosis: [/\bprognosis\b/i, /\bexpected outcome\b/i, ...],
  differential_diagnosis: [/\bdifferential\b/i, /\brule out\b/i, ...]
}
```

### 2.4 Detection Accuracy

- **False positives:** Possible (e.g., "The lab order was placed" may trigger `autonomous_ordering`). Mitigated by reviewing blocked requests in audit.
- **False negatives:** Possible for novel phrasing. Mitigated by post-response scan + clinician confirmation.
- **Tuning:** Category patterns should be reviewed quarterly based on audit data.

## 3. PHI Redaction Engine

### 3.1 Patterns Detected

| Pattern       | Example         | Replacement        |
| ------------- | --------------- | ------------------ |
| SSN           | 123-45-6789     | [REDACTED-SSN]     |
| Phone         | (555) 123-4567  | [REDACTED-PHONE]   |
| Email         | user@domain.com | [REDACTED-EMAIL]   |
| DOB           | DOB: 01/15/1980 | [REDACTED-DOB]     |
| MRN           | MRN: 12345      | [REDACTED-MRN]     |
| Address       | 123 Main St     | [REDACTED-ADDRESS] |
| Patient Name  | PATIENT,NAME    | [REDACTED-NAME]    |
| DFN reference | DFN: 42         | [REDACTED-DFN]     |
| DUZ reference | DUZ: 87         | [REDACTED-DUZ]     |

### 3.2 Redaction Policy

- **On-premises models:** PHI allowed if `canHandlePhi` is true
- **Cloud models:** Always redacted
- **Facility override:** `redactPhi: true` forces redaction for all models
- **RAG context:** Redacted independently via `redactContext()`

## 4. RAG Grounding Controls

### 4.1 Role-Based Source Access

| Role      | Allowed Sources                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Clinician | All 9 categories (demographics, meds, allergies, problems, vitals, labs, notes, intake, appointments) |
| Patient   | 7 categories (no clinical notes, no intake forms)                                                     |
| Proxy     | 5 categories (demographics, vitals, labs, meds, appointments)                                         |
| System    | None (no chart access)                                                                                |

### 4.2 Context Size Limits

- Max 12,000 characters per assembled context
- Max 10 chunks per source category
- Priority truncation: newest data retained, oldest trimmed

## 5. Rate Limiting

- Default: 30 requests per user per hour
- Configurable via facility policy (`maxRequestsPerUserPerHour`)
- Rolling window (oldest request evicted after 1 hour)
- Exceeding limit returns 429 with retry guidance

## 6. Monitoring Recommendations

| Metric                  | Threshold | Action                     |
| ----------------------- | --------- | -------------------------- |
| Block rate > 20%        | 1 hour    | Review prompt templates    |
| Rejection rate > 50%    | 1 day     | Review model quality       |
| Avg latency > 5s        | 1 hour    | Check model health         |
| Rate limit hits > 10/hr | 1 hour    | Investigate usage patterns |
| Error rate > 5%         | 1 hour    | Check model availability   |

## 7. Compliance Notes

- AI features align with ONC certification requirements for clinical decision support
- "AI-generated" label required on all outputs (implemented via `aiGenerated: true` flag)
- Patient-facing content includes educational-only disclaimers
- Full audit trail supports post-hoc review by compliance officers
- No AI output becomes part of the medical record without clinician action
