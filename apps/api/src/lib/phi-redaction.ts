/**
 * PHI Redaction Registry — Phase 48.
 *
 * SINGLE SOURCE OF TRUTH for all PHI/PII/credential field names and
 * inline patterns used by the logger, audit stores, and CI lint gate.
 *
 * Any new field must be added here — NOT in logger.ts, server-config.ts,
 * or individual audit modules.
 */

/* ------------------------------------------------------------------ */
/* Field blocklists                                                    */
/* ------------------------------------------------------------------ */

/**
 * Credential fields — always redacted in logs and audit.
 * These are authentication-related and never carry clinical meaning.
 */
export const CREDENTIAL_FIELDS: ReadonlySet<string> = new Set([
  "accesscode", "verifycode", "password", "secret",
  "token", "sessiontoken", "avplain",
  "access_code", "verify_code",
  "authorization", "cookie", "set-cookie",
  "x-service-key", "api_key", "apikey",
]);

/**
 * PHI fields — never appear in log output or metric labels.
 * These carry Protected Health Information per HIPAA.
 */
export const PHI_FIELDS: ReadonlySet<string> = new Set([
  "ssn", "socialsecuritynumber", "social_security_number",
  "dob", "dateofbirth", "date_of_birth", "birthdate",
  "notetext", "notecontent", "problemtext",
  "patientname", "patient_name", "membername", "member_name",
  "subscribername", "subscriber_name",
  "memberid", "member_id", "subscriberid", "subscriber_id",
  "insuranceid", "insurance_id", "policyid", "policy_id",
  "medicarenum", "medicaidnum",
  "address", "streetaddress", "street_address",
  "phonenumber", "phone_number", "phone",
  "email", "emailaddress", "email_address",
]);

/**
 * Combined blocklist — all fields that must never appear in log output.
 * Used by the logger redaction engine and the CI lint gate.
 */
export const ALL_BLOCKED_FIELDS: ReadonlySet<string> = new Set([
  ...CREDENTIAL_FIELDS,
  ...PHI_FIELDS,
]);

/* ------------------------------------------------------------------ */
/* Inline regex patterns                                               */
/* ------------------------------------------------------------------ */

/**
 * Patterns matched against string values to scrub inline secrets/PHI.
 * Each entry has a human-readable label for error reporting.
 */
export const INLINE_REDACT_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  { label: "AV code pair", pattern: /[A-Z0-9]+;[A-Z0-9!@#$%^&*]+/gi },
  { label: "Bearer token", pattern: /Bearer\s+[A-Za-z0-9+/=_-]{20,}/g },
  { label: "Session hex", pattern: /[0-9a-f]{64}/gi },
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "DOB ISO", pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g },
  { label: "DOB US", pattern: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g },
  { label: "VistA name", pattern: /\b[A-Z]{2,20},\s?[A-Z]{2,20}(\s[A-Z])?\b/g },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Check if a field name is blocked (case-insensitive).
 */
export function isBlockedField(fieldName: string): boolean {
  return ALL_BLOCKED_FIELDS.has(fieldName.toLowerCase());
}

/**
 * Deep-redact an object — replaces blocked field values with "[REDACTED]"
 * and scrubs inline patterns in string values.
 *
 * Returns a new object — never mutates the input.
 */
export function redactPhi(obj: unknown, depth = 0): unknown {
  if (depth > 10) return "[MAX_DEPTH]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    let s = obj;
    for (const { pattern } of INLINE_REDACT_PATTERNS) {
      s = s.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
    }
    return s;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPhi(item, depth + 1));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isBlockedField(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactPhi(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Sanitize a string detail for audit — strips SSN, DOB, patient names.
 * Delegates to the inline patterns and additionally truncates long strings.
 */
export function sanitizeForAudit(detail: unknown, maxLen = 500): unknown {
  const redacted = redactPhi(detail);
  if (typeof redacted === "string" && redacted.length > maxLen) {
    return redacted.slice(0, maxLen) + "...[TRUNCATED]";
  }
  return redacted;
}

/** PHI classification categories for data governance documentation. */
export type PhiClassification = "credential" | "phi" | "safe";

/**
 * Classify a field name.
 */
export function classifyField(fieldName: string): PhiClassification {
  const lc = fieldName.toLowerCase();
  if (CREDENTIAL_FIELDS.has(lc)) return "credential";
  if (PHI_FIELDS.has(lc)) return "phi";
  return "safe";
}
