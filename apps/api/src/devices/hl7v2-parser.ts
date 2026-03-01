/**
 * HL7 v2 MLLP Parser — Types + Parser
 *
 * Phase 381 (W21-P4): HL7 v2 message parser for ORU (results) and ORM
 * (orders) messages received via MLLP from medical devices and lab
 * information systems.
 *
 * Handles MLLP framing (VT/FS/CR), segment parsing, field extraction,
 * and observation normalization.
 */

// ---------------------------------------------------------------------------
// MLLP Framing Constants
// ---------------------------------------------------------------------------

/** Vertical Tab — MLLP start byte */
export const MLLP_VT = 0x0b;
/** File Separator — MLLP end byte */
export const MLLP_FS = 0x1c;
/** Carriage Return — MLLP trailing byte */
export const MLLP_CR = 0x0d;

// ---------------------------------------------------------------------------
// HL7 v2 Parsed Types
// ---------------------------------------------------------------------------

export interface Hl7Field {
  /** Full field value (including components) */
  raw: string;
  /** Components split by ^ */
  components: string[];
}

export interface Hl7Segment {
  /** Segment type (MSH, PID, OBR, OBX, etc.) */
  type: string;
  /** Indexed fields (1-based, field[0] = segment type) */
  fields: Hl7Field[];
}

export interface Hl7Message {
  /** Raw message text */
  raw: string;
  /** Parsed segments */
  segments: Hl7Segment[];
  /** Message type (e.g., "ORU^R01", "ORM^O01") */
  messageType: string;
  /** Message control ID (MSH-10) */
  controlId: string;
  /** Sending application (MSH-3) */
  sendingApp: string;
  /** Sending facility (MSH-4) */
  sendingFacility: string;
  /** Message timestamp (MSH-7) */
  timestamp: string;
  /** HL7 version (MSH-12) */
  version: string;
}

export interface Hl7Observation {
  /** OBX set ID */
  setId: string;
  /** Value type (NM, ST, CE, etc.) */
  valueType: string;
  /** Observation identifier (OBX-3) — code^text^system */
  observationId: string;
  /** Observation code */
  code: string;
  /** Code display text */
  codeText: string;
  /** Code system (e.g., LOINC, local) */
  codeSystem: string;
  /** Observation sub-ID (OBX-4) */
  subId: string;
  /** Observation value (OBX-5) */
  value: string;
  /** Units (OBX-6) */
  units: string;
  /** Reference range (OBX-7) */
  referenceRange: string;
  /** Abnormal flags (OBX-8) */
  abnormalFlags: string;
  /** Observation result status (OBX-11) */
  resultStatus: string;
  /** Observation timestamp (OBX-14 or OBR-7) */
  observationTimestamp: string;
}

export interface Hl7ParseResult {
  /** Whether parsing succeeded */
  ok: boolean;
  /** Parsed message (if ok) */
  message?: Hl7Message;
  /** Extracted observations (if ORU) */
  observations?: Hl7Observation[];
  /** Patient ID from PID-3 */
  patientId?: string;
  /** Error message (if !ok) */
  error?: string;
}

// ---------------------------------------------------------------------------
// MLLP Frame Extraction
// ---------------------------------------------------------------------------

/**
 * Extract HL7 message from MLLP frame.
 * Frame format: VT + message + FS + CR
 */
export function extractMllpMessage(buffer: Buffer): {
  message: string | null;
  remainder: Buffer;
} {
  const vtIndex = buffer.indexOf(MLLP_VT);
  if (vtIndex === -1) return { message: null, remainder: buffer };

  const fsIndex = buffer.indexOf(MLLP_FS, vtIndex + 1);
  if (fsIndex === -1) return { message: null, remainder: buffer };

  const message = buffer.subarray(vtIndex + 1, fsIndex).toString("utf-8");

  // Skip optional trailing CR
  const endIndex =
    fsIndex + 1 < buffer.length && buffer[fsIndex + 1] === MLLP_CR
      ? fsIndex + 2
      : fsIndex + 1;

  const remainder = buffer.subarray(endIndex);
  return { message, remainder };
}

// ---------------------------------------------------------------------------
// HL7 v2 Parser
// ---------------------------------------------------------------------------

/**
 * Parse an HL7 v2 message string into structured segments and fields.
 */
export function parseHl7Message(raw: string): Hl7ParseResult {
  if (!raw || !raw.startsWith("MSH")) {
    return { ok: false, error: "message must start with MSH" };
  }

  // Field separator is the character at position 3 (after "MSH")
  const fieldSep = raw.charAt(3);
  if (!fieldSep) {
    return { ok: false, error: "missing field separator" };
  }

  // Component separator is at MSH-2 position 0
  const encodingChars = raw.substring(4, 8);
  const componentSep = encodingChars.charAt(0) || "^";

  // Split into segments by \r or \n (handles both)
  const segmentLines = raw
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);

  const segments: Hl7Segment[] = segmentLines.map((line) => {
    const rawFields = line.split(fieldSep);
    const segType = rawFields[0];

    // For MSH, field[0] is "MSH", field[1] is the field separator itself
    const fields: Hl7Field[] = rawFields.map((f) => ({
      raw: f,
      components: f.split(componentSep),
    }));

    return { type: segType, fields };
  });

  // Extract MSH fields
  const msh = segments.find((s) => s.type === "MSH");
  if (!msh || msh.fields.length < 10) {
    return { ok: false, error: "invalid MSH segment" };
  }

  const messageType = msh.fields[9]?.raw || "UNKNOWN"; // MSH-9
  const controlId = msh.fields[10]?.raw || ""; // MSH-10
  const sendingApp = msh.fields[3]?.raw || ""; // MSH-3
  const sendingFacility = msh.fields[4]?.raw || ""; // MSH-4
  const timestamp = msh.fields[7]?.raw || ""; // MSH-7
  const version = msh.fields[12]?.raw || "2.3"; // MSH-12

  const message: Hl7Message = {
    raw,
    segments,
    messageType,
    controlId,
    sendingApp,
    sendingFacility,
    timestamp,
    version,
  };

  // Extract patient ID from PID-3
  const pid = segments.find((s) => s.type === "PID");
  const patientId = pid?.fields[3]?.components?.[0] || undefined;

  // Extract observations from OBX segments
  const observations: Hl7Observation[] = [];
  const obr = segments.find((s) => s.type === "OBR");
  const obrTimestamp = obr?.fields[7]?.raw || timestamp;

  for (const seg of segments) {
    if (seg.type !== "OBX") continue;

    const obxId = seg.fields[3]; // OBX-3: Observation Identifier
    observations.push({
      setId: seg.fields[1]?.raw || "",
      valueType: seg.fields[2]?.raw || "",
      observationId: obxId?.raw || "",
      code: obxId?.components?.[0] || "",
      codeText: obxId?.components?.[1] || "",
      codeSystem: obxId?.components?.[2] || "local",
      subId: seg.fields[4]?.raw || "",
      value: seg.fields[5]?.raw || "",
      units: seg.fields[6]?.components?.[0] || "",
      referenceRange: seg.fields[7]?.raw || "",
      abnormalFlags: seg.fields[8]?.raw || "",
      resultStatus: seg.fields[11]?.raw || "",
      observationTimestamp: seg.fields[14]?.raw || obrTimestamp,
    });
  }

  return {
    ok: true,
    message,
    observations,
    patientId,
  };
}

// ---------------------------------------------------------------------------
// ACK Generation
// ---------------------------------------------------------------------------

/**
 * Generate an HL7 v2 ACK message for a received message.
 */
export function generateAck(
  controlId: string,
  ackCode: "AA" | "AE" | "AR" = "AA",
  errorMessage?: string
): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .substring(0, 14);
  const lines = [
    `MSH|^~\\&|VISTA_EVOLVED|FACILITY|DEVICE|FACILITY|${ts}||ACK|${controlId}|P|2.3`,
    `MSA|${ackCode}|${controlId}${errorMessage ? `|${errorMessage}` : ""}`,
  ];
  return lines.join("\r");
}
