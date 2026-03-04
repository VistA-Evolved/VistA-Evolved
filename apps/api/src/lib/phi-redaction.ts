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
  'accesscode',
  'verifycode',
  'password',
  'secret',
  'token',
  'sessiontoken',
  'avplain',
  'access_code',
  'verify_code',
  'authorization',
  'cookie',
  'set-cookie',
  'x-service-key',
  'api_key',
  'apikey',
]);

/**
 * PHI fields — never appear in log output or metric labels.
 * These carry Protected Health Information per HIPAA.
 */
export const PHI_FIELDS: ReadonlySet<string> = new Set([
  // Patient identifiers — Phase 151: added dfn/patientdfn/patient_dfn/mrn
  'dfn',
  'patientdfn',
  'patient_dfn',
  'mrn',
  'ssn',
  'socialsecuritynumber',
  'social_security_number',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'notetext',
  'notecontent',
  'problemtext',
  'patientname',
  'patient_name',
  'membername',
  'member_name',
  'subscribername',
  'subscriber_name',
  'memberid',
  'member_id',
  'subscriberid',
  'subscriber_id',
  'insuranceid',
  'insurance_id',
  'policyid',
  'policy_id',
  'medicarenum',
  'medicaidnum',
  'address',
  'streetaddress',
  'street_address',
  'phonenumber',
  'phone_number',
  'phone',
  'email',
  'emailaddress',
  'email_address',
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
  { label: 'AV code pair', pattern: /[A-Z0-9]+;[A-Z0-9!@#$%^&*]+/gi },
  { label: 'Bearer token', pattern: /Bearer\s+[A-Za-z0-9+/=_-]{20,}/g },
  { label: 'Session hex', pattern: /[0-9a-f]{64}/gi },
  { label: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'DOB ISO', pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g },
  { label: 'DOB US', pattern: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g },
  { label: 'VistA name', pattern: /\b[A-Z]{2,20},\s?[A-Z]{2,20}(\s[A-Z])?\b/g },
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
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    let s = obj;
    for (const { pattern } of INLINE_REDACT_PATTERNS) {
      s = s.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
    }
    return s;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPhi(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isBlockedField(key)) {
        result[key] = '[REDACTED]';
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
  if (typeof redacted === 'string' && redacted.length > maxLen) {
    return redacted.slice(0, maxLen) + '...[TRUNCATED]';
  }
  return redacted;
}

/** PHI classification categories for data governance documentation. */
export type PhiClassification = 'credential' | 'phi' | 'safe';

/**
 * Classify a field name.
 */
export function classifyField(fieldName: string): PhiClassification {
  const lc = fieldName.toLowerCase();
  if (CREDENTIAL_FIELDS.has(lc)) return 'credential';
  if (PHI_FIELDS.has(lc)) return 'phi';
  return 'safe';
}

/* ------------------------------------------------------------------ */
/* Telemetry PHI guard — Phase 77                                      */
/* ------------------------------------------------------------------ */

/**
 * Assert that no attribute key in a span/metric label set matches PHI fields.
 * Throws if any key is blocked — used as a runtime guard in span helpers.
 *
 * This is a HARD guard: it prevents PHI from ever entering the telemetry
 * pipeline, even if the caller accidentally passes a PHI field.
 */
export function assertNoPhiInAttributes(attrs: Record<string, unknown>): void {
  for (const key of Object.keys(attrs)) {
    const lc = key.toLowerCase();
    if (ALL_BLOCKED_FIELDS.has(lc)) {
      throw new Error(
        `PHI field "${key}" detected in telemetry attributes. ` +
          `Telemetry must never contain PHI. Remove this field or use a safe alias.`
      );
    }
    // Also check for common PHI patterns in the key name
    if (/patient.?name|social.?security|date.?of.?birth|member.?id/i.test(key)) {
      throw new Error(
        `Potential PHI field pattern "${key}" detected in telemetry attributes. ` +
          `Telemetry must never contain PHI.`
      );
    }
  }
}

/**
 * Validate that a set of metric label names contains no PHI fields.
 * Used during metric registration to prevent PHI labels at definition time.
 */
/**
 * Convenience wrapper: deep-scrub an audit detail object.
 * Delegates to redactPhi with audit-appropriate depth.
 * All audit emitters should call this on their detail param.
 * Phase 151: exported for use by immutableAudit, portalAudit, imagingAudit, etc.
 */
export function sanitizeAuditDetail(
  detail?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  return redactPhi(detail) as Record<string, unknown>;
}

export function assertNoPhiInMetricLabels(labels: readonly string[]): void {
  for (const label of labels) {
    const lc = label.toLowerCase();
    if (ALL_BLOCKED_FIELDS.has(lc)) {
      throw new Error(
        `PHI field "${label}" detected in metric label names. ` +
          `Metric labels must never contain PHI.`
      );
    }
  }
}
