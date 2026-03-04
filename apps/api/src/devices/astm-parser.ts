/**
 * ASTM E1381/E1394 Parser — Frame + Record Parser
 *
 * Phase 382 (W21-P5): ASTM serial/TCP protocol parser for Point-of-Care
 * and laboratory analyzer devices. Handles ENQ/STX/ETX/EOT framing,
 * checksum validation, and H/P/O/R/C/L record extraction.
 *
 * Reference: ASTM E1381-02 (LIS2-A2), ASTM E1394-97 (LIS1-A)
 */

// ---------------------------------------------------------------------------
// ASTM Frame Constants
// ---------------------------------------------------------------------------

/** Start of text — frame data start */
export const ASTM_STX = 0x02;
/** End of text — frame data end (with checksum) */
export const ASTM_ETX = 0x03;
/** End of block — frame data end (intermediate, no checksum verify needed) */
export const ASTM_ETB = 0x17;
/** Enquiry — initiate transfer session */
export const ASTM_ENQ = 0x05;
/** End of transmission — session complete */
export const ASTM_EOT = 0x04;
/** Acknowledge */
export const ASTM_ACK = 0x06;
/** Negative acknowledge */
export const ASTM_NAK = 0x15;

// ---------------------------------------------------------------------------
// ASTM Record Types (per E1394)
// ---------------------------------------------------------------------------

export type AstmRecordType = 'H' | 'P' | 'O' | 'R' | 'C' | 'L' | 'M' | 'S' | 'Q';

export interface AstmField {
  /** Raw field value */
  raw: string;
  /** Components split by ^ */
  components: string[];
}

export interface AstmRecord {
  /** Record type character */
  type: AstmRecordType;
  /** Sequence number (field 0 for H is type + delimiter info) */
  seq: number;
  /** Parsed fields (pipe-delimited, components caret-delimited) */
  fields: AstmField[];
  /** Raw record line */
  raw: string;
}

// ---------------------------------------------------------------------------
// ASTM Frame
// ---------------------------------------------------------------------------

export interface AstmFrame {
  /** Frame number (1-7, cycling) */
  frameNumber: number;
  /** Record data (between STX+frameNum and ETX/ETB) */
  data: string;
  /** Checksum from the frame */
  checksum: string;
  /** Whether checksum validates */
  checksumValid: boolean;
  /** Whether this is an intermediate frame (ETB) vs final (ETX) */
  intermediate: boolean;
}

// ---------------------------------------------------------------------------
// ASTM Message (collection of records)
// ---------------------------------------------------------------------------

export interface AstmMessage {
  /** All parsed records in order */
  records: AstmRecord[];
  /** Header record (first H) */
  header: AstmRecord | null;
  /** Patient records */
  patients: AstmRecord[];
  /** Order records */
  orders: AstmRecord[];
  /** Result records (the observations) */
  results: AstmRecord[];
  /** Comment records */
  comments: AstmRecord[];
  /** Terminator record */
  terminator: AstmRecord | null;
  /** Sending system identifier (from H record) */
  senderId: string;
  /** Receiving system identifier (from H record) */
  receiverId: string;
  /** Timestamp from header */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Extracted observation (normalized from R records)
// ---------------------------------------------------------------------------

export interface AstmObservation {
  /** Analyte / test code */
  testCode: string;
  /** Analyte name (if available) */
  testName: string;
  /** Observed value */
  value: string;
  /** Units */
  units: string;
  /** Reference range string */
  referenceRange: string;
  /** Abnormal flag (H, L, HH, LL, N, etc.) */
  abnormalFlag: string;
  /** Result status */
  resultStatus: string;
  /** Specimen ID from the O record (if available) */
  specimenId: string;
  /** Patient ID from the P record (if available) */
  patientId: string;
}

export interface AstmParseResult {
  ok: boolean;
  message: AstmMessage | null;
  observations: AstmObservation[];
  frameCount: number;
  checksumErrors: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Checksum Calculation (ASTM E1381)
// ---------------------------------------------------------------------------

/**
 * Calculate ASTM checksum: sum of all bytes from frame number
 * through ETX/ETB (inclusive), mod 256, as two uppercase hex chars.
 */
export function calculateAstmChecksum(frameNumberAndData: string, termByte: number): string {
  let sum = 0;
  for (let i = 0; i < frameNumberAndData.length; i++) {
    sum += frameNumberAndData.charCodeAt(i);
  }
  sum += termByte; // ETX or ETB
  return (sum % 256).toString(16).toUpperCase().padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Frame Parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw ASTM frame (bytes between STX and CR LF).
 * Format: STX <frame#:1> <data> <ETX|ETB> <checksum:2> CR LF
 */
export function parseAstmFrame(raw: string): AstmFrame | null {
  if (raw.length < 5) return null;

  // If wrapped in STX...CRLF, strip them
  let content = raw;
  if (content.charCodeAt(0) === ASTM_STX) {
    content = content.slice(1);
  }
  // Trim trailing CR LF
  content = content.replace(/\r?\n$/, '');

  const frameNumber = parseInt(content[0], 10);
  if (isNaN(frameNumber)) return null;

  // Find ETX or ETB
  const etxIdx = content.indexOf(String.fromCharCode(ASTM_ETX));
  const etbIdx = content.indexOf(String.fromCharCode(ASTM_ETB));
  const termIdx = etxIdx >= 0 ? etxIdx : etbIdx;
  const intermediate = etbIdx >= 0 && (etxIdx < 0 || etbIdx < etxIdx);

  if (termIdx < 0) {
    // No terminator found — treat the whole thing as data
    return {
      frameNumber,
      data: content.slice(1),
      checksum: '',
      checksumValid: false,
      intermediate: false,
    };
  }

  const data = content.slice(1, termIdx);
  const checksumStr = content.slice(termIdx + 1, termIdx + 3);
  const termByte = intermediate ? ASTM_ETB : ASTM_ETX;

  // Verify checksum
  const frameNumberAndData = content.slice(0, termIdx);
  const expectedChecksum = calculateAstmChecksum(frameNumberAndData, termByte);
  const checksumValid = checksumStr.toUpperCase() === expectedChecksum;

  return {
    frameNumber,
    data,
    checksum: checksumStr,
    checksumValid,
    intermediate,
  };
}

// ---------------------------------------------------------------------------
// Record Parser
// ---------------------------------------------------------------------------

/**
 * Parse a single ASTM record line (e.g. "H|\^&|||...").
 * The field separator is `|`, component separator is `^`.
 */
export function parseAstmRecord(line: string): AstmRecord | null {
  if (!line || line.length < 2) return null;

  const type = line[0] as AstmRecordType;
  if (!'HPORCLMSQ'.includes(type)) return null;

  // Split by pipe (default ASTM field delimiter)
  const rawFields = line.split('|');
  const fields: AstmField[] = rawFields.map((f) => ({
    raw: f,
    components: f.split('^'),
  }));

  // Sequence number: for H it's always 1, for others it's in field[1]
  let seq = 1;
  if (type !== 'H' && fields.length > 1) {
    const parsed = parseInt(fields[1].raw, 10);
    if (!isNaN(parsed)) seq = parsed;
  }

  return { type, seq, fields, raw: line };
}

// ---------------------------------------------------------------------------
// Message Parser
// ---------------------------------------------------------------------------

/**
 * Parse an ASTM message from extracted frame data lines.
 * Input: array of record strings (one per line/frame).
 */
export function parseAstmMessage(recordLines: string[]): AstmMessage {
  const records: AstmRecord[] = [];
  for (const line of recordLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const rec = parseAstmRecord(trimmed);
    if (rec) records.push(rec);
  }

  const header = records.find((r) => r.type === 'H') || null;
  const patients = records.filter((r) => r.type === 'P');
  const orders = records.filter((r) => r.type === 'O');
  const results = records.filter((r) => r.type === 'R');
  const comments = records.filter((r) => r.type === 'C');
  const terminator = records.find((r) => r.type === 'L') || null;

  // H record fields: H|delimiters|messageId|...|senderId|...|receiverId|...|...|...|...|timestamp|...
  // Simplified: field[4]=senderId, field[9]=receiverId, field[13]=timestamp (varies by implementation)
  const senderId = header && header.fields.length > 4 ? header.fields[4].raw : '';
  const receiverId = header && header.fields.length > 9 ? header.fields[9].raw : '';
  const timestamp =
    header && header.fields.length > 13 ? header.fields[13].raw : new Date().toISOString();

  return {
    records,
    header,
    patients,
    orders,
    results,
    comments,
    terminator,
    senderId,
    receiverId,
    timestamp,
  };
}

// ---------------------------------------------------------------------------
// Observation Extraction
// ---------------------------------------------------------------------------

/**
 * Extract normalized observations from parsed ASTM message.
 * R record fields (typical ASTM E1394):
 *   R|seq|analyteCode|value|units|referenceRange|abnormalFlag|...|resultStatus
 *   (indices vary, using common layout)
 */
export function extractAstmObservations(message: AstmMessage): AstmObservation[] {
  const observations: AstmObservation[] = [];

  // Get patient ID from first P record (field[3] typically)
  const patientId =
    message.patients.length > 0 && message.patients[0].fields.length > 3
      ? message.patients[0].fields[3].raw
      : '';

  // Get specimen ID from first O record (field[2] typically)
  const specimenId =
    message.orders.length > 0 && message.orders[0].fields.length > 2
      ? message.orders[0].fields[2].raw
      : '';

  for (const r of message.results) {
    // R|seq|analyteId^analyteName|value|units|referenceRange|abnormalFlag|...|status
    const analyteField = r.fields.length > 2 ? r.fields[2] : { raw: '', components: [''] };
    const testCode = analyteField.components[0] || '';
    const testName = analyteField.components.length > 1 ? analyteField.components[1] : '';
    const value = r.fields.length > 3 ? r.fields[3].raw : '';
    const units = r.fields.length > 4 ? r.fields[4].raw : '';
    const referenceRange = r.fields.length > 5 ? r.fields[5].raw : '';
    const abnormalFlag = r.fields.length > 6 ? r.fields[6].raw : '';
    const resultStatus = r.fields.length > 8 ? r.fields[8].raw : '';

    observations.push({
      testCode,
      testName,
      value,
      units,
      referenceRange,
      abnormalFlag,
      resultStatus,
      specimenId,
      patientId,
    });
  }

  return observations;
}

// ---------------------------------------------------------------------------
// Full Parse Pipeline
// ---------------------------------------------------------------------------

/**
 * Parse raw ASTM data (either frame-level or record-level).
 * Accepts:
 * 1. Raw frames with STX/ETX delimiters (extracts data, validates checksums)
 * 2. Newline-separated record lines (H|...\nP|...\nR|...\nL|...)
 */
export function parseAstm(raw: string): AstmParseResult {
  try {
    // Check if this contains ASTM frame bytes (STX present)
    const hasFrames = raw.includes(String.fromCharCode(ASTM_STX));
    let recordLines: string[];
    let frameCount = 0;
    let checksumErrors = 0;

    if (hasFrames) {
      // Extract frames between STX markers
      const frameChunks = raw.split(String.fromCharCode(ASTM_STX)).filter(Boolean);
      const extractedData: string[] = [];

      for (const chunk of frameChunks) {
        const frame = parseAstmFrame(String.fromCharCode(ASTM_STX) + chunk);
        if (frame) {
          frameCount++;
          if (!frame.checksumValid && frame.checksum) checksumErrors++;
          if (frame.data) extractedData.push(frame.data);
        }
      }
      // Frame data may contain CR-separated records
      recordLines = extractedData
        .join('')
        .split(/\r/)
        .filter((l) => l.trim());
    } else {
      // Treat as newline/CR-separated records
      recordLines = raw.split(/[\r\n]+/).filter((l) => l.trim());
    }

    const message = parseAstmMessage(recordLines);
    const observations = extractAstmObservations(message);

    return {
      ok: true,
      message,
      observations,
      frameCount,
      checksumErrors,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: null,
      observations: [],
      frameCount: 0,
      checksumErrors: 0,
      error: err.message || 'ASTM parse error',
    };
  }
}
