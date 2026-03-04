/**
 * Local Scaffold Translator — Built-in X12 Translation
 *
 * Phase 45: Generates structurally correct X12 5010 using the existing
 * serializers. Good for dev/sandbox testing. Does NOT embed proprietary
 * code set tables or copyrighted implementation guide content.
 *
 * Limitations:
 *   - No real EDI validation against companion guides
 *   - No payer-specific formatting rules
 *   - Segment counts may differ from production clearinghouse output
 *   - Not suitable for production submission without review
 */

import type { Translator } from './translator.js';
import type { TranslatorResult, ParsedResponse, TransactionEnvelope } from './types.js';
import type { X12TransactionSet, EdiClaim837 } from '../edi/types.js';
import { serialize837, serialize270 } from '../edi/x12-serializer.js';

/* ── Required field checks per transaction ───────────────────── */

const REQUIRED_FIELDS: Record<string, string[]> = {
  '837P': [
    'submitterInfo.npi',
    'billingProvider.npi',
    'subscriber.memberId',
    'claimInfo.claimId',
    'serviceLines',
  ],
  '837I': [
    'submitterInfo.npi',
    'billingProvider.npi',
    'subscriber.memberId',
    'claimInfo.claimId',
    'serviceLines',
  ],
  '270': ['informationSource.payerId', 'informationReceiver.npi', 'subscriber.memberId'],
  '276': ['payerId', 'providerNpi', 'patientMemberId', 'claimId'],
};

function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/* ── Local Scaffold Translator ───────────────────────────────── */

export const localScaffoldTranslator: Translator = {
  id: 'local-scaffold',
  name: 'Local Scaffold Translator (dev/sandbox)',

  isAvailable(): boolean {
    return true; // Always available
  },

  validate(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>
  ): Array<{ field: string; message: string; severity: 'error' | 'warning' }> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const required = REQUIRED_FIELDS[transactionSet];
    if (!required) return errors;

    for (const field of required) {
      const value = getNestedField(canonicalObject, field);
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `Required field "${field}" is missing or empty`,
          severity: 'error',
        });
      }
      if (Array.isArray(value) && value.length === 0) {
        errors.push({
          field,
          message: `Required array "${field}" is empty`,
          severity: 'error',
        });
      }
    }

    return errors;
  },

  buildX12(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>,
    envelope: TransactionEnvelope
  ): TranslatorResult {
    const options = {
      senderId: envelope.senderId,
      receiverId: envelope.receiverId,
      senderQualifier: envelope.isa.senderQualifier,
      receiverQualifier: envelope.isa.receiverQualifier,
      controlNumber: envelope.controlNumber,
      usageIndicator: envelope.isa.usageIndicator,
    };

    let x12Payload: string;
    let segmentCount: number;

    switch (transactionSet) {
      case '837P':
      case '837I': {
        x12Payload = serialize837(canonicalObject as unknown as EdiClaim837, options);
        segmentCount = countSegments(x12Payload);
        break;
      }
      case '270': {
        x12Payload = serialize270(canonicalObject as any, options);
        segmentCount = countSegments(x12Payload);
        break;
      }
      case '276': {
        // Build 276 claim status inquiry from canonical
        x12Payload = build276Scaffold(canonicalObject, envelope);
        segmentCount = countSegments(x12Payload);
        break;
      }
      default: {
        // Generic scaffold for unsupported transaction types
        x12Payload = buildGenericScaffold(transactionSet, envelope);
        segmentCount = countSegments(x12Payload);
      }
    }

    return {
      x12Payload,
      envelope,
      segmentCount,
      byteSize: Buffer.byteLength(x12Payload, 'utf-8'),
    };
  },

  parseX12(transactionSet: X12TransactionSet, rawX12: string): ParsedResponse {
    // Parse response based on transaction type
    switch (transactionSet) {
      case '999':
      case '997':
      case 'TA1':
        return parse999Response(rawX12);
      case '271':
        return parse271Response(rawX12);
      case '277':
        return parse277Response(rawX12);
      case '835':
        return parse835Response(rawX12);
      default:
        return {
          transactionSet,
          canonical: { raw: rawX12 },
          accepted: false,
          errors: [
            {
              code: 'UNSUPPORTED',
              description: `Parsing not implemented for ${transactionSet}`,
              severity: 'error',
            },
          ],
        };
    }
  },
};

/* ── Segment counter ─────────────────────────────────────────── */

function countSegments(x12: string): number {
  return x12.split('~').filter((s) => s.trim().length > 0).length;
}

/* ── 276 Scaffold Builder ────────────────────────────────────── */

function build276Scaffold(obj: Record<string, unknown>, env: TransactionEnvelope): string {
  const sep = '*';
  const term = '~';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 15).replace(':', '');

  const segments: string[] = [];

  // ISA
  segments.push(
    `ISA${sep}00${sep}          ${sep}00${sep}          ${sep}${env.isa.senderQualifier}${sep}${env.isa.senderId}${sep}${env.isa.receiverQualifier}${sep}${env.isa.receiverId}${sep}${env.isa.date}${sep}${env.isa.time}${sep}^${sep}00501${sep}${env.controlNumber}${sep}0${sep}${env.isa.usageIndicator}${sep}:`
  );

  // GS
  segments.push(
    `GS${sep}${env.gs.functionalCode}${sep}${env.gs.senderId}${sep}${env.gs.receiverId}${sep}${dateStr}${sep}${timeStr}${sep}${env.gs.controlNumber}${sep}X${sep}${env.gs.versionCode}`
  );

  // ST
  segments.push(`ST${sep}276${sep}${env.controlNumber.slice(-4)}`);

  // BHT
  segments.push(
    `BHT${sep}0010${sep}13${sep}${env.correlationId.slice(0, 30)}${sep}${dateStr}${sep}${timeStr}`
  );

  // HL - Information Source
  segments.push(`HL${sep}1${sep}${sep}20${sep}1`);

  // NM1 - Payer
  const payerId = (obj.payerId ?? '') as string;
  segments.push(
    `NM1${sep}PR${sep}2${sep}${payerId}${sep}${sep}${sep}${sep}${sep}PI${sep}${payerId}`
  );

  // HL - Information Receiver
  segments.push(`HL${sep}2${sep}1${sep}21${sep}1`);

  // NM1 - Provider
  const providerNpi = (obj.providerNpi ?? '') as string;
  segments.push(
    `NM1${sep}41${sep}2${sep}PROVIDER${sep}${sep}${sep}${sep}${sep}XX${sep}${providerNpi}`
  );

  // HL - Billing Provider
  segments.push(`HL${sep}3${sep}2${sep}19${sep}1`);

  // HL - Patient
  segments.push(`HL${sep}4${sep}3${sep}PT`);

  // NM1 - Patient
  const memberId = (obj.patientMemberId ?? '') as string;
  segments.push(`NM1${sep}IL${sep}1${sep}PATIENT${sep}${sep}${sep}${sep}${sep}MI${sep}${memberId}`);

  // TRN - Trace
  const claimId = (obj.claimId ?? '') as string;
  segments.push(`TRN${sep}1${sep}${claimId}${sep}${env.senderId}`);

  // REF - Claim ID
  segments.push(`REF${sep}BLT${sep}${claimId}`);

  // SE
  const segCount = segments.length; // includes ST but SE adds +1
  segments.push(`SE${sep}${segCount}${sep}${env.controlNumber.slice(-4)}`);

  // GE
  segments.push(`GE${sep}1${sep}${env.gs.controlNumber}`);

  // IEA
  segments.push(`IEA${sep}1${sep}${env.controlNumber}`);

  return segments.join(term) + term;
}

/* ── Generic Scaffold ────────────────────────────────────────── */

function buildGenericScaffold(txSet: X12TransactionSet, env: TransactionEnvelope): string {
  const sep = '*';
  const term = '~';
  const segments: string[] = [];

  segments.push(
    `ISA${sep}00${sep}          ${sep}00${sep}          ${sep}${env.isa.senderQualifier}${sep}${env.isa.senderId}${sep}${env.isa.receiverQualifier}${sep}${env.isa.receiverId}${sep}${env.isa.date}${sep}${env.isa.time}${sep}^${sep}00501${sep}${env.controlNumber}${sep}0${sep}${env.isa.usageIndicator}${sep}:`
  );
  segments.push(
    `GS${sep}${env.gs.functionalCode}${sep}${env.gs.senderId}${sep}${env.gs.receiverId}${sep}${env.isa.date}${sep}${env.isa.time}${sep}${env.gs.controlNumber}${sep}X${sep}${env.gs.versionCode}`
  );
  segments.push(`ST${sep}${txSet}${sep}${env.controlNumber.slice(-4)}`);
  segments.push(`SE${sep}2${sep}${env.controlNumber.slice(-4)}`);
  segments.push(`GE${sep}1${sep}${env.gs.controlNumber}`);
  segments.push(`IEA${sep}1${sep}${env.controlNumber}`);

  return segments.join(term) + term;
}

/* ── Response Parsers (scaffold-level) ───────────────────────── */

function parse999Response(raw: string): ParsedResponse {
  const segments = raw.split('~').filter((s) => s.trim());
  let accepted = true;
  let referenceControlNumber: string | undefined;
  const errors: Array<{ code: string; description: string; severity: string }> = [];

  for (const seg of segments) {
    const elements = seg.split('*');
    if (elements[0] === 'AK9') {
      // AK9*A = accepted, AK9*R = rejected, AK9*E = accepted with errors
      if (elements[1] === 'R') accepted = false;
      referenceControlNumber = elements[2];
    }
    if (elements[0] === 'IK5') {
      if (elements[1] === 'R') accepted = false;
    }
    if (elements[0] === 'IK4' || elements[0] === 'CTX') {
      errors.push({
        code: elements[1] ?? 'UNKNOWN',
        description: elements.slice(2).join(' ').trim() || 'Implementation error',
        severity: elements[0] === 'IK4' ? 'error' : 'warning',
      });
    }
  }

  return {
    transactionSet: '999',
    referenceControlNumber,
    canonical: { accepted, errors },
    accepted,
    errors,
  };
}

function parse271Response(raw: string): ParsedResponse {
  const segments = raw.split('~').filter((s) => s.trim());
  const benefits: Array<Record<string, unknown>> = [];
  let subscriberStatus = 'unknown';
  let referenceControlNumber: string | undefined;

  for (const seg of segments) {
    const elements = seg.split('*');
    if (elements[0] === 'TRN') {
      referenceControlNumber = elements[2];
    }
    if (elements[0] === 'INS') {
      subscriberStatus = elements[1] === 'Y' ? 'active' : 'inactive';
    }
    if (elements[0] === 'EB') {
      benefits.push({
        infoType: elements[1],
        coverageLevel: elements[2],
        serviceTypeCode: elements[3],
        amount: elements[6] ? parseFloat(elements[6]) : undefined,
        percent: elements[7] ? parseFloat(elements[7]) : undefined,
      });
    }
  }

  return {
    transactionSet: '271',
    referenceControlNumber,
    canonical: { subscriberStatus, benefits },
    accepted: true,
    errors: [],
  };
}

function parse277Response(raw: string): ParsedResponse {
  const segments = raw.split('~').filter((s) => s.trim());
  let statusCategoryCode = '';
  let statusCode = '';
  let referenceControlNumber: string | undefined;

  for (const seg of segments) {
    const elements = seg.split('*');
    if (elements[0] === 'TRN') {
      referenceControlNumber = elements[2];
    }
    if (elements[0] === 'STC') {
      // STC*codecategory:code:source*date*amount
      const codeParts = (elements[1] ?? '').split(':');
      statusCategoryCode = codeParts[0] ?? '';
      statusCode = codeParts[1] ?? '';
    }
  }

  // A0-A3 categories generally mean "in process" or accepted
  const accepted =
    statusCategoryCode.startsWith('A') &&
    !['A4', 'A5', 'A6', 'A7', 'A8'].includes(statusCategoryCode);

  return {
    transactionSet: '277',
    referenceControlNumber,
    canonical: { statusCategoryCode, statusCode },
    accepted,
    errors: accepted
      ? []
      : [
          {
            code: statusCategoryCode,
            description: `Status: ${statusCategoryCode}/${statusCode}`,
            severity: 'warning',
          },
        ],
  };
}

function parse835Response(raw: string): ParsedResponse {
  const segments = raw.split('~').filter((s) => s.trim());
  let totalPayment = 0;
  let referenceControlNumber: string | undefined;
  const claimPayments: Array<Record<string, unknown>> = [];

  for (const seg of segments) {
    const elements = seg.split('*');
    if (elements[0] === 'TRN') {
      referenceControlNumber = elements[2];
    }
    if (elements[0] === 'BPR') {
      totalPayment = parseFloat(elements[2] ?? '0');
    }
    if (elements[0] === 'CLP') {
      claimPayments.push({
        patientControlNumber: elements[1],
        statusCode: elements[2],
        chargedAmount: parseFloat(elements[3] ?? '0'),
        paidAmount: parseFloat(elements[4] ?? '0'),
      });
    }
  }

  return {
    transactionSet: '835',
    referenceControlNumber,
    canonical: { totalPayment, claimPayments },
    accepted: true,
    errors: [],
  };
}
