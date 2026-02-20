# Log Redaction Policy — Phase 48

## Purpose

This document defines VistA-Evolved's log redaction policy, ensuring that
Protected Health Information (PHI), Personally Identifiable Information (PII),
and credentials never appear in log output, metrics labels, or audit details.

## Single Source of Truth

All redaction rules are centralized in:

```
apps/api/src/lib/phi-redaction.ts
```

**No other file should define PHI field blocklists or inline patterns.**

The logger (`logger.ts`) imports from `phi-redaction.ts` at startup.
Audit stores use their own `sanitizeDetail()` but must converge on the
same field blocklist.

## Classification

### Class 1: Credential Fields (always [REDACTED])

Fields containing authentication material. Never logged under any
circumstance, even in debug mode.

| Field | Variants |
|-------|----------|
| Access Code | accessCode, access_code |
| Verify Code | verifyCode, verify_code |
| Password | password |
| Token | token, sessionToken |
| AV Plain | avPlain |
| API Key | api_key, apikey |
| Auth Header | authorization |
| Service Key | x-service-key |
| Cookies | cookie, set-cookie |
| Secret | secret |

### Class 2: PHI Fields (always [REDACTED])

Fields protected under HIPAA/HITECH.

| Field | Variants |
|-------|----------|
| SSN | ssn, socialSecurityNumber, social_security_number |
| Date of Birth | dob, dateOfBirth, date_of_birth, birthdate |
| Clinical Notes | noteText, noteContent, problemText |
| Patient Name | patientName, patient_name |
| Member Name | memberName, member_name |
| Subscriber Name | subscriberName, subscriber_name |
| Member ID | memberId, member_id |
| Subscriber ID | subscriberId, subscriber_id |
| Insurance ID | insuranceId, insurance_id |
| Policy ID | policyId, policy_id |
| Medicare/Medicaid | medicareNum, medicaidNum |
| Address | address, streetAddress, street_address |
| Phone | phoneNumber, phone_number, phone |
| Email | email, emailAddress, email_address |

### Class 3: Inline Patterns (scrubbed in string values)

Even when a field name is safe, string values are scanned for:

| Pattern | Example | Replacement |
|---------|---------|-------------|
| AV code pair | `PROV123;PROV123!!` | `[REDACTED]` |
| Bearer token | `Bearer eyJhbGci...` | `[REDACTED]` |
| Session hex | `a1b2c3d4e5...` (64 chars) | `[REDACTED]` |
| SSN | `123-45-6789` | `[REDACTED]` |
| DOB ISO | `1990-01-15` | `[REDACTED]` |
| DOB US | `01/15/1990` | `[REDACTED]` |
| VistA name | `SMITH,JOHN A` | `[REDACTED]` |

### Class 4: Safe Fields

All fields not in Class 1-3. May be logged freely:
- `dfn` (patient file number — numeric ID, not PHI by itself in logs)
- `duz` (user file number)
- `rpcName` (RPC procedure name)
- `statusCode` (HTTP status)
- `duration` (timing values)

## Enforcement

### Runtime

The logger's `emit()` function calls `redactObject()` on all metadata
before outputting. This is synchronous and blocks the log call — ensuring
no PHI reaches output even under concurrent load.

### CI Gate

```bash
npx tsx scripts/check-phi-fields.ts
```

Scans all `.ts` source files for log calls (`log.info/warn/error/debug/trace/fatal`)
that pass blocked field names as object keys:

```typescript
// WILL BE FLAGGED:
log.info("Patient found", { ssn: patient.ssn });

// SAFE — field name is not blocked:
log.info("Patient found", { dfn: patient.dfn });
```

Exit code 1 = violations found. Integrate into CI pipeline.

### Audit Stores

Each audit store has its own `sanitizeDetail()`:
- `immutable-audit.ts`: Strips SSN, 9-digit numbers, ISO dates, VistA names
- `imaging-audit.ts`: Strips pixel data, HL7 bodies, credentials, SSN, DOB
- `rcm-audit.ts`: Strips SSN, DOB-like dates, Last/First names

**Phase 48 convergence:** All stores should eventually import from
`phi-redaction.ts` for consistency. The current per-store implementations
are safe but may diverge over time.

## Adding New Blocked Fields

1. Add the field name (lowercase) to the appropriate set in `phi-redaction.ts`
2. Update the CI lint gate's duplicate blocklist in `scripts/check-phi-fields.ts`
3. Add the field to this document
4. Run `npx tsx scripts/check-phi-fields.ts` to verify no existing code uses it in log calls
5. Run `pnpm exec vitest run` to ensure no test regressions

## Regulatory Context

- **HIPAA Privacy Rule (45 CFR 164.502):** PHI must not be disclosed except as permitted
- **HIPAA Security Rule (45 CFR 164.312):** Technical safeguards for ePHI
- **HITECH Act:** Breach notification requirements — log leaks count as breaches
- **21 CFR Part 11:** FDA electronic records — audit trail integrity

This redaction policy is a safeguard, not a substitute for proper access controls.
