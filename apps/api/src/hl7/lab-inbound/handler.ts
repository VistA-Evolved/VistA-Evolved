/**
 * Lab Inbound ORU^R01 Handler -- Phase 433 (W27 P3)
 *
 * Processes inbound HL7v2 ORU^R01 messages, extracts lab results,
 * validates, and stages them in the lab inbound store.
 *
 * This handler bridges the existing HL7 engine infrastructure
 * (parser, ORU pack types, domain mapper) to the lab staging store.
 *
 * VistA filing is integration-pending: requires LR package RPCs
 * (LRFZX or custom ZVELABF.m) which are not available in the
 * WorldVistA Docker sandbox.
 */

import type {
  InboundLabResult,
  InboundObservation,
  SpecimenInfo,
  LabFilingTarget,
} from './types.js';
import { stageLabResult, validateLabResult, updateLabStatus } from './store.js';
import { log } from '../../lib/logger.js';
import { safeErr } from '../../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* ORU^R01 Message Parsing                                             */
/* ------------------------------------------------------------------ */

/**
 * Extract a field from an HL7 segment line.
 * @param segmentLine - Raw HL7 segment (pipe-delimited)
 * @param fieldIndex - 1-based field index
 * @param isMsh - True for MSH segment (field 1 = separator)
 */
function getField(segmentLine: string, fieldIndex: number, isMsh = false): string {
  const parts = segmentLine.split('|');
  if (isMsh) return parts[fieldIndex - 1] ?? '';
  return parts[fieldIndex] ?? '';
}

/** Get component from a ^-delimited field. */
function getComponent(field: string, index: number = 1): string {
  return field.split('^')[index - 1] ?? '';
}

/** Convert HL7 timestamp (YYYYMMDDHHMMSS) to ISO 8601. */
function hl7ToIso(hl7dt: string): string {
  if (!hl7dt || hl7dt.length < 8) return hl7dt || '';
  const y = hl7dt.slice(0, 4);
  const m = hl7dt.slice(4, 6);
  const d = hl7dt.slice(6, 8);
  const h = hl7dt.slice(8, 10) || '00';
  const min = hl7dt.slice(10, 12) || '00';
  const s = hl7dt.slice(12, 14) || '00';
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

/* ------------------------------------------------------------------ */
/* Process ORU^R01 from raw HL7 text                                   */
/* ------------------------------------------------------------------ */

export interface OruProcessResult {
  ok: boolean;
  stagedId?: string;
  status?: string;
  validation?: { valid: boolean; errors: string[]; warnings: string[] };
  error?: string;
}

/**
 * Process a raw HL7v2 ORU^R01 message string.
 * Parses segments, extracts lab results, validates, and stages.
 */
export function processOruR01(rawMessage: string): OruProcessResult {
  try {
    const segments = rawMessage.split(/\r?\n|\r/).filter((s) => s.trim());

    // Find MSH
    const mshLine = segments.find((s) => s.startsWith('MSH'));
    if (!mshLine) return { ok: false, error: 'No MSH segment found' };

    const messageType = getField(mshLine, 9, true);
    if (!messageType.startsWith('ORU')) {
      return { ok: false, error: `Expected ORU message type, got: ${messageType}` };
    }

    // Extract MSH fields
    const sendingApp = getField(mshLine, 3, true);
    const sendingFacility = getField(mshLine, 4, true);
    const receivingFacility = getField(mshLine, 6, true);
    const messageTimestamp = hl7ToIso(getField(mshLine, 7, true));
    const messageControlId = getField(mshLine, 10, true);

    // Extract PID
    const pidLine = segments.find((s) => s.startsWith('PID'));
    const patientExternalId = pidLine ? getComponent(getField(pidLine, 3), 1) : '';

    // Extract OBR (order info)
    const obrLine = segments.find((s) => s.startsWith('OBR'));
    const placerOrderNumber = obrLine ? getField(obrLine, 2) : undefined;
    const fillerOrderNumber = obrLine ? getField(obrLine, 3) : '';
    const universalServiceId = obrLine ? getField(obrLine, 4) : '';
    const accessionNumber = obrLine ? getField(obrLine, 20) : undefined;
    const obrResultStatus = obrLine ? getField(obrLine, 25) || 'F' : 'F';

    // Extract specimen from OBR-15 (or SPM segment if present)
    let specimen: SpecimenInfo | undefined;
    const spmLine = segments.find((s) => s.startsWith('SPM'));
    if (spmLine) {
      specimen = {
        type: getComponent(getField(spmLine, 4), 1) || 'UNKNOWN',
        source: getComponent(getField(spmLine, 8), 1) || undefined,
        collectionDateTime: getField(spmLine, 17) ? hl7ToIso(getField(spmLine, 17)) : undefined,
        receivedDateTime: getField(spmLine, 18) ? hl7ToIso(getField(spmLine, 18)) : undefined,
        accessionNumber: accessionNumber || undefined,
      };
    } else if (obrLine) {
      const obrSpecimen = getField(obrLine, 15);
      if (obrSpecimen) {
        specimen = {
          type: getComponent(obrSpecimen, 1) || 'UNKNOWN',
          collectionDateTime: getField(obrLine, 7) ? hl7ToIso(getField(obrLine, 7)) : undefined,
          receivedDateTime: getField(obrLine, 14) ? hl7ToIso(getField(obrLine, 14)) : undefined,
          accessionNumber: accessionNumber || undefined,
        };
      }
    }

    // Extract OBX observations
    const obxLines = segments.filter((s) => s.startsWith('OBX'));
    const results: InboundObservation[] = obxLines.map((obx, i) => ({
      setId: parseInt(getField(obx, 1), 10) || i + 1,
      observationId: getField(obx, 3),
      valueType: getField(obx, 2),
      value: getField(obx, 5),
      units: getField(obx, 6) || undefined,
      referenceRange: getField(obx, 7) || undefined,
      abnormalFlag: getField(obx, 8) || undefined,
      resultStatus: getField(obx, 11) || 'F',
      observationDateTime: getField(obx, 14) ? hl7ToIso(getField(obx, 14)) : undefined,
    }));

    // Build inbound result (without ID -- store generates it)
    const inbound: Omit<InboundLabResult, 'id'> = {
      messageControlId,
      sendingApp,
      sendingFacility,
      receivingFacility: receivingFacility || undefined,
      messageTimestamp,
      patientExternalId,
      matchedDfn: undefined, // Patient matching is a separate step
      placerOrderNumber: placerOrderNumber || undefined,
      fillerOrderNumber,
      universalServiceId,
      accessionNumber: accessionNumber || undefined,
      specimen,
      results,
      status: 'received',
      receivedAt: new Date().toISOString(),
      resultStatus: obrResultStatus as 'F' | 'P' | 'C' | 'X',
    };

    // Validate
    const validation = validateLabResult(inbound);
    if (!validation.valid) {
      // Stage in quarantine
      inbound.status = 'quarantined';
      const id = stageLabResult(inbound);
      log.warn('Lab result quarantined', { id, errors: validation.errors });
      return { ok: true, stagedId: id, status: 'quarantined', validation };
    }

    // Stage as received
    const id = stageLabResult(inbound);

    // Auto-validate if no warnings (or always validate if patient matched)
    if (validation.warnings.length === 0 || inbound.matchedDfn) {
      updateLabStatus(id, 'validated');
    }

    return { ok: true, stagedId: id, status: inbound.status, validation };
  } catch (err: any) {
    log.error('Failed to process ORU^R01', { error: err.message });
    return { ok: false, error: safeErr(err) };
  }
}

/* ------------------------------------------------------------------ */
/* VistA Filing Target Metadata                                        */
/* ------------------------------------------------------------------ */

/** Returns the VistA filing target for lab results (integration-pending). */
export function getLabFilingTarget(): LabFilingTarget {
  return {
    vistaFile: '63',
    targetRpc: 'LRFZX',
    vistaPackage: 'LR',
    sandboxNote:
      'LR package (Lab) RPCs are not registered in OR CPRS GUI CHART context. LRFZX is the standard filing routine but requires direct M call, not RPC. No lab filing RPCs exist in the sandbox.',
    migrationPath: [
      '1. Create ZVELABF.m custom routine wrapping LRFZX for RPC-callable filing',
      '2. Register ZVE LAB FILE RPC in File 8994 + OR CPRS GUI CHART context',
      '3. Wire processOruR01 -> file to VistA via ZVE LAB FILE',
      '4. Map accession numbers and LOINC codes to VistA lab test definitions (File 60)',
      '5. Enable auto-filing path: received -> validated -> filed (status transitions)',
    ].join('\n'),
  };
}
