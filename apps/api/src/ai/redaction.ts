/**
 * AI Gateway — PHI Redaction Engine (Phase 33)
 *
 * Minimizes PHI leaving the environment. Applies before sending
 * context to cloud models. On-premises models with phiAllowed=true
 * bypass redaction.
 *
 * Facility policy toggles control redaction behavior.
 */

/* ------------------------------------------------------------------ */
/* Redaction patterns                                                   */
/* ------------------------------------------------------------------ */

interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const REDACTION_PATTERNS: RedactionPattern[] = [
  // SSN (various formats)
  { name: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN-REDACTED]" },
  { name: "SSN-no-dash", pattern: /\b\d{9}\b/g, replacement: "[SSN-REDACTED]" },

  // Phone numbers
  { name: "Phone", pattern: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE-REDACTED]" },

  // Email addresses
  { name: "Email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL-REDACTED]" },

  // Dates of birth (various formats)
  { name: "DOB", pattern: /\b(DOB|Date of Birth|Born|Birth Date):\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: "[DOB-REDACTED]" },

  // MRN / Medical Record Numbers
  { name: "MRN", pattern: /\b(MRN|Medical Record|Record #|Chart #):\s*\d+\b/gi, replacement: "[MRN-REDACTED]" },

  // Street addresses (basic heuristic)
  { name: "Address", pattern: /\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)\b/gi, replacement: "[ADDRESS-REDACTED]" },

  // Patient names following common labels
  { name: "PatientName", pattern: /\b(Patient|Name|Patient Name):\s*[A-Z][A-Za-z'-]+,?\s*[A-Z][A-Za-z'-]*/gi, replacement: "[NAME-REDACTED]" },

  // DFN / DUZ identifiers
  { name: "DFN", pattern: /\bDFN[:\s]*\d+\b/gi, replacement: "[DFN-REDACTED]" },
  { name: "DUZ", pattern: /\bDUZ[:\s]*\d+\b/gi, replacement: "[DUZ-REDACTED]" },
];

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface RedactionResult {
  /** Redacted text. */
  text: string;
  /** Number of redactions applied. */
  redactionCount: number;
  /** Categories of PHI found. */
  categoriesFound: string[];
  /** Whether any PHI was detected. */
  phiDetected: boolean;
}

/**
 * Redact PHI from text. Returns redacted text + metadata.
 * Used before sending context to cloud models.
 */
export function redactPhi(text: string): RedactionResult {
  let result = text;
  let redactionCount = 0;
  const categoriesFound: string[] = [];

  for (const { name, pattern, replacement } of REDACTION_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = result.match(pattern);
    if (matches && matches.length > 0) {
      redactionCount += matches.length;
      if (!categoriesFound.includes(name)) {
        categoriesFound.push(name);
      }
      result = result.replace(pattern, replacement);
    }
  }

  return {
    text: result,
    redactionCount,
    categoriesFound,
    phiDetected: redactionCount > 0,
  };
}

/**
 * Check if text contains PHI without redacting.
 * Useful for deciding whether redaction is needed.
 */
export function detectPhi(text: string): { phiDetected: boolean; categories: string[] } {
  const categories: string[] = [];
  for (const { name, pattern } of REDACTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      if (!categories.includes(name)) {
        categories.push(name);
      }
    }
  }
  return { phiDetected: categories.length > 0, categories };
}

/**
 * Redact PHI from a structured context object (RAG chunks).
 * Applied per-chunk so citations remain traceable.
 */
export function redactContext(
  chunks: Array<{ content: string; label: string }>
): { chunks: Array<{ content: string; label: string }>; totalRedactions: number } {
  let totalRedactions = 0;
  const redacted = chunks.map((chunk) => {
    const result = redactPhi(chunk.content);
    totalRedactions += result.redactionCount;
    return { content: result.text, label: chunk.label };
  });
  return { chunks: redacted, totalRedactions };
}

/** Get list of all PHI pattern categories. */
export function getRedactionCategories(): string[] {
  return REDACTION_PATTERNS.map((p) => p.name);
}
