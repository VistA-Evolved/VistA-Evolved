/**
 * Phase 586 (W42-P15): NCPDP SCRIPT Message Builder
 *
 * Constructs properly structured NCPDP SCRIPT messages from pharmacy orders
 * and clinical data. This is the bridge between VistA pharmacy data and the
 * eRx adapter layer.
 */

import { randomUUID } from 'node:crypto';
import type {
  ScriptMessageHeader,
  NewRxMessage,
  RxRenewalResponseMessage,
  CancelRxMessage,
  ErxPrescriber,
  ErxPatient,
  ErxPharmacy,
  ErxMedication,
  CancelReasonCode,
} from './types.js';

const SOFTWARE_NAME = 'VistA-Evolved';
const SOFTWARE_VERSION = '1.0.0';

function buildHeader(overrides?: Partial<ScriptMessageHeader>): ScriptMessageHeader {
  return {
    messageId: overrides?.messageId ?? randomUUID(),
    sentTime: overrides?.sentTime ?? new Date().toISOString(),
    senderSoftware: SOFTWARE_NAME,
    senderSoftwareVersion: SOFTWARE_VERSION,
    tertiaryIdentification: overrides?.tertiaryIdentification ?? null,
  };
}

/**
 * Build a NewRx NCPDP SCRIPT message for transmission to the eRx network.
 */
export function buildNewRx(params: {
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  supervisor?: ErxPrescriber;
  messageId?: string;
}): NewRxMessage {
  return {
    type: 'NewRx',
    header: buildHeader({ messageId: params.messageId }),
    prescriber: params.prescriber,
    patient: params.patient,
    pharmacy: params.pharmacy,
    medication: params.medication,
    supervisor: params.supervisor ?? null,
  };
}

/**
 * Build a renewal response (approve, deny, or approve with changes).
 */
export function buildRenewalResponse(params: {
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  responseCode: 'A' | 'D' | 'C';
  denialReason?: string;
  note?: string;
  messageId?: string;
}): RxRenewalResponseMessage {
  return {
    type: 'RxRenewalResponse',
    header: buildHeader({ messageId: params.messageId }),
    prescriber: params.prescriber,
    patient: params.patient,
    pharmacy: params.pharmacy,
    medication: params.medication,
    responseCode: params.responseCode,
    denialReason: params.denialReason ?? null,
    note: params.note ?? null,
  };
}

/**
 * Build a cancel prescription message.
 */
export function buildCancelRx(params: {
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  rxNumber: string;
  cancelReason: CancelReasonCode;
  note?: string;
  messageId?: string;
}): CancelRxMessage {
  return {
    type: 'CancelRx',
    header: buildHeader({ messageId: params.messageId }),
    prescriber: params.prescriber,
    patient: params.patient,
    pharmacy: params.pharmacy,
    medication: params.medication,
    rxNumber: params.rxNumber,
    cancelReason: params.cancelReason,
    note: params.note ?? null,
  };
}

/**
 * Map a VistA patient record to the ErxPatient shape.
 * Handles the translation from VistA demographics format.
 */
export function mapVistaPatientToErx(vistaData: {
  name: string;
  dob: string;
  sex: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  dfn: string;
}): ErxPatient {
  const nameParts = vistaData.name.split(',').map((s) => s.trim());
  const lastName = nameParts[0] || '';
  const firstMiddle = (nameParts[1] || '').split(' ');
  const firstName = firstMiddle[0] || '';
  const middleName = firstMiddle.slice(1).join(' ') || null;

  return {
    lastName,
    firstName,
    middleName,
    dateOfBirth: vistaData.dob,
    gender: vistaData.sex === 'M' ? 'M' : vistaData.sex === 'F' ? 'F' : 'U',
    phone: vistaData.phone ?? null,
    address: {
      line1: vistaData.address?.street ?? '',
      line2: null,
      city: vistaData.address?.city ?? '',
      state: vistaData.address?.state ?? '',
      zip: vistaData.address?.zip ?? '',
      country: 'US',
    },
    payerInfo: null,
    vistaDfn: vistaData.dfn,
  };
}
