/**
 * HL7v2 Engine — Message Parser
 *
 * Phase 239 (Wave 6 P2): Zero-dependency HL7v2 message parser.
 * Handles segment splitting, field parsing, MSH extraction.
 *
 * HL7v2 message structure:
 *   MSH|^~\&|SendApp|SendFac|RecvApp|RecvFac|20250722120000||ADT^A01|MSG001|P|2.4
 *   PID|1||12345^^^MRN||DOE^JOHN||19800101|M
 *   ...
 *
 * Segments are CR-delimited (\r). Fields are pipe-delimited (|).
 * MSH-1 is the field separator itself. MSH-2 is encoding characters.
 */

import type { Hl7Message, Hl7Msh, Hl7Segment } from './types.js';
import { HL7_FIELD_SEP, HL7_SEGMENT_SEP } from './types.js';

/**
 * Parse a raw HL7v2 message string into structured form.
 *
 * @param raw - Raw HL7v2 message (may include MLLP framing bytes stripped)
 * @returns Parsed message or null if invalid
 */
export function parseMessage(raw: string): Hl7Message | null {
  if (!raw || raw.length < 8) return null;

  // Normalize line endings: \r\n -> \r, \n -> \r
  const normalized = raw.replace(/\r\n/g, '\r').replace(/\n/g, '\r').trim();

  // Must start with MSH
  if (!normalized.startsWith('MSH')) return null;

  // Extract field separator from MSH-1 (character at position 3)
  const fieldSep = normalized[3];
  if (!fieldSep) return null;

  // Split into segments
  const segmentTexts = normalized.split(HL7_SEGMENT_SEP).filter((s) => s.length > 0);
  if (segmentTexts.length === 0) return null;

  // Parse each segment
  const segments: Hl7Segment[] = segmentTexts.map((segText) => {
    const trimmed = segText.trim();
    const fields = trimmed.split(fieldSep);
    return {
      name: fields[0] || '',
      raw: trimmed,
      fields,
    };
  });

  // Extract MSH
  const mshSegment = segments[0];
  if (!mshSegment || mshSegment.name !== 'MSH') return null;

  const msh = parseMsh(mshSegment, fieldSep);
  if (!msh) return null;

  return {
    raw: normalized,
    msh,
    segments,
    messageType: msh.messageType,
    messageControlId: msh.messageControlId,
    version: msh.versionId,
  };
}

/**
 * Parse MSH segment into structured header.
 *
 * MSH field positions (1-indexed per HL7 spec):
 *   MSH-1: Field separator (|)
 *   MSH-2: Encoding characters (^~\&)
 *   MSH-3: Sending application
 *   MSH-4: Sending facility
 *   MSH-5: Receiving application
 *   MSH-6: Receiving facility
 *   MSH-7: Date/time of message
 *   MSH-8: Security
 *   MSH-9: Message type (e.g., ADT^A01)
 *   MSH-10: Message control ID
 *   MSH-11: Processing ID (P=Production, T=Training, D=Debugging)
 *   MSH-12: Version ID
 *
 * Note: In the fields array, MSH-1 is at index 0 ("MSH"), MSH-2 (encoding chars)
 * is the field separator + what follows. The actual data starts shifted.
 */
function parseMsh(segment: Hl7Segment, fieldSep: string): Hl7Msh | null {
  // MSH is special: field separator IS MSH-1, so we need to re-parse
  const raw = segment.raw;
  // Find "MSH" + fieldSep, then the rest is encoding chars + fieldSep + fields
  const prefix = 'MSH' + fieldSep;
  if (!raw.startsWith(prefix)) return null;

  const afterMsh = raw.substring(prefix.length);
  // MSH-2 is the next 4 chars (encoding characters: ^~\&)
  // Then the rest is fieldSep-delimited
  const encodingChars = afterMsh.substring(0, 4);
  const rest = afterMsh.substring(4);

  // Split the rest by field separator — but skip the leading separator
  const fields = rest.startsWith(fieldSep)
    ? rest.substring(1).split(fieldSep)
    : rest.split(fieldSep);

  // fields[0] = MSH-3 (Sending App), fields[1] = MSH-4 (Sending Facility), ...
  return {
    fieldSeparator: fieldSep,
    encodingCharacters: encodingChars,
    sendingApplication: fields[0] || '',
    sendingFacility: fields[1] || '',
    receivingApplication: fields[2] || '',
    receivingFacility: fields[3] || '',
    dateTime: fields[4] || '',
    security: fields[5] || '',
    messageType: fields[6] || '',
    messageControlId: fields[7] || '',
    processingId: fields[8] || '',
    versionId: fields[9] || '',
  };
}

/**
 * Extract a specific field from a segment.
 *
 * @param segment - Parsed segment
 * @param fieldIndex - 1-based field index (per HL7 spec)
 * @returns Field value or empty string
 */
export function getField(segment: Hl7Segment, fieldIndex: number): string {
  // For non-MSH segments, field 1 = index 1 in fields array (index 0 = segment name)
  if (segment.name === 'MSH') {
    // MSH is special — MSH-1 is the separator, MSH-2 is encoding chars
    // Use the original fields but offset
    if (fieldIndex <= 0) return '';
    if (fieldIndex === 1) return HL7_FIELD_SEP;
    return segment.fields[fieldIndex - 1] || '';
  }
  return segment.fields[fieldIndex] || '';
}

/**
 * Get all segments of a given type.
 */
export function getSegments(message: Hl7Message, segmentName: string): Hl7Segment[] {
  return message.segments.filter((s) => s.name === segmentName);
}

/**
 * Create a safe summary of a message for logging (no PHI).
 * Returns message type, control ID, version, and segment counts only.
 */
export function messageSummary(message: Hl7Message): Record<string, unknown> {
  const segmentCounts: Record<string, number> = {};
  for (const seg of message.segments) {
    segmentCounts[seg.name] = (segmentCounts[seg.name] || 0) + 1;
  }
  return {
    messageType: message.messageType,
    messageControlId: message.messageControlId,
    version: message.version,
    segmentCount: message.segments.length,
    segmentTypes: segmentCounts,
  };
}
