/**
 * RPC Contract Registry — Phase 250
 *
 * Defines contracted RPCs with input/output schemas for deterministic
 * record/replay testing. Each contract specifies:
 * - rpcName: canonical RPC name (must exist in rpcRegistry.ts)
 * - params: example input params for recording
 * - outputSchema: basic schema for response validation
 * - sanitizer: field-level PHI redaction rules
 * - failureCases: expected error scenarios to test
 */

export interface RpcContractField {
  /** Field name or regex pattern to match in output */
  pattern: string;
  /** How to redact this field */
  action: 'hash' | 'replace' | 'remove' | 'normalize-timestamp';
  /** Replacement value (for action: "replace") */
  replaceWith?: string;
}

export interface RpcContract {
  rpcName: string;
  domain: string;
  description: string;
  /** Example params for recording (no PHI) */
  recordParams: string[];
  /** Whether this is a LIST-type RPC (keyed params) */
  isList?: boolean;
  /** Expected output characteristics */
  outputSchema: {
    /** Minimum number of lines expected (0 = may be empty) */
    minLines: number;
    /** Maximum lines (-1 = unlimited) */
    maxLines: number;
    /** Patterns that MUST appear in valid output */
    mustContain?: RegExp[];
    /** Patterns that MUST NOT appear (indicates PHI leak or error) */
    mustNotContain?: RegExp[];
  };
  /** PHI sanitization rules for fixtures */
  sanitizeFields: RpcContractField[];
  /** Failure scenarios to record/test */
  failureCases: Array<{
    name: string;
    description: string;
    /** How to simulate: "timeout" | "malformed" | "auth-fail" | "empty" | "error-string" */
    type: 'timeout' | 'malformed' | 'auth-fail' | 'empty' | 'error-string';
    /** Expected fixture content for this case */
    fixtureContent?: string[];
  }>;
}

/**
 * Contracted RPCs — Critical path RPCs that must have deterministic tests.
 * Start with 10 high-value RPCs; expand over time.
 */
export const RPC_CONTRACTS: RpcContract[] = [
  // --- Auth ---
  {
    rpcName: 'XUS SIGNON SETUP',
    domain: 'auth',
    description: 'Initial signon handshake — returns server info',
    recordParams: [],
    outputSchema: {
      minLines: 5,
      maxLines: 20,
      mustContain: [/\w+/], // Must have some content
    },
    sanitizeFields: [{ pattern: '^.*$', action: 'replace', replaceWith: 'REDACTED-SERVER-INFO' }],
    failureCases: [
      { name: 'timeout', description: 'VistA unreachable', type: 'timeout' },
      {
        name: 'empty',
        description: 'Empty response from VistA',
        type: 'empty',
        fixtureContent: [],
      },
    ],
  },
  // --- Patients ---
  {
    rpcName: 'ORWPT LIST ALL',
    domain: 'patients',
    description: 'List all patients — returns DFN^Name pairs',
    recordParams: ['A', '1'],
    outputSchema: {
      minLines: 1,
      maxLines: 500,
      mustContain: [/\^/], // Must have caret-delimited pairs
      mustNotContain: [/\d{3}-\d{2}-\d{4}/], // No SSN patterns
    },
    sanitizeFields: [
      { pattern: '^(\\d+)\\^(.+)$', action: 'hash' }, // Hash patient names
    ],
    failureCases: [
      { name: 'empty', description: 'No patients match', type: 'empty', fixtureContent: [] },
      { name: 'auth-fail', description: 'Context not set', type: 'auth-fail' },
    ],
  },
  // --- Allergies ---
  {
    rpcName: 'ORQQAL LIST',
    domain: 'allergies',
    description: 'Patient allergy list',
    recordParams: ['3'], // Patient DFN (will be sanitized)
    outputSchema: {
      minLines: 0,
      maxLines: 100,
    },
    sanitizeFields: [{ pattern: 'DFN', action: 'hash' }],
    failureCases: [
      {
        name: 'empty',
        description: 'Patient with no allergies',
        type: 'empty',
        fixtureContent: [],
      },
      {
        name: 'error-string',
        description: 'Invalid DFN',
        type: 'error-string',
        fixtureContent: ['ERROR: Invalid patient'],
      },
    ],
  },
  // --- Vitals ---
  {
    rpcName: 'GMV V/M ALLDATA',
    domain: 'vitals',
    description: 'All vitals for a patient',
    recordParams: ['3'],
    outputSchema: {
      minLines: 0,
      maxLines: 1000,
    },
    sanitizeFields: [
      { pattern: 'DFN', action: 'hash' },
      { pattern: '\\d{3}-\\d{2}-\\d{4}', action: 'replace', replaceWith: '000-00-0000' },
    ],
    failureCases: [
      { name: 'empty', description: 'No vitals recorded', type: 'empty', fixtureContent: [] },
      { name: 'timeout', description: 'VistA slow response', type: 'timeout' },
    ],
  },
  // --- Medications ---
  {
    rpcName: 'ORWPS ACTIVE',
    domain: 'medications',
    description: 'Active medications list (multi-line grouped records)',
    recordParams: ['3'],
    outputSchema: {
      minLines: 0,
      maxLines: 2000,
    },
    sanitizeFields: [{ pattern: 'DFN', action: 'hash' }],
    failureCases: [
      { name: 'empty', description: 'No active meds', type: 'empty', fixtureContent: [] },
      {
        name: 'malformed',
        description: 'Missing ~ delimiters',
        type: 'malformed',
        fixtureContent: ['BAD DATA'],
      },
    ],
  },
  // --- Problems ---
  {
    rpcName: 'ORQQPL LIST',
    domain: 'problems',
    description: 'Patient problem list',
    recordParams: ['3'],
    outputSchema: {
      minLines: 0,
      maxLines: 200,
    },
    sanitizeFields: [{ pattern: 'DFN', action: 'hash' }],
    failureCases: [
      { name: 'empty', description: 'No active problems', type: 'empty', fixtureContent: [] },
    ],
  },
  // --- Notes ---
  {
    rpcName: 'TIU DOCUMENTS BY CONTEXT',
    domain: 'notes',
    description: 'List TIU documents for a patient by context',
    recordParams: ['3', '1', '0', '', '', '', '1', '100'],
    outputSchema: {
      minLines: 0,
      maxLines: 500,
    },
    sanitizeFields: [
      { pattern: 'DFN', action: 'hash' },
      { pattern: '\\b[A-Z]+,[A-Z]+\\b', action: 'replace', replaceWith: 'PROVIDER,ANONYMOUS' },
    ],
    failureCases: [
      { name: 'empty', description: 'No documents', type: 'empty', fixtureContent: [] },
      { name: 'auth-fail', description: 'Missing context', type: 'auth-fail' },
    ],
  },
  // --- Orders ---
  {
    rpcName: 'ORWORB FASTUSER',
    domain: 'orders',
    description: 'Fast user notifications/alerts check',
    recordParams: [],
    outputSchema: {
      minLines: 0,
      maxLines: 100,
    },
    sanitizeFields: [],
    failureCases: [
      { name: 'empty', description: 'No notifications', type: 'empty', fixtureContent: [] },
    ],
  },
  // --- Labs ---
  {
    rpcName: 'ORWLRR INTERIMG',
    domain: 'labs',
    description: 'Interim lab results for a patient',
    recordParams: ['3'],
    outputSchema: {
      minLines: 0,
      maxLines: 2000,
    },
    sanitizeFields: [{ pattern: 'DFN', action: 'hash' }],
    failureCases: [
      { name: 'empty', description: 'No lab results', type: 'empty', fixtureContent: [] },
      { name: 'timeout', description: 'Large result set timeout', type: 'timeout' },
    ],
  },
  // --- Default Patient List ---
  {
    rpcName: 'ORQPT DEFAULT LIST SOURCE',
    domain: 'patients',
    description: 'Default patient list source (team/ward/clinic)',
    recordParams: [],
    outputSchema: {
      minLines: 1,
      maxLines: 5,
    },
    sanitizeFields: [],
    failureCases: [
      {
        name: 'empty',
        description: 'No default list configured',
        type: 'empty',
        fixtureContent: [''],
      },
    ],
  },
];

export function getContractByName(rpcName: string): RpcContract | undefined {
  return RPC_CONTRACTS.find((c) => c.rpcName === rpcName);
}

export function getAllContractedRpcNames(): string[] {
  return RPC_CONTRACTS.map((c) => c.rpcName);
}
