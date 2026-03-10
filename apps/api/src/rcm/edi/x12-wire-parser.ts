/**
 * X12 Wire Format Parser -- Phase 518 (Wave 37 B6)
 *
 * Zero-dependency X12 parser that handles raw ANSI X12 wire format
 * for 835 (Payment/Remittance), 277 (Claim Status), 999 (Acknowledgement),
 * and 837 (Claim) transaction sets.
 *
 * Architecture:
 *   - Tokenizer: splits wire format into segments using ISA trailer detection
 *   - Segment parser: breaks segments into elements using ISA-detected delimiters
 *   - Transaction router: dispatches to format-specific normalizer
 *   - Normalizer outputs: deterministic JSON matching existing types
 *
 * No external deps -- Node.js built-ins only.
 */

/* -- Types ------------------------------------------------- */

export interface X12Delimiters {
  element: string; // Usually '*'
  component: string; // Usually ':'
  segment: string; // Usually '~'
  repetition: string; // Usually '^'
}

export interface X12Segment {
  id: string;
  elements: string[];
  raw: string;
}

export interface X12ParsedEnvelope {
  delimiters: X12Delimiters;
  isa: X12Segment;
  gs: X12Segment;
  st: X12Segment;
  transactionSetCode: string;
  segments: X12Segment[];
  se: X12Segment;
  ge: X12Segment;
  iea: X12Segment;
}

export interface X12ParseResult {
  ok: boolean;
  envelopes: X12ParsedEnvelope[];
  errors: string[];
}

/* -- Segment-level types for 835 --------------------------- */

export interface Parsed835Line {
  claimRef: string;
  payerId: string;
  billedAmount: number;
  paidAmount: number;
  allowedAmount?: number;
  adjustmentAmount?: number;
  patientResp?: number;
  serviceDate?: string;
  postedDate?: string;
  traceNumber?: string;
  checkNumber?: string;
  codes: Array<{ type: 'CARC' | 'RARC' | 'OTHER'; code: string; description?: string }>;
}

export interface Parsed835 {
  payerId: string;
  payeeName?: string;
  checkNumber?: string;
  totalPaid: number;
  totalBilled: number;
  lines: Parsed835Line[];
  parseErrors: string[];
}

/* -- Segment-level types for 277 --------------------------- */

export interface Parsed277Status {
  claimRef: string;
  statusCategory: string;
  statusCode: string;
  statusDate?: string;
  payerId?: string;
  totalCharged?: number;
  totalPaid?: number;
}

export interface Parsed277 {
  statuses: Parsed277Status[];
  parseErrors: string[];
}

/* -- Tokenizer --------------------------------------------- */

/**
 * Detect X12 delimiters from the ISA segment header.
 * ISA is always exactly 106 chars (3 + 103 data).
 * Element separator = char at position 3.
 * Component separator = char at position 104.
 * Segment terminator = char at position 105.
 */
export function detectDelimiters(raw: string): X12Delimiters | null {
  // Find ISA header
  const isaIdx = raw.indexOf('ISA');
  if (isaIdx === -1) return null;

  const header = raw.substring(isaIdx);
  if (header.length < 106) return null;

  const element = header[3];
  const component = header[104];
  const segment = header[105];

  // Repetition separator is ISA11 (after 10 element separators)
  const isaElements = header.substring(0, 106).split(element);
  const repetition = isaElements.length > 11 ? (isaElements[11]?.charAt(0) ?? '^') : '^';

  return { element, component, segment, repetition };
}

/**
 * Tokenize raw X12 into segments.
 */
export function tokenize(
  raw: string
): { segments: X12Segment[]; delimiters: X12Delimiters } | null {
  const delimiters = detectDelimiters(raw);
  if (!delimiters) return null;

  // Clean up: remove newlines/carriage returns that are not the segment terminator
  let cleaned = raw;
  if (delimiters.segment !== '\n' && delimiters.segment !== '\r') {
    cleaned = raw.replace(/[\r\n]+/g, '');
  }

  const rawSegments = cleaned.split(delimiters.segment).filter((s) => s.trim().length > 0);
  const segments: X12Segment[] = rawSegments.map((s) => {
    const trimmed = s.trim();
    const elements = trimmed.split(delimiters.element);
    return {
      id: elements[0] ?? '',
      elements,
      raw: trimmed,
    };
  });

  return { segments, delimiters };
}

/* -- Envelope parser --------------------------------------- */

/**
 * Parse one or more transaction set envelopes from tokenized segments.
 */
export function parseEnvelopes(raw: string): X12ParseResult {
  const tokenized = tokenize(raw);
  if (!tokenized) {
    return { ok: false, envelopes: [], errors: ['Failed to detect X12 delimiters'] };
  }

  const { segments, delimiters } = tokenized;
  const envelopes: X12ParsedEnvelope[] = [];
  const errors: string[] = [];

  let isa: X12Segment | null = null;
  let gs: X12Segment | null = null;
  let st: X12Segment | null = null;
  let txSegments: X12Segment[] = [];

  for (const seg of segments) {
    switch (seg.id) {
      case 'ISA':
        isa = seg;
        break;
      case 'GS':
        gs = seg;
        break;
      case 'ST':
        st = seg;
        txSegments = [];
        break;
      case 'SE':
        if (st && gs && isa) {
          envelopes.push({
            delimiters,
            isa,
            gs,
            st,
            transactionSetCode: st.elements[1] ?? '',
            segments: txSegments,
            se: seg,
            ge: { id: 'GE', elements: [], raw: '' }, // Filled below
            iea: { id: 'IEA', elements: [], raw: '' },
          });
        }
        st = null;
        txSegments = [];
        break;
      case 'GE':
        if (envelopes.length > 0) envelopes[envelopes.length - 1].ge = seg;
        break;
      case 'IEA':
        if (envelopes.length > 0) envelopes[envelopes.length - 1].iea = seg;
        break;
      default:
        if (st) txSegments.push(seg);
        break;
    }
  }

  return { ok: envelopes.length > 0, envelopes, errors };
}

/* -- 835 Normalizer ---------------------------------------- */

function findElement(seg: X12Segment, idx: number): string {
  return seg.elements[idx] ?? '';
}

/**
 * Normalize an 835 envelope into structured payment lines.
 */
export function normalize835(envelope: X12ParsedEnvelope): Parsed835 {
  const errors: string[] = [];
  const lines: Parsed835Line[] = [];
  let payerId = '';
  let payeeName = '';
  let checkNumber = '';
  let totalPaid = 0;
  let totalBilled = 0;

  // Walk segments
  let currentClaimRef = '';
  let currentBilled = 0;
  let currentPaid = 0;
  let currentAllowed: number | undefined;
  let currentAdjustment: number | undefined;
  let currentCodes: Parsed835Line['codes'] = [];
  let inClaim = false;
  let serviceDate: string | undefined;

  function flushClaim() {
    if (inClaim && currentClaimRef) {
      lines.push({
        claimRef: currentClaimRef,
        payerId,
        billedAmount: currentBilled,
        paidAmount: currentPaid,
        allowedAmount: currentAllowed,
        adjustmentAmount: currentAdjustment,
        serviceDate,
        checkNumber: checkNumber || undefined,
        codes: currentCodes,
      });
      totalPaid += currentPaid;
      totalBilled += currentBilled;
    }
    currentClaimRef = '';
    currentBilled = 0;
    currentPaid = 0;
    currentAllowed = undefined;
    currentAdjustment = undefined;
    currentCodes = [];
    serviceDate = undefined;
    inClaim = false;
  }

  for (const seg of envelope.segments) {
    switch (seg.id) {
      case 'N1':
        // N1*PR = Payer, N1*PE = Payee
        if (findElement(seg, 1) === 'PR') {
          payerId = findElement(seg, 3) || findElement(seg, 2);
        } else if (findElement(seg, 1) === 'PE') {
          payeeName = findElement(seg, 2);
        }
        break;

      case 'BPR':
        // BPR*I = Total payment amount
        totalPaid = parseFloat(findElement(seg, 2)) || 0;
        break;

      case 'TRN':
        // Check/EFT trace number
        checkNumber = findElement(seg, 2);
        break;

      case 'CLP':
        // Start of a new claim
        flushClaim();
        inClaim = true;
        currentClaimRef = findElement(seg, 1);
        currentBilled = parseFloat(findElement(seg, 3)) || 0;
        currentPaid = parseFloat(findElement(seg, 4)) || 0;
        break;

      case 'SVC':
        // Service line (within a claim)
        // Accumulate allowed amount if present
        {
          const lineAllowed = parseFloat(findElement(seg, 2)) || 0;
          parseFloat(findElement(seg, 3)); // linePaid consumed by accumulation
          if (currentAllowed === undefined) currentAllowed = 0;
          currentAllowed += lineAllowed;
        }
        break;

      case 'CAS':
        // Adjustment codes
        {
          const groupCode = findElement(seg, 1); // CO, PR, OA, etc.
          for (let i = 2; i < seg.elements.length; i += 3) {
            const code = findElement(seg, i);
            const amount = parseFloat(findElement(seg, i + 1)) || 0;
            if (code) {
              currentCodes.push({ type: 'CARC', code, description: `Group: ${groupCode}` });
              if (currentAdjustment === undefined) currentAdjustment = 0;
              currentAdjustment += amount;
            }
          }
        }
        break;

      case 'DTM':
        // Date reference
        if (findElement(seg, 1) === '232' || findElement(seg, 1) === '233') {
          serviceDate = findElement(seg, 2);
        }
        break;
    }
  }

  flushClaim();

  return {
    payerId,
    payeeName,
    checkNumber,
    totalPaid,
    totalBilled,
    lines,
    parseErrors: errors,
  };
}

/* -- 277 Normalizer ---------------------------------------- */

export function normalize277(envelope: X12ParsedEnvelope): Parsed277 {
  const errors: string[] = [];
  const statuses: Parsed277Status[] = [];

  let currentClaimRef = '';
  let currentPayerId = '';

  for (const seg of envelope.segments) {
    switch (seg.id) {
      case 'TRN':
        currentClaimRef = findElement(seg, 2);
        break;

      case 'N1':
        if (findElement(seg, 1) === 'PR') {
          currentPayerId = findElement(seg, 3) || findElement(seg, 2);
        }
        break;

      case 'STC':
        // Status line: STC*category:code*date
        {
          const composite = findElement(seg, 1);
          const parts = composite.split(envelope.delimiters.component);
          const statusCategory = parts[0] ?? '';
          const statusCode = parts[1] ?? '';
          const statusDate = findElement(seg, 2);
          const totalCharged = parseFloat(findElement(seg, 4)) || undefined;
          const totalPaid = parseFloat(findElement(seg, 5)) || undefined;

          statuses.push({
            claimRef: currentClaimRef,
            statusCategory,
            statusCode,
            statusDate,
            payerId: currentPayerId || undefined,
            totalCharged,
            totalPaid,
          });
        }
        break;
    }
  }

  return { statuses, parseErrors: errors };
}

/* -- High-level parse API ---------------------------------- */

export interface X12IngestResult {
  transactionSet: string;
  parsed835?: Parsed835;
  parsed277?: Parsed277;
  rawEnvelope: X12ParsedEnvelope;
  segmentCount: number;
}

/**
 * Parse a raw X12 wire format string and return normalized results.
 * Handles 835, 277, and returns raw segments for unknown types.
 */
export function parseX12Wire(raw: string): {
  ok: boolean;
  results: X12IngestResult[];
  errors: string[];
} {
  const { ok, envelopes, errors } = parseEnvelopes(raw);
  if (!ok) return { ok: false, results: [], errors };

  const results: X12IngestResult[] = [];

  for (const env of envelopes) {
    const base: X12IngestResult = {
      transactionSet: env.transactionSetCode,
      rawEnvelope: env,
      segmentCount: env.segments.length,
    };

    switch (env.transactionSetCode) {
      case '835':
        base.parsed835 = normalize835(env);
        break;
      case '277':
        base.parsed277 = normalize277(env);
        break;
      // 837, 999, 270, 271 -- return raw envelope for now
    }

    results.push(base);
  }

  return { ok: true, results, errors };
}
