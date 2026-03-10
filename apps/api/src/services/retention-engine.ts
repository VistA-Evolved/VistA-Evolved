/**
 * Retention Engine -- Phase 496 (W34-P6)
 *
 * Validates record deletion/archival against the country pack's
 * retentionMinYears and retentionMaxYears. Prevents premature deletion
 * and flags records past max retention for mandatory archival.
 */

// -- Types ------------------------------------------------------

export interface RetentionPolicy {
  retentionMinYears: number;
  retentionMaxYears: number | null;
}

export interface RetentionValidationResult {
  allowed: boolean;
  reason: string;
  recordAgeDays: number;
  retentionMinDays: number;
  retentionMaxDays: number | null;
  pastMaxRetention: boolean;
}

// -- Validation -------------------------------------------------

/**
 * Validate whether a record can be deleted/archived based on the pack's
 * retention policy.
 *
 * @param recordCreatedAt - ISO 8601 timestamp of when the record was created
 * @param policy          - Retention policy from the country pack
 * @returns Validation result with reason
 */
export function validateRetention(
  recordCreatedAt: string,
  policy: RetentionPolicy,
): RetentionValidationResult {
  const createdDate = new Date(recordCreatedAt);
  const now = new Date();
  const ageDays = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const minDays = policy.retentionMinYears * 365;
  const maxDays = policy.retentionMaxYears
    ? policy.retentionMaxYears * 365
    : null;

  const pastMax = maxDays !== null && ageDays > maxDays;

  // Record is too young to delete
  if (ageDays < minDays) {
    return {
      allowed: false,
      reason: `Record is ${ageDays} days old; minimum retention is ${minDays} days (${policy.retentionMinYears} years)`,
      recordAgeDays: ageDays,
      retentionMinDays: minDays,
      retentionMaxDays: maxDays,
      pastMaxRetention: false,
    };
  }

  // Record is within the allowed deletion window
  return {
    allowed: true,
    reason: pastMax
      ? `Record is past max retention (${maxDays} days) and should be archived`
      : `Record meets minimum retention (${minDays} days), deletion allowed`,
    recordAgeDays: ageDays,
    retentionMinDays: minDays,
    retentionMaxDays: maxDays,
    pastMaxRetention: pastMax,
  };
}

/**
 * Build a RetentionPolicy from a country pack's regulatory profile.
 */
export function buildRetentionPolicy(packRegulatory?: {
  retentionMinYears?: number;
  retentionMaxYears?: number | null;
}): RetentionPolicy {
  return {
    retentionMinYears: packRegulatory?.retentionMinYears ?? 6,  // HIPAA default
    retentionMaxYears: packRegulatory?.retentionMaxYears ?? null,
  };
}
