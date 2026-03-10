/**
 * X12 Scaffold Serializer -- 837P/837I Wire Format
 *
 * Phase 40: Generates X12 5010-compliant wire format from EdiClaim837.
 *
 * IMPORTANT: This is a SCAFFOLD serializer. It generates structurally
 * correct X12 envelopes with real segment/element separators, but does
 * NOT bundle proprietary code set tables (CPT/HCPCS descriptions,
 * ICD-10-CM descriptions, etc.). Code values are passed through as-is.
 *
 * Production path:
 * 1. Current: Scaffold generates wire-format X12 for review/export
 * 2. Next: Clearinghouse validates and enriches the submission
 * 3. Future: Add companion guide validation per payer
 * 4. Production: Full SNIP Level 1-7 validation via clearinghouse
 *
 * Wire format reference: ASC X12 Version 005010
 * Segment terminator: ~ (tilde)
 * Element separator: * (asterisk)
 * Sub-element separator: : (colon)
 */

import type { EdiClaim837 } from './types.js';

/* -- Constants ------------------------------------------------ */

const SEG_TERM = '~';
const ELEM_SEP = '*';
const SUB_SEP = ':';

/** Pad a string to exact length with trailing spaces */
function pad(str: string, len: number): string {
  return (str ?? '').padEnd(len, ' ').slice(0, len);
}

/** Pad a number to exact digits with leading zeros */
function padNum(n: number, digits: number): string {
  return String(n).padStart(digits, '0');
}

/** Format date as YYMMDD for ISA */
function isaDate(isoDate?: string): string {
  const d = isoDate ? new Date(isoDate) : new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = padNum(d.getMonth() + 1, 2);
  const dd = padNum(d.getDate(), 2);
  return `${yy}${mm}${dd}`;
}

/** Format time as HHMM for ISA */
function isaTime(): string {
  const d = new Date();
  return `${padNum(d.getHours(), 2)}${padNum(d.getMinutes(), 2)}`;
}

/** Format date as CCYYMMDD for GS/CLM */
function gsDate(): string {
  const d = new Date();
  return `${d.getFullYear()}${padNum(d.getMonth() + 1, 2)}${padNum(d.getDate(), 2)}`;
}

/* -- ISA/IEA Envelope ----------------------------------------- */

export interface X12SerializerOptions {
  /** ISA05 -- Sender qualifier ('ZZ' = mutually defined, '30' = TIN) */
  senderQualifier?: string;
  /** ISA06 -- Sender ID (15 chars, padded) */
  senderId?: string;
  /** ISA07 -- Receiver qualifier */
  receiverQualifier?: string;
  /** ISA08 -- Receiver ID (15 chars, padded) */
  receiverId?: string;
  /** ISA13 -- Interchange control number (9 digits) */
  controlNumber?: string;
  /** ISA15 -- Usage indicator: 'T' for test, 'P' for production */
  usageIndicator?: 'T' | 'P';
  /** GS08 -- Version/release/industry code */
  versionCode?: string;
}

const DEFAULT_OPTS: Required<X12SerializerOptions> = {
  senderQualifier: 'ZZ',
  senderId: 'VISTAEVOLVED',
  receiverQualifier: 'ZZ',
  receiverId: 'RECEIVER',
  controlNumber: '000000001',
  usageIndicator: 'T', // Always test by default -- safety first
  versionCode: '005010X222A1', // 837P default
};

/* -- Serialize 837P/I to X12 wire format ---------------------- */

export function serialize837(claim: EdiClaim837, options?: X12SerializerOptions): string {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (claim.transactionSet === '837I') {
    opts.versionCode = options?.versionCode ?? '005010X223A3';
  }

  const segments: string[] = [];
  let stCount = 0; // segment count inside ST/SE

  function seg(...elements: (string | number)[]): void {
    segments.push(elements.join(ELEM_SEP) + SEG_TERM);
    stCount++;
  }

  // -- ISA -- Interchange Control Header
  segments.push(
    [
      'ISA',
      '00',
      pad('', 10), // ISA01-02: Auth info
      '00',
      pad('', 10), // ISA03-04: Security info
      opts.senderQualifier,
      pad(opts.senderId, 15),
      opts.receiverQualifier,
      pad(opts.receiverId, 15),
      isaDate(),
      isaTime(),
      SUB_SEP, // ISA11: Repetition separator
      '00501', // ISA12: Version
      padNum(parseInt(opts.controlNumber, 10), 9),
      '0', // ISA14: Ack requested
      opts.usageIndicator,
      SUB_SEP, // ISA16: Component separator
    ].join(ELEM_SEP) + SEG_TERM
  );

  // -- GS -- Functional Group
  const gsControlNumber = opts.controlNumber;
  segments.push(
    [
      'GS',
      'HC', // GS01: Health Care
      opts.senderId.trim(),
      opts.receiverId.trim(),
      gsDate(),
      isaTime(),
      gsControlNumber,
      'X', // GS07: Responsible agency
      opts.versionCode,
    ].join(ELEM_SEP) + SEG_TERM
  );

  // -- ST -- Transaction Set Header
  stCount = 0;
  const stControlNumber = padNum(1, 4);
  seg('ST', claim.transactionSet === '837I' ? '837' : '837', stControlNumber, opts.versionCode);

  // -- BHT -- Beginning of Hierarchical Transaction
  seg('BHT', '0019', '00', claim.controlNumber, gsDate(), isaTime(), 'CH');

  // -- 1000A -- Submitter
  seg('NM1', '41', '2', claim.submitterInfo.name, '', '', '', '', '46', claim.submitterInfo.taxId);
  if (claim.submitterInfo.contactName) {
    seg('PER', 'IC', claim.submitterInfo.contactName, 'TE', claim.submitterInfo.contactPhone ?? '');
  }

  // -- 1000B -- Receiver
  seg('NM1', '40', '2', claim.receiverInfo.name, '', '', '', '', claim.receiverInfo.entityCode, '');

  // -- 2000A HL -- Billing Provider Hierarchical Level
  seg('HL', '1', '', '20', '1');
  seg(
    'NM1',
    '85',
    '2',
    claim.billingProvider.name,
    '',
    '',
    '',
    '',
    'XX',
    claim.billingProvider.npi
  );
  seg('N3', claim.billingProvider.address?.line1 ?? '');
  seg(
    'N4',
    claim.billingProvider.address?.city ?? '',
    claim.billingProvider.address?.state ?? '',
    claim.billingProvider.address?.zip ?? ''
  );
  seg('REF', 'EI', claim.billingProvider.taxId);

  // -- 2000B HL -- Subscriber Hierarchical Level
  seg('HL', '2', '1', '22', claim.patient ? '1' : '0');
  seg(
    'SBR',
    'P',
    claim.subscriber.relationshipCode,
    claim.subscriber.groupNumber ?? '',
    '',
    '',
    '',
    '',
    '',
    ''
  );
  seg(
    'NM1',
    'IL',
    '1',
    claim.subscriber.lastName,
    claim.subscriber.firstName,
    '',
    '',
    '',
    'MI',
    claim.subscriber.memberId
  );
  if (claim.subscriber.address) {
    seg('N3', claim.subscriber.address.line1 ?? '');
    seg(
      'N4',
      claim.subscriber.address.city ?? '',
      claim.subscriber.address.state ?? '',
      claim.subscriber.address.zip ?? ''
    );
  }
  if (claim.subscriber.dob) {
    seg('DMG', 'D8', claim.subscriber.dob, claim.subscriber.gender ?? 'U');
  }

  // -- 2000C HL -- Patient (if different from subscriber)
  if (claim.patient) {
    seg('HL', '3', '2', '23', '0');
    seg('PAT', claim.patient.relationshipCode);
    seg('NM1', 'QC', '1', claim.patient.lastName, claim.patient.firstName, '', '', '', '', '');
    if (claim.patient.dob) {
      seg('DMG', 'D8', claim.patient.dob, claim.patient.gender ?? 'U');
    }
  }

  // -- 2300 -- Claim Information
  seg(
    'CLM',
    claim.claimInfo.claimId,
    claim.claimInfo.totalChargeAmount,
    '',
    '',
    `${claim.claimInfo.facilityCode}${SUB_SEP}B${SUB_SEP}${claim.claimInfo.frequencyCode}`,
    claim.claimInfo.providerSignature ? 'Y' : 'N',
    claim.claimInfo.assignmentOfBenefits ? 'A' : 'N',
    claim.claimInfo.releaseOfInfo,
    ''
  );

  // Diagnosis codes
  if (claim.diagnosisCodes.length > 0) {
    const dxElements = ['HI'];
    for (const dx of claim.diagnosisCodes) {
      const qualifier = dx.isPrincipal ? 'ABK' : 'ABF';
      dxElements.push(`${qualifier}${SUB_SEP}${dx.code}`);
    }
    seg(...dxElements);
  }

  // -- 2400 -- Service Lines
  let lineSeq = 0;
  for (const line of claim.serviceLines) {
    lineSeq++;
    seg('LX', lineSeq);

    // SV1 (Professional) or SV2 (Institutional)
    if (claim.transactionSet === '837P') {
      const modStr = line.modifiers?.length ? `${SUB_SEP}${line.modifiers.join(SUB_SEP)}` : '';
      seg(
        'SV1',
        `HC${SUB_SEP}${line.procedureCode}${modStr}`,
        line.chargeAmount,
        'UN',
        line.units,
        line.placeOfService ?? '11',
        '',
        ''
      );
    } else {
      seg(
        'SV2',
        line.revenueCode ?? '0300',
        `HC${SUB_SEP}${line.procedureCode}`,
        line.chargeAmount,
        'UN',
        line.units
      );
    }

    // DTP -- Service date
    seg('DTP', '472', 'D8', line.serviceDate.replace(/-/g, ''));

    // Diagnosis pointers
    if (line.diagnosisPointers?.length) {
      seg('SV1', '', '', '', '', '', '', line.diagnosisPointers.join(SUB_SEP));
    }
  }

  // -- SE -- Transaction Set Trailer
  stCount++; // count SE itself
  seg('SE', stCount, stControlNumber);

  // -- GE -- Functional Group Trailer
  segments.push(['GE', '1', gsControlNumber].join(ELEM_SEP) + SEG_TERM);

  // -- IEA -- Interchange Control Trailer
  segments.push(
    ['IEA', '1', padNum(parseInt(opts.controlNumber, 10), 9)].join(ELEM_SEP) + SEG_TERM
  );

  return segments.join('\n');
}

/* -- Serialize 270 Eligibility Inquiry ------------------------ */

export function serialize270(
  inquiry: {
    memberId: string;
    payerId: string;
    providerNpi: string;
    patient?: { firstName: string; lastName: string; dob?: string };
  },
  options?: X12SerializerOptions
): string {
  const opts = { ...DEFAULT_OPTS, ...options };
  opts.versionCode = '005010X279A1';

  const segments: string[] = [];
  let stCount = 0;

  function seg(...elements: (string | number)[]): void {
    segments.push(elements.join(ELEM_SEP) + SEG_TERM);
    stCount++;
  }

  // ISA
  segments.push(
    [
      'ISA',
      '00',
      pad('', 10),
      '00',
      pad('', 10),
      opts.senderQualifier,
      pad(opts.senderId, 15),
      opts.receiverQualifier,
      pad(opts.receiverId, 15),
      isaDate(),
      isaTime(),
      SUB_SEP,
      '00501',
      padNum(parseInt(opts.controlNumber, 10), 9),
      '0',
      opts.usageIndicator,
      SUB_SEP,
    ].join(ELEM_SEP) + SEG_TERM
  );

  // GS
  segments.push(
    [
      'GS',
      'HS',
      opts.senderId.trim(),
      opts.receiverId.trim(),
      gsDate(),
      isaTime(),
      opts.controlNumber,
      'X',
      opts.versionCode,
    ].join(ELEM_SEP) + SEG_TERM
  );

  // ST
  stCount = 0;
  seg('ST', '270', padNum(1, 4), opts.versionCode);
  seg('BHT', '0022', '13', opts.controlNumber, gsDate(), isaTime());

  // 2000A -- Information Source
  seg('HL', '1', '', '20', '1');
  seg('NM1', 'PR', '2', '', '', '', '', '', 'PI', inquiry.payerId);

  // 2000B -- Information Receiver
  seg('HL', '2', '1', '21', '1');
  seg('NM1', '1P', '2', '', '', '', '', '', 'XX', inquiry.providerNpi);

  // 2000C -- Subscriber
  seg('HL', '3', '2', '22', '0');
  seg(
    'NM1',
    'IL',
    '1',
    inquiry.patient?.lastName ?? '',
    inquiry.patient?.firstName ?? '',
    '',
    '',
    '',
    'MI',
    inquiry.memberId
  );
  if (inquiry.patient?.dob) {
    seg('DMG', 'D8', inquiry.patient.dob.replace(/-/g, ''));
  }

  // 2110C -- Eligibility/Benefit Inquiry
  seg('EQ', '30'); // Health Benefit Plan Coverage

  // SE
  stCount++;
  seg('SE', stCount, padNum(1, 4));

  segments.push(['GE', '1', opts.controlNumber].join(ELEM_SEP) + SEG_TERM);
  segments.push(
    ['IEA', '1', padNum(parseInt(opts.controlNumber, 10), 9)].join(ELEM_SEP) + SEG_TERM
  );

  return segments.join('\n');
}

/* -- Export bundle to filesystem ------------------------------ */

export interface ExportBundleResult {
  path: string;
  transactionSet: string;
  segmentCount: number;
  byteSize: number;
  exportedAt: string;
}

/**
 * Write an X12 payload to the export directory.
 * Used when CLAIM_SUBMISSION_ENABLED=false to produce review artifacts.
 */
export async function exportX12Bundle(
  x12Payload: string,
  claimId: string,
  transactionSet: string
): Promise<ExportBundleResult> {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const __dir =
    typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

  // Export to data/rcm-exports/ at repo root
  const repoRoot = join(__dir, '..', '..', '..', '..', '..');
  const exportDir = join(repoRoot, 'data', 'rcm-exports');
  mkdirSync(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${transactionSet}_${claimId}_${timestamp}.x12`;
  const fullPath = join(exportDir, filename);

  writeFileSync(fullPath, x12Payload, 'utf-8');

  return {
    path: `data/rcm-exports/${filename}`,
    transactionSet,
    segmentCount: x12Payload.split(SEG_TERM).filter(Boolean).length,
    byteSize: Buffer.byteLength(x12Payload, 'utf-8'),
    exportedAt: new Date().toISOString(),
  };
}
