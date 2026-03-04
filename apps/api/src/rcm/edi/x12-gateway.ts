/**
 * X12 Gateway Service — Inbound Parser, Validator, Ack Generator & Router
 *
 * Phase 321 (W14-P5): Provides the missing inbound X12 processing layer.
 *
 * Architecture:
 *  1. Raw X12 text → parse into typed envelope + segments
 *  2. Envelope validation (ISA/GS/ST field lengths, version, control numbers)
 *  3. 999/TA1 acknowledgment generation for inbound transactions
 *  4. Transaction routing — identify ST-SE sets and dispatch to processors
 *  5. Control number uniqueness tracking for duplicate detection
 *
 * Depends on:
 *  - rcm/edi/types.ts — X12TransactionSet, IsaEnvelope, GsEnvelope, EdiAcknowledgment
 *  - rcm/edi/ack-status-processor.ts — ingestAck, ingestStatusUpdate
 *  - rcm/edi/remit-processor.ts — ingestRemittance
 */

import type { X12TransactionSet, IsaEnvelope, GsEnvelope } from './types.js';

/* ═══════════════════════════════════════════════════════════════════
   1. RAW X12 PARSER
   ═══════════════════════════════════════════════════════════════════ */

export interface X12Segment {
  id: string; // segment identifier (ISA, GS, ST, BHT, CLP, etc.)
  elements: string[]; // element values (index 0 = segment ID)
  raw: string; // original segment text
  position: number; // 0-based position in interchange
}

export interface X12TransactionSetParsed {
  controlNumber: string; // ST02
  transactionSet: string; // ST01 (837, 835, 999, etc.)
  segments: X12Segment[];
  segmentCount: number; // SE01 (declared count)
}

export interface X12FunctionalGroup {
  envelope: GsEnvelope;
  transactionSets: X12TransactionSetParsed[];
  controlNumber: string; // GE02
  declaredTxCount: number; // GE01
}

export interface X12Interchange {
  envelope: IsaEnvelope;
  functionalGroups: X12FunctionalGroup[];
  segmentTerminator: string;
  elementSeparator: string;
  subElementSeparator: string;
  controlNumber: string; // IEA02
  declaredGroupCount: number; // IEA01
  rawText: string;
}

export interface X12ParseResult {
  ok: boolean;
  interchange?: X12Interchange;
  errors: X12ParseError[];
}

export interface X12ParseError {
  code: string;
  message: string;
  segment?: string;
  position?: number;
  severity: 'fatal' | 'error' | 'warning';
}

/**
 * Parse raw X12 wire-format text into a structured interchange.
 *
 * ISA is always exactly 106 characters with fixed-width elements.
 * Byte 3 = element separator, byte 105 = segment terminator,
 * ISA16 (byte 104) = sub-element separator.
 */
export function parseX12(rawText: string): X12ParseResult {
  const errors: X12ParseError[] = [];
  const text = rawText.trim();

  if (text.length < 106) {
    return {
      ok: false,
      errors: [
        {
          code: 'PARSE-001',
          message: 'Input too short for ISA segment (need 106+ chars)',
          severity: 'fatal',
        },
      ],
    };
  }

  if (!text.startsWith('ISA')) {
    return {
      ok: false,
      errors: [
        { code: 'PARSE-002', message: 'Input does not start with ISA segment', severity: 'fatal' },
      ],
    };
  }

  // Detect delimiters from ISA
  const elementSep = text[3];
  const subElementSep = text[104];
  const segTerminator = text[105];

  // Split all segments
  const segmentTexts = text
    .split(segTerminator)
    .map((s) => s.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean);

  const segments: X12Segment[] = segmentTexts.map((raw, i) => {
    const elements = raw.split(elementSep);
    return { id: elements[0], elements, raw, position: i };
  });

  if (segments.length < 4) {
    return {
      ok: false,
      errors: [
        {
          code: 'PARSE-003',
          message: 'Too few segments for a valid interchange',
          severity: 'fatal',
        },
      ],
    };
  }

  // Parse ISA envelope
  const isaElements = segments[0].elements;
  if (isaElements.length < 17) {
    errors.push({
      code: 'PARSE-004',
      message: `ISA has ${isaElements.length} elements, expected 17`,
      severity: 'error',
    });
  }

  const isaEnvelope: IsaEnvelope = {
    senderQualifier: (isaElements[5] || '').trim(),
    senderId: (isaElements[6] || '').trim(),
    receiverQualifier: (isaElements[7] || '').trim(),
    receiverId: (isaElements[8] || '').trim(),
    date: (isaElements[9] || '').trim(),
    time: (isaElements[10] || '').trim(),
    versionNumber: (isaElements[12] || '').trim(),
    controlNumber: (isaElements[13] || '').trim(),
    usageIndicator: (isaElements[15] || 'T').trim() as 'T' | 'P',
  };

  // Parse functional groups and transaction sets
  const functionalGroups: X12FunctionalGroup[] = [];
  let currentGroup: X12FunctionalGroup | null = null;
  let currentTx: X12TransactionSetParsed | null = null;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.id === 'GS') {
      currentGroup = {
        envelope: {
          functionalCode: (seg.elements[1] || '').trim(),
          senderId: (seg.elements[2] || '').trim(),
          receiverId: (seg.elements[3] || '').trim(),
          controlNumber: (seg.elements[6] || '').trim(),
          versionCode: (seg.elements[8] || '').trim(),
        },
        transactionSets: [],
        controlNumber: '',
        declaredTxCount: 0,
      };
    } else if (seg.id === 'GE' && currentGroup) {
      currentGroup.declaredTxCount = parseInt(seg.elements[1] || '0', 10);
      currentGroup.controlNumber = (seg.elements[2] || '').trim();
      functionalGroups.push(currentGroup);
      currentGroup = null;
    } else if (seg.id === 'ST' && currentGroup) {
      currentTx = {
        transactionSet: (seg.elements[1] || '').trim(),
        controlNumber: (seg.elements[2] || '').trim(),
        segments: [seg],
        segmentCount: 0,
      };
    } else if (seg.id === 'SE' && currentTx && currentGroup) {
      currentTx.segmentCount = parseInt(seg.elements[1] || '0', 10);
      currentTx.segments.push(seg);
      currentGroup.transactionSets.push(currentTx);
      currentTx = null;
    } else if (seg.id === 'IEA') {
      // Interchange trailer — handled below
    } else if (currentTx) {
      currentTx.segments.push(seg);
    }
  }

  // Parse IEA
  const ieaSeg = segments.find((s) => s.id === 'IEA');
  const declaredGroupCount = ieaSeg ? parseInt(ieaSeg.elements[1] || '0', 10) : 0;
  const ieaControlNumber = ieaSeg ? (ieaSeg.elements[2] || '').trim() : '';

  const interchange: X12Interchange = {
    envelope: isaEnvelope,
    functionalGroups,
    segmentTerminator: segTerminator,
    elementSeparator: elementSep,
    subElementSeparator: subElementSep,
    controlNumber: ieaControlNumber,
    declaredGroupCount,
    rawText: text,
  };

  return { ok: errors.every((e) => e.severity !== 'fatal'), interchange, errors };
}

/* ═══════════════════════════════════════════════════════════════════
   2. ENVELOPE VALIDATION
   ═══════════════════════════════════════════════════════════════════ */

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: X12ParseError[];
  warnings: X12ParseError[];
}

const ISA_VERSION_CODES = new Set(['00501', '00401', '00402']);
const GS_FUNCTIONAL_CODES = new Set(['HC', 'HP', 'FA', 'HN', 'HI', 'HS', 'HR', 'HB', 'DX', 'TX']);

export function validateEnvelope(interchange: X12Interchange): EnvelopeValidationResult {
  const errors: X12ParseError[] = [];
  const warnings: X12ParseError[] = [];
  const isa = interchange.envelope;

  // ISA field validations
  if (!ISA_VERSION_CODES.has(isa.versionNumber)) {
    errors.push({
      code: 'ENV-001',
      message: `Unsupported ISA version: ${isa.versionNumber}`,
      severity: 'error',
    });
  }
  if (isa.senderId.length === 0) {
    errors.push({ code: 'ENV-002', message: 'ISA06 sender ID is empty', severity: 'error' });
  }
  if (isa.receiverId.length === 0) {
    errors.push({ code: 'ENV-003', message: 'ISA08 receiver ID is empty', severity: 'error' });
  }
  if (!/^\d{9}$/.test(isa.controlNumber)) {
    errors.push({
      code: 'ENV-004',
      message: `ISA13 control number must be 9 digits: ${isa.controlNumber}`,
      severity: 'error',
    });
  }
  if (isa.usageIndicator !== 'T' && isa.usageIndicator !== 'P') {
    errors.push({
      code: 'ENV-005',
      message: `ISA15 must be T or P: ${isa.usageIndicator}`,
      severity: 'error',
    });
  }

  // IEA count check
  if (interchange.declaredGroupCount !== interchange.functionalGroups.length) {
    errors.push({
      code: 'ENV-006',
      message: `IEA01 declares ${interchange.declaredGroupCount} groups but found ${interchange.functionalGroups.length}`,
      severity: 'error',
    });
  }

  // IEA control number must match ISA
  if (interchange.controlNumber !== isa.controlNumber) {
    errors.push({
      code: 'ENV-007',
      message: `IEA02 (${interchange.controlNumber}) does not match ISA13 (${isa.controlNumber})`,
      severity: 'error',
    });
  }

  // Functional group validations
  for (const group of interchange.functionalGroups) {
    if (!GS_FUNCTIONAL_CODES.has(group.envelope.functionalCode)) {
      warnings.push({
        code: 'ENV-010',
        message: `Unknown GS01 functional code: ${group.envelope.functionalCode}`,
        severity: 'warning',
      });
    }
    if (group.declaredTxCount !== group.transactionSets.length) {
      errors.push({
        code: 'ENV-011',
        message: `GE01 declares ${group.declaredTxCount} TXs but group has ${group.transactionSets.length}`,
        severity: 'error',
      });
    }
    if (group.controlNumber !== group.envelope.controlNumber) {
      errors.push({
        code: 'ENV-012',
        message: `GE02 (${group.controlNumber}) does not match GS06 (${group.envelope.controlNumber})`,
        severity: 'error',
      });
    }

    // Transaction set validations
    for (const tx of group.transactionSets) {
      const actualCount = tx.segments.length;
      if (tx.segmentCount !== actualCount) {
        errors.push({
          code: 'ENV-020',
          message: `SE01 declares ${tx.segmentCount} segments but found ${actualCount} in ST ${tx.controlNumber}`,
          severity: 'error',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   3. 999 / TA1 ACKNOWLEDGMENT GENERATION
   ═══════════════════════════════════════════════════════════════════ */

export interface AckGenerationOptions {
  /** Our ISA sender ID (the acknowledger) */
  senderId: string;
  /** Our ISA sender qualifier */
  senderQualifier?: string;
  /** Accept all transaction sets, or specific acceptances/rejections */
  overrides?: Map<string, { accepted: boolean; errorCode?: string; errorMsg?: string }>;
}

/**
 * Generate a TA1 interchange acknowledgment for the inbound ISA envelope.
 * TA1 acknowledges receipt at the interchange level.
 */
export function generateTA1(
  interchange: X12Interchange,
  accepted: boolean,
  options: AckGenerationOptions,
  errorCode?: string
): string {
  const isa = interchange.envelope;
  const sep = interchange.elementSeparator;
  const term = interchange.segmentTerminator;
  const now = new Date();
  const date = formatISADate(now);
  const time = formatISATime(now);
  const ctrlNum = generateControlNumber();

  // TA1 responds FROM us TO original sender
  const isaLine = buildISA(
    options.senderId,
    options.senderQualifier || 'ZZ',
    isa.senderId,
    isa.senderQualifier,
    date,
    time,
    ctrlNum,
    isa.usageIndicator,
    sep
  );

  // TA1 segment: interchange control number, date, time, ack code, note code
  // Ack codes: A = Accepted, R = Rejected, E = Accepted with errors
  const ackCode = accepted ? 'A' : 'R';
  const noteCode = errorCode || (accepted ? '000' : '022'); // 022 = invalid ISA control number
  const ta1 = `TA1${sep}${isa.controlNumber}${sep}${isa.date}${sep}${isa.time}${sep}${ackCode}${sep}${noteCode}`;

  const ieaLine = `IEA${sep}0${sep}${padControlNumber(ctrlNum)}`;

  return [isaLine, ta1, ieaLine].join(term) + term;
}

/**
 * Generate a 999 Implementation Acknowledgment for each functional group.
 * Responds with AK1 (functional group ack header), AK2/IK3/IK4 per TX, AK9 (group trailer).
 */
export function generate999(
  interchange: X12Interchange,
  validationResult: EnvelopeValidationResult,
  options: AckGenerationOptions
): string {
  const isa = interchange.envelope;
  const sep = interchange.elementSeparator;
  const term = interchange.segmentTerminator;
  const now = new Date();
  const date = formatISADate(now);
  const time = formatISATime(now);
  const ctrlNum = generateControlNumber();

  const lines: string[] = [];

  // ISA: from us to original sender
  lines.push(
    buildISA(
      options.senderId,
      options.senderQualifier || 'ZZ',
      isa.senderId,
      isa.senderQualifier,
      date,
      time,
      ctrlNum,
      isa.usageIndicator,
      sep
    )
  );

  let gsCounter = 0;
  for (const group of interchange.functionalGroups) {
    gsCounter++;
    const gsCtrl = padControlNumber(String(gsCounter));

    // GS for 999 response
    lines.push(
      `GS${sep}FA${sep}${options.senderId}${sep}${group.envelope.senderId}${sep}${formatGSDate(now)}${sep}${formatGSTime(now)}${sep}${gsCtrl}${sep}X${sep}005010X231A1`
    );

    // One ST per functional group (correct X12 999 structure)
    const stCtrl = padST(String(gsCounter));
    let segCount = 2; // ST + SE (counted below)

    lines.push(`ST${sep}999${sep}${stCtrl}${sep}005010X231A1`);

    // AK1: functional group header acknowledgment (once per group)
    lines.push(
      `AK1${sep}${group.envelope.functionalCode}${sep}${group.envelope.controlNumber}${sep}${group.envelope.versionCode}`
    );
    segCount++;

    // AK2/IK5 pairs for each transaction set in this group
    for (const tx of group.transactionSets) {
      const override = options.overrides?.get(tx.controlNumber);
      const txAccepted = override ? override.accepted : validationResult.valid;

      lines.push(`AK2${sep}${tx.transactionSet}${sep}${tx.controlNumber}`);
      segCount++;

      if (!txAccepted && override?.errorCode) {
        // IK3: segment error
        lines.push(
          `IK3${sep}${override.errorCode}${sep}1${sep}${override.errorMsg || 'Error'}${sep}5`
        );
        segCount++;
      }

      // IK5: transaction set ack trailer
      const ik5Code = txAccepted ? 'A' : 'R';
      lines.push(`IK5${sep}${ik5Code}`);
      segCount++;
    }

    // AK9: functional group response trailer (once per group, outside TX loop)
    const txTotal = group.transactionSets.length;
    const accepted999 = group.transactionSets.filter((t) => {
      const ov = options.overrides?.get(t.controlNumber);
      return ov ? ov.accepted : validationResult.valid;
    }).length;
    const ak9AllAccepted = accepted999 === txTotal;
    const ak9Code = ak9AllAccepted ? 'A' : accepted999 === 0 ? 'R' : 'P';
    lines.push(`AK9${sep}${ak9Code}${sep}${txTotal}${sep}${txTotal}${sep}${accepted999}`);
    segCount++;

    lines.push(`SE${sep}${segCount}${sep}${stCtrl}`);

    // One ST per GS means GE count is always 1
    lines.push(`GE${sep}1${sep}${gsCtrl}`);
  }

  lines.push(`IEA${sep}${gsCounter}${sep}${padControlNumber(ctrlNum)}`);

  return lines.join(term) + term;
}

/* ═══════════════════════════════════════════════════════════════════
   4. INBOUND TRANSACTION ROUTER
   ═══════════════════════════════════════════════════════════════════ */

export type TransactionHandler = (
  tx: X12TransactionSetParsed,
  group: X12FunctionalGroup,
  interchange: X12Interchange
) => Promise<RoutingResult>;

export interface RoutingResult {
  handled: boolean;
  transactionSet: string;
  controlNumber: string;
  accepted: boolean;
  error?: string;
}

export interface GatewayRoutingResult {
  interchangeControlNumber: string;
  totalTransactions: number;
  results: RoutingResult[];
  ta1Ack?: string;
  ack999?: string;
}

/** Registry of handlers per transaction set type */
const txHandlers = new Map<string, TransactionHandler>();

export function registerTransactionHandler(txSet: string, handler: TransactionHandler): void {
  txHandlers.set(txSet, handler);
}

export function getRegisteredHandlers(): string[] {
  return [...txHandlers.keys()];
}

/**
 * Route all transaction sets in an interchange to registered handlers.
 * Returns per-TX results + generated TA1 and 999 acks.
 */
export async function routeInboundInterchange(
  interchange: X12Interchange,
  ackOptions: AckGenerationOptions
): Promise<GatewayRoutingResult> {
  const results: RoutingResult[] = [];

  for (const group of interchange.functionalGroups) {
    for (const tx of group.transactionSets) {
      const handler = txHandlers.get(tx.transactionSet);
      if (handler) {
        try {
          const result = await handler(tx, group, interchange);
          results.push(result);
        } catch (err: any) {
          results.push({
            handled: false,
            transactionSet: tx.transactionSet,
            controlNumber: tx.controlNumber,
            accepted: false,
            error: err.message || 'handler_error',
          });
        }
      } else {
        results.push({
          handled: false,
          transactionSet: tx.transactionSet,
          controlNumber: tx.controlNumber,
          accepted: false,
          error: `no_handler_registered_for_${tx.transactionSet}`,
        });
      }
    }
  }

  // Generate acks
  const envResult = validateEnvelope(interchange);
  const overrides = new Map<string, { accepted: boolean; errorCode?: string; errorMsg?: string }>();
  for (const r of results) {
    overrides.set(r.controlNumber, {
      accepted: r.accepted,
      errorCode: r.accepted ? undefined : '5',
      errorMsg: r.error,
    });
  }

  const allAccepted = results.every((r) => r.accepted);
  const ta1Ack = generateTA1(interchange, allAccepted, ackOptions);
  const ack999 = generate999(interchange, envResult, { ...ackOptions, overrides });

  return {
    interchangeControlNumber: interchange.envelope.controlNumber,
    totalTransactions: results.length,
    results,
    ta1Ack,
    ack999,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   5. CONTROL NUMBER TRACKING (duplicate detection)
   ═══════════════════════════════════════════════════════════════════ */

interface ControlNumberEntry {
  controlNumber: string;
  type: 'isa' | 'gs' | 'st';
  senderId: string;
  receivedAt: string;
  transactionSet?: string;
}

const controlNumberStore = new Map<string, ControlNumberEntry>();
const MAX_CONTROL_NUMBERS = 100_000;

function controlNumberKey(type: string, senderId: string, controlNumber: string): string {
  return `${type}:${senderId}:${controlNumber}`;
}

/**
 * Check if a control number has been seen before (duplicate detection).
 * Returns true if this is a DUPLICATE.
 */
export function isDuplicateControlNumber(
  type: 'isa' | 'gs' | 'st',
  senderId: string,
  controlNumber: string
): boolean {
  return controlNumberStore.has(controlNumberKey(type, senderId, controlNumber));
}

/**
 * Record a control number as seen.
 */
export function recordControlNumber(
  type: 'isa' | 'gs' | 'st',
  senderId: string,
  controlNumber: string,
  transactionSet?: string
): void {
  // Evict oldest if at capacity (simple FIFO)
  if (controlNumberStore.size >= MAX_CONTROL_NUMBERS) {
    const firstKey = controlNumberStore.keys().next().value;
    if (firstKey) controlNumberStore.delete(firstKey);
  }

  controlNumberStore.set(controlNumberKey(type, senderId, controlNumber), {
    controlNumber,
    type,
    senderId,
    receivedAt: new Date().toISOString(),
    transactionSet,
  });
}

export function getControlNumberStats(): {
  total: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = { isa: 0, gs: 0, st: 0 };
  for (const entry of controlNumberStore.values()) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  return { total: controlNumberStore.size, byType };
}

export function clearControlNumbers(): void {
  controlNumberStore.clear();
}

/**
 * Full inbound processing: parse, validate, check duplicates, record, route.
 */
export async function processInboundX12(
  rawText: string,
  ackOptions: AckGenerationOptions
): Promise<{
  parseResult: X12ParseResult;
  validationResult?: EnvelopeValidationResult;
  routingResult?: GatewayRoutingResult;
  isDuplicate: boolean;
}> {
  const parseResult = parseX12(rawText);
  if (!parseResult.ok || !parseResult.interchange) {
    return { parseResult, isDuplicate: false };
  }

  const interchange = parseResult.interchange;

  // Check for duplicate interchange
  const dup = isDuplicateControlNumber(
    'isa',
    interchange.envelope.senderId,
    interchange.envelope.controlNumber
  );
  if (dup) {
    // Still generate TA1 but flag as duplicate
    const ta1 = generateTA1(interchange, false, ackOptions, '025'); // 025 = duplicate ISA13
    return {
      parseResult,
      isDuplicate: true,
      routingResult: {
        interchangeControlNumber: interchange.envelope.controlNumber,
        totalTransactions: 0,
        results: [],
        ta1Ack: ta1,
      },
    };
  }

  // Record control numbers
  recordControlNumber('isa', interchange.envelope.senderId, interchange.envelope.controlNumber);
  for (const group of interchange.functionalGroups) {
    recordControlNumber('gs', interchange.envelope.senderId, group.envelope.controlNumber);
    for (const tx of group.transactionSets) {
      recordControlNumber('st', interchange.envelope.senderId, tx.controlNumber, tx.transactionSet);
    }
  }

  // Validate envelope (after recording — failed validation still burns the control number
  // to prevent replay, but we record AFTER duplicate check above which is the important guard)
  const validationResult = validateEnvelope(interchange);

  // Route transactions
  const routingResult = await routeInboundInterchange(interchange, ackOptions);

  return { parseResult, validationResult, routingResult, isDuplicate: false };
}

/* ═══════════════════════════════════════════════════════════════════
   6. X12 SEGMENT QUERY HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/** Find all segments with a given ID in a transaction set */
export function findSegments(tx: X12TransactionSetParsed, segId: string): X12Segment[] {
  return tx.segments.filter((s) => s.id === segId);
}

/** Get a specific element value from a segment (1-based index) */
export function getElement(segment: X12Segment, index: number): string {
  return (segment.elements[index] || '').trim();
}

/** Find the first segment with a given ID */
export function findFirstSegment(
  tx: X12TransactionSetParsed,
  segId: string
): X12Segment | undefined {
  return tx.segments.find((s) => s.id === segId);
}

/** Map transaction set identifier to X12TransactionSet type */
export function mapTransactionSetType(
  stCode: string,
  gsVersionCode?: string
): X12TransactionSet | undefined {
  const MAP: Record<string, X12TransactionSet> = {
    '837P': '837P',
    '837I': '837I',
    '835': '835',
    '270': '270',
    '271': '271',
    '276': '276',
    '277': '277',
    '278': '278',
    '275': '275',
    '999': '999',
    '997': '997',
    TA1: 'TA1',
  };
  // Bare "837" — disambiguate via GS08 version code (HP=professional, HI=institutional)
  if (stCode === '837') {
    if (gsVersionCode?.includes('HP') || gsVersionCode?.includes('837P')) return '837P';
    if (gsVersionCode?.includes('HI') || gsVersionCode?.includes('837I')) return '837I';
    return '837P'; // default to professional when ambiguous
  }
  return MAP[stCode];
}

/* ═══════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════════════════════════════ */

let _ctrlSeq = Math.floor(Math.random() * 900000000);

function generateControlNumber(): string {
  _ctrlSeq = (_ctrlSeq + 1) % 999999999;
  return String(_ctrlSeq).padStart(9, '0');
}

function padControlNumber(num: string): string {
  return num.padStart(9, '0');
}

function padST(num: string): string {
  return num.padStart(4, '0');
}

function formatISADate(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function formatISATime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}${mm}`;
}

function formatGSDate(d: Date): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function formatGSTime(d: Date): string {
  return formatISATime(d);
}

function buildISA(
  senderId: string,
  senderQual: string,
  receiverId: string,
  receiverQual: string,
  date: string,
  time: string,
  controlNumber: string,
  usageIndicator: 'T' | 'P',
  sep: string
): string {
  // ISA segments are fixed-width with trailing spaces
  const pad = (s: string, len: number) => s.padEnd(len, ' ').slice(0, len);
  return [
    'ISA',
    '00', // ISA01 - Auth info qualifier
    pad('', 10), // ISA02 - Auth info
    '00', // ISA03 - Security info qualifier
    pad('', 10), // ISA04 - Security info
    pad(senderQual, 2), // ISA05
    pad(senderId, 15), // ISA06
    pad(receiverQual, 2), // ISA07
    pad(receiverId, 15), // ISA08
    date, // ISA09
    time, // ISA10
    '^', // ISA11 - Repetition separator
    '00501', // ISA12 - Version
    padControlNumber(controlNumber), // ISA13
    '0', // ISA14 - Ack requested
    usageIndicator, // ISA15
    ':', // ISA16 - Sub-element separator
  ].join(sep);
}
