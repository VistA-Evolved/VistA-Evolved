/**
 * EDI Pipeline — Build → Validate → Send → Track → Receive
 *
 * Orchestrates the lifecycle of an EDI transaction from internal claim
 * representation through X12 generation, validation, transmission via
 * the appropriate connector, and response reconciliation.
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type {
  EdiClaim837,
  EdiEligibilityInquiry270,
  EdiClaimStatusInquiry276,
  EdiPriorAuth278,
  PipelineEntry,
  PipelineStage,
  X12TransactionSet,
  EdiResponseError,
  EdiTransaction,
} from './types.js';
import type { Claim } from '../domain/claim.js';
import { getPayer } from '../payer-registry/registry.js';
import { randomBytes } from 'node:crypto';

/* ─── Pipeline store (in-memory) ──────────────────────────────────── */

const pipelineEntries = new Map<string, PipelineEntry>();
const claimIndex = new Map<string, string[]>(); // claimId → entryIds

function genId(): string {
  return `edi-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/* ─── Public: create pipeline entry ──────────────────────────────── */

export function createPipelineEntry(
  claimId: string,
  transactionSet: X12TransactionSet,
  connectorId: string,
  payerId: string,
): PipelineEntry {
  const now = new Date().toISOString();
  const entry: PipelineEntry = {
    id: genId(),
    claimId,
    transactionSet,
    stage: 'build',
    connectorId,
    payerId,
    errors: [],
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  pipelineEntries.set(entry.id, entry);
  const existing = claimIndex.get(claimId) ?? [];
  existing.push(entry.id);
  claimIndex.set(claimId, existing);
  return entry;
}

/* ─── Public: advance pipeline stage ──────────────────────────────── */

const STAGE_ORDER: PipelineStage[] = [
  'build', 'validate', 'enqueue', 'transmit',
  'ack_pending', 'ack_received', 'response', 'reconciled',
];

export function advancePipelineStage(
  entryId: string,
  newStage: PipelineStage,
  payload?: { outbound?: string; inbound?: string; errors?: EdiResponseError[] },
): PipelineEntry | null {
  const entry = pipelineEntries.get(entryId);
  if (!entry) return null;

  entry.stage = newStage;
  entry.updatedAt = new Date().toISOString();

  if (payload?.outbound) entry.outboundPayload = payload.outbound;
  if (payload?.inbound) entry.inboundPayload = payload.inbound;
  if (payload?.errors) entry.errors.push(...payload.errors);

  if (newStage === 'transmit') entry.attempts += 1;
  if (newStage === 'reconciled' || newStage === 'error' || newStage === 'cancelled') {
    entry.completedAt = new Date().toISOString();
  }

  return entry;
}

/* ─── Public: query ──────────────────────────────────────────────── */

export function getPipelineEntry(entryId: string): PipelineEntry | undefined {
  return pipelineEntries.get(entryId);
}

export function getPipelineEntriesForClaim(claimId: string): PipelineEntry[] {
  const ids = claimIndex.get(claimId) ?? [];
  return ids.map(id => pipelineEntries.get(id)!).filter(Boolean);
}

export function listPipelineEntries(filters?: {
  stage?: PipelineStage;
  payerId?: string;
  transactionSet?: X12TransactionSet;
  limit?: number;
  offset?: number;
}): { items: PipelineEntry[]; total: number } {
  let items = Array.from(pipelineEntries.values());

  if (filters?.stage) items = items.filter(e => e.stage === filters.stage);
  if (filters?.payerId) items = items.filter(e => e.payerId === filters.payerId);
  if (filters?.transactionSet) items = items.filter(e => e.transactionSet === filters.transactionSet);

  const total = items.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

/* ─── Build: Claim → EdiClaim837 ──────────────────────────────────── */

export function buildClaim837FromDomain(claim: Claim): EdiClaim837 {
  // Build a minimal 837P from the internal claim.
  // In production, this would pull full data from VistA IB/AR files.
  const edi: EdiClaim837 = {
    transactionSet: claim.claimType === 'institutional' ? '837I' : '837P',
    controlNumber: claim.id.replace(/[^0-9]/g, '').slice(0, 9).padStart(9, '0'),
    submitterInfo: {
      name: claim.facilityName ?? 'VistA Facility',
      taxId: claim.facilityTaxId ?? '000000000',
      npi: claim.billingProviderNpi ?? '0000000000',
    },
    receiverInfo: {
      name: claim.payerName ?? 'Unknown Payer',
      entityCode: '2',
    },
    billingProvider: {
      name: claim.facilityName ?? 'VistA Facility',
      npi: claim.billingProviderNpi ?? '0000000000',
      taxId: claim.facilityTaxId ?? '000000000',
      address: {
        line1: '123 Medical Center Dr',
        city: 'Anytown',
        state: 'VA',
        zip: '22030',
      },
    },
    subscriber: {
      memberId: claim.subscriberId ?? '',
      firstName: claim.patientFirstName ?? '',
      lastName: claim.patientLastName ?? '',
      dob: claim.patientDob,
      gender: claim.patientGender as 'M' | 'F' | 'U' | undefined,
      relationshipCode: '18', // self
    },
    claimInfo: {
      claimId: claim.id,
      totalChargeAmount: claim.totalCharge,
      facilityCode: claim.claimType === 'institutional' ? '21' : '11',
      frequencyCode: '1', // original
      providerSignature: true,
      assignmentOfBenefits: true,
      releaseOfInfo: 'Y',
      patientAccountNumber: claim.patientDfn,
    },
    diagnosisCodes: (claim.diagnoses ?? []).map((dx: { code: string }, i: number) => ({
      code: dx.code,
      qualifier: 'ABK' as const, // ICD-10-CM
      isPrincipal: i === 0,
    })),
    serviceLines: (claim.lines ?? []).map((sl, i: number) => ({
      lineNumber: i + 1,
      procedureCode: sl.procedure.code,
      modifiers: sl.procedure.modifiers,
      chargeAmount: sl.procedure.charge,
      units: sl.procedure.units,
      unitType: 'UN',
      serviceDate: sl.procedure.dateOfService,
      placeOfService: claim.claimType === 'institutional' ? '21' : '11',
      diagnosisPointers: sl.diagnoses?.map((_d, idx) => idx + 1) ?? [1],
    })),
  };

  return edi;
}

/* ─── Build: Eligibility inquiry ──────────────────────────────────── */

export function buildEligibilityInquiry270(
  memberId: string,
  payerId: string,
  providerNpi: string,
  patientInfo: { firstName: string; lastName: string; dob?: string },
  serviceTypeCodes: string[] = ['30'], // default: plan coverage
): EdiEligibilityInquiry270 {
  const payer = getPayer(payerId);
  return {
    transactionSet: '270',
    controlNumber: randomBytes(4).toString('hex').toUpperCase(),
    informationSource: {
      name: payer?.name ?? 'Unknown Payer',
      payerId,
    },
    informationReceiver: {
      name: 'VistA Facility',
      npi: providerNpi,
    },
    subscriber: {
      memberId,
      firstName: patientInfo.firstName,
      lastName: patientInfo.lastName,
      dob: patientInfo.dob,
    },
    serviceTypeCodes,
  };
}

/* ─── Build: Claim status inquiry ─────────────────────────────────── */

export function buildClaimStatusInquiry276(
  claim: Claim,
  providerNpi: string,
): EdiClaimStatusInquiry276 {
  return {
    transactionSet: '276',
    controlNumber: randomBytes(4).toString('hex').toUpperCase(),
    payerId: claim.payerId,
    providerNpi,
    patientMemberId: claim.subscriberId ?? '',
    claimId: claim.id,
    serviceDate: claim.dateOfService,
    chargeAmount: claim.totalCharge,
  };
}

/* ─── Pipeline stats ──────────────────────────────────────────────── */

export function getPipelineStats(): {
  total: number;
  byStage: Record<string, number>;
  byTransaction: Record<string, number>;
  errorCount: number;
} {
  const byStage: Record<string, number> = {};
  const byTransaction: Record<string, number> = {};
  let errorCount = 0;

  for (const entry of pipelineEntries.values()) {
    byStage[entry.stage] = (byStage[entry.stage] ?? 0) + 1;
    byTransaction[entry.transactionSet] = (byTransaction[entry.transactionSet] ?? 0) + 1;
    if (entry.errors.length > 0) errorCount++;
  }

  return {
    total: pipelineEntries.size,
    byStage,
    byTransaction,
    errorCount,
  };
}

/* ─── Reset (for testing) ────────────────────────────────────────── */

export function resetPipeline(): void {
  pipelineEntries.clear();
  claimIndex.clear();
}
