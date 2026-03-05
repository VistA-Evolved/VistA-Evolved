/**
 * Phase 586 (W42-P15): Stub eRx Adapter
 *
 * Validates NCPDP SCRIPT message structure without transmitting.
 * Used in dev/test/sandbox where no Surescripts or eRx network is available.
 * Returns realistic responses for all operations.
 */

import { randomUUID } from 'node:crypto';
import type {
  ErxAdapter,
  ErxEligibilityResult,
  ErxFormularyCheckResult,
  ErxPatient,
  ErxPayerInfo,
  ErxPharmacySearchResult,
  ErxTransmitResult,
  NewRxMessage,
  RxRenewalResponseMessage,
  CancelRxMessage,
  ScriptMessage,
} from './types.js';

function validateNewRx(msg: NewRxMessage): string[] {
  const errors: string[] = [];
  if (!msg.prescriber?.npi) errors.push('prescriber.npi is required');
  if (!msg.patient?.lastName) errors.push('patient.lastName is required');
  if (!msg.patient?.firstName) errors.push('patient.firstName is required');
  if (!msg.patient?.dateOfBirth) errors.push('patient.dateOfBirth is required');
  if (!msg.pharmacy?.ncpdpId) errors.push('pharmacy.ncpdpId is required');
  if (!msg.medication?.drugDescription) errors.push('medication.drugDescription is required');
  if (!msg.medication?.quantity || msg.medication.quantity <= 0)
    errors.push('medication.quantity must be > 0');
  if (!msg.medication?.directions) errors.push('medication.directions (SIG) is required');
  if (msg.medication?.schedule === 'II' && !msg.prescriber?.dea)
    errors.push('prescriber.dea is required for Schedule II');
  return errors;
}

export class StubErxAdapter implements ErxAdapter {
  readonly provider = 'stub' as const;
  readonly supportsEpcs = false;

  async transmitNewRx(msg: NewRxMessage): Promise<ErxTransmitResult> {
    const errors = validateNewRx(msg);
    if (errors.length > 0) {
      return {
        ok: false,
        messageId: msg.header.messageId,
        networkMessageId: null,
        timestamp: new Date().toISOString(),
        error: `Validation failed: ${errors.join('; ')}`,
      };
    }
    return {
      ok: true,
      messageId: msg.header.messageId,
      networkMessageId: `STUB-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      error: null,
    };
  }

  async transmitRenewalResponse(msg: RxRenewalResponseMessage): Promise<ErxTransmitResult> {
    if (!msg.responseCode) {
      return {
        ok: false,
        messageId: msg.header.messageId,
        networkMessageId: null,
        timestamp: new Date().toISOString(),
        error: 'responseCode is required (A/D/C)',
      };
    }
    return {
      ok: true,
      messageId: msg.header.messageId,
      networkMessageId: `STUB-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      error: null,
    };
  }

  async transmitCancelRx(msg: CancelRxMessage): Promise<ErxTransmitResult> {
    if (!msg.rxNumber) {
      return {
        ok: false,
        messageId: msg.header.messageId,
        networkMessageId: null,
        timestamp: new Date().toISOString(),
        error: 'rxNumber is required for cancellation',
      };
    }
    return {
      ok: true,
      messageId: msg.header.messageId,
      networkMessageId: `STUB-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      error: null,
    };
  }

  async searchPharmacies(
    zip: string,
    radius: number,
    name?: string,
  ): Promise<ErxPharmacySearchResult> {
    const stubPharmacies = [
      {
        ncpdpId: '9999901',
        npi: '1234567890',
        name: 'Central Pharmacy',
        phone: '555-0101',
        fax: '555-0102',
        address: {
          line1: '100 Main St',
          line2: null,
          city: 'Anytown',
          state: 'VA',
          zip,
          country: 'US',
        },
        pharmacyType: 'retail' as const,
      },
      {
        ncpdpId: '9999902',
        npi: '1234567891',
        name: 'Mail Order Rx',
        phone: '555-0201',
        fax: '555-0202',
        address: {
          line1: '200 Commerce Dr',
          line2: 'Suite 100',
          city: 'Anytown',
          state: 'VA',
          zip,
          country: 'US',
        },
        pharmacyType: 'mail_order' as const,
      },
    ];
    const filtered = name
      ? stubPharmacies.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()))
      : stubPharmacies;
    return { pharmacies: filtered, total: filtered.length };
  }

  async checkFormulary(ndc: string, _payerInfo: ErxPayerInfo): Promise<ErxFormularyCheckResult> {
    return {
      covered: true,
      tier: 2,
      copay: 25.0,
      priorAuthRequired: false,
      alternatives: [
        { ndc: `${ndc.slice(0, -1)}0`, name: 'Generic Alternative', tier: 1, copay: 10.0 },
      ],
    };
  }

  async checkEligibility(patient: ErxPatient): Promise<ErxEligibilityResult> {
    if (!patient.payerInfo) {
      return {
        eligible: false,
        bin: null,
        pcn: null,
        groupId: null,
        memberId: null,
        payerName: null,
      };
    }
    return {
      eligible: true,
      bin: patient.payerInfo.bin,
      pcn: patient.payerInfo.pcn,
      groupId: patient.payerInfo.groupId,
      memberId: patient.payerInfo.memberId,
      payerName: patient.payerInfo.payerName,
    };
  }

  parseInboundMessage(raw: string): ScriptMessage {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.type || !parsed.header) {
        throw new Error('Missing type or header');
      }
      return parsed as ScriptMessage;
    } catch {
      throw new Error(`Failed to parse inbound SCRIPT message: invalid format`);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 1 };
  }
}
