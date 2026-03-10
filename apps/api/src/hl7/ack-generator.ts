/**
 * HL7v2 Engine -- ACK Generator
 *
 * Phase 239 (Wave 6 P2): Generates HL7v2 ACK/NAK messages per the HL7v2 spec.
 *
 * ACK structure:
 *   MSH|^~\&|RecvApp|RecvFac|SendApp|SendFac|DateTime||ACK^OrigTrigger|AckCtlId|P|Version
 *   MSA|AckCode|OrigCtlId|TextMessage
 *   ERR|ErrorCode (optional, for AE/AR)
 *
 * The ACK swaps sending/receiving application/facility from the original MSH.
 */

import type { AckCode, Hl7Ack, Hl7Message } from './types.js';
import { HL7_SEGMENT_SEP } from './types.js';

/**
 * Generate an HL7v2 ACK message for a received message.
 *
 * @param original - The received message being acknowledged
 * @param ackCode - AA (accept), AE (error), AR (reject)
 * @param errorText - Optional error description for AE/AR
 * @returns Formatted ACK message
 */
export function generateAck(
  original: Hl7Message,
  ackCode: AckCode = 'AA',
  errorText?: string
): Hl7Ack {
  const msh = original.msh;
  const sep = msh.fieldSeparator;
  const enc = msh.encodingCharacters;
  const now = formatHl7DateTime(new Date());
  const ackControlId = `ACK${Date.now()}`;

  // MSH -- swap sender/receiver
  const mshLine = [
    `MSH${sep}${enc}`,
    msh.receivingApplication, // Swap: was receiving, now sending
    msh.receivingFacility,
    msh.sendingApplication, // Swap: was sending, now receiving
    msh.sendingFacility,
    now,
    '', // Security
    `ACK`, // Message type
    ackControlId,
    msh.processingId || 'P',
    msh.versionId || '2.4',
  ].join(sep);

  // MSA -- acknowledgement
  const msaLine = ['MSA', ackCode, original.messageControlId, errorText || ''].join(sep);

  // Build message lines
  const lines = [mshLine, msaLine];

  // ERR segment for error/reject
  if (ackCode !== 'AA' && ackCode !== 'CA' && errorText) {
    const errLine = ['ERR', errorText].join(sep);
    lines.push(errLine);
  }

  const message = lines.join(HL7_SEGMENT_SEP);

  return {
    message,
    ackCode,
    messageControlId: original.messageControlId,
    errorText,
  };
}

/**
 * Generate a simple AA (Application Accept) ACK.
 */
export function ackAccept(original: Hl7Message): Hl7Ack {
  return generateAck(original, 'AA');
}

/**
 * Generate an AE (Application Error) ACK.
 */
export function ackError(original: Hl7Message, errorText: string): Hl7Ack {
  return generateAck(original, 'AE', errorText);
}

/**
 * Generate an AR (Application Reject) ACK.
 */
export function ackReject(original: Hl7Message, errorText: string): Hl7Ack {
  return generateAck(original, 'AR', errorText);
}

/**
 * Format a Date as HL7v2 TS (YYYYMMDDHHMMSS).
 */
function formatHl7DateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${mi}${s}`;
}
