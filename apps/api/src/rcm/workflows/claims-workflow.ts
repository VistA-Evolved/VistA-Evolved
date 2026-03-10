/**
 * Claims Workflow -- Phase 94: PH HMO Workflow Automation
 *
 * Unified claims submission workflow for PH HMO payers.
 * Wraps the existing claim-store (Phase 38) with payer-aware
 * submission logic. Does NOT duplicate the claim store.
 *
 * Submission modes:
 *   - manual: download packet for physical/fax submission
 *   - portal: deep link + step-by-step checklist
 *   - email: template + attachment generation
 *
 * VistA-first: claim inputs come from VistA clinical/billing events.
 * If VistA IB integration is incomplete, surfaces "integration-pending"
 * with target RPCs documented.
 */

import { getPhHmo, initPhHmoRegistry } from '../payers/ph-hmo-registry.js';
import { createClaimPacket } from '../payers/ph-hmo-adapter.js';
import { randomUUID } from 'node:crypto';
import { log } from '../../lib/logger.js';
import { getClaim, listClaims, storeClaim, updateClaim } from '../domain/claim-store.js';
import { createDraftClaim, transitionClaim } from '../domain/claim.js';
import type { Claim, ClaimStatus } from '../domain/claim.js';
import type { LoaSubmissionMode } from '../loa/loa-types.js';

/* -- Ensure registry loaded ----------------------------------- */

let registryInitDone = false;
function ensureRegistry(): void {
  if (!registryInitDone) {
    initPhHmoRegistry();
    registryInitDone = true;
  }
}

/* -- Submission mode resolution ------------------------------- */

export type ClaimSubmissionMode = LoaSubmissionMode; // manual | portal | email

export interface ClaimSubmissionPlan {
  mode: ClaimSubmissionMode;
  portalUrl?: string;
  instructions: string[];
  requiredDocuments: string[];
  integrationPendingFields: string[];
}

export function resolveClaimSubmissionPlan(payerId: string): ClaimSubmissionPlan {
  ensureRegistry();
  const hmo = getPhHmo(payerId);

  const integrationPending = [
    'totalCharge (VistA IB ^IB(350) -- empty in sandbox)',
    'billingProviderNpi (VistA XUSNPI -- may not be populated)',
    'subscriberId (VistA IBCNS -- insurance entries empty in sandbox)',
  ];

  if (!hmo) {
    return {
      mode: 'manual',
      instructions: ['Unknown payer -- prepare claim packet for manual submission'],
      requiredDocuments: [
        'LOA approval letter',
        'Itemized charges',
        'Supporting clinical documents',
      ],
      integrationPendingFields: integrationPending,
    };
  }

  const baseDocuments = [
    'LOA approval letter / reference number',
    'Itemized statement of charges',
    'Clinical summary / discharge summary',
    'Laboratory results (if applicable)',
    'Imaging reports (if applicable)',
  ];

  if (hmo.integrationMode === 'portal') {
    const portalEvidence = hmo.evidence.find((e) => e.kind === 'provider_portal');
    return {
      mode: 'portal',
      portalUrl: portalEvidence?.url,
      instructions: [
        `Open provider portal: ${portalEvidence?.url ?? 'URL not available'}`,
        'Navigate to Claims Submission section',
        'Enter LOA reference number to link claim',
        'Verify all line items match VistA encounter data',
        'Attach required supporting documents',
        'Submit and record claim tracking number',
      ],
      requiredDocuments: baseDocuments,
      integrationPendingFields: integrationPending,
    };
  }

  if (hmo.integrationMode === 'email') {
    return {
      mode: 'email',
      instructions: [
        `Prepare claim email to ${hmo.legalName}`,
        'Attach claim packet with all line items',
        'Include LOA reference number',
        'Attach supporting documents',
        'Send and track response',
      ],
      requiredDocuments: baseDocuments,
      integrationPendingFields: integrationPending,
    };
  }

  return {
    mode: 'manual',
    instructions: [
      `Prepare claim packet for ${hmo.legalName}`,
      'Include all required fields and supporting documents',
      'Submit through designated channel (fax/courier/drop-off)',
      'Record submission date and tracking info',
    ],
    requiredDocuments: baseDocuments,
    integrationPendingFields: integrationPending,
  };
}

/* -- Create claim with HMO context --------------------------- */

export function createHmoClaim(params: {
  tenantId: string;
  patientDfn: string;
  patientName?: string;
  payerId: string;
  dateOfService: string;
  diagnosisCodes?: Claim['diagnoses'];
  lines?: Claim['lines'];
  totalCharge?: number;
  loaReferenceNumber?: string;
  actor: string;
}): { claim: Claim; submissionPlan: ClaimSubmissionPlan } {
  ensureRegistry();

  const hmo = getPhHmo(params.payerId);
  const plan = resolveClaimSubmissionPlan(params.payerId);

  const claim = createDraftClaim({
    tenantId: params.tenantId,
    patientDfn: params.patientDfn,
    patientName: params.patientName,
    payerId: params.payerId,
    payerName: hmo?.legalName,
    dateOfService: params.dateOfService,
    diagnoses: params.diagnosisCodes,
    lines: params.lines,
    totalCharge: params.totalCharge,
    actor: params.actor,
  });

  storeClaim(claim);
  return { claim, submissionPlan: plan };
}

/* -- Generate claim packet for existing claim ----------------- */

export async function generateClaimPacketForClaim(tenantId: string, claimId: string): Promise<{
  ok: boolean;
  packet?: ReturnType<typeof createClaimPacket>;
  submissionPlan?: ClaimSubmissionPlan;
  error?: string;
}> {
  const claim = await getClaim(claimId, tenantId);
  if (!claim) return { ok: false, error: 'Claim not found' };

  ensureRegistry();
  const packet = createClaimPacket(claim.payerId);
  const plan = resolveClaimSubmissionPlan(claim.payerId);

  if (!packet) {
    return {
      ok: false,
      submissionPlan: plan,
      error: `No packet template for payer ${claim.payerId}`,
    };
  }

  return { ok: true, packet, submissionPlan: plan };
}

/* -- Transition with validation ------------------------------- */

export async function transitionHmoClaim(
  tenantId: string,
  claimId: string,
  toStatus: ClaimStatus,
  actor: string,
  detail?: string
): Promise<Claim> {
  const claim = await getClaim(claimId, tenantId);
  if (!claim) throw new Error(`Claim not found: ${claimId}`);

  const updated = transitionClaim(claim, toStatus, actor, detail);
  updateClaim(updated);
  return updated;
}

/* -- Denial capture ------------------------------------------- */

export interface DenialRecord {
  tenantId: string;
  claimId: string;
  reasonText: string;
  reasonCode?: string;
  deniedAt: string;
  recordedBy: string;
}

/* -- Denial DB repo (Phase 146: durable denial storage) ---- */

interface DenialDbRepo {
  insert(data: any): Promise<any>;
  findByField(field: string, value: unknown, tenantId?: string): Promise<any[]>;
}

let denialDbRepo: DenialDbRepo | null = null;

export function initDenialStoreRepo(repo: DenialDbRepo): void {
  denialDbRepo = repo;
}

const denialStore = new Map<string, DenialRecord[]>();

export async function recordDenial(params: {
  tenantId: string;
  claimId: string;
  reasonText: string;
  reasonCode?: string;
  actor: string;
}): Promise<DenialRecord> {
  const claim = await getClaim(params.claimId, params.tenantId);
  if (!claim) {
    throw new Error(`Claim not found: ${params.claimId}`);
  }
  const record: DenialRecord = {
    tenantId: params.tenantId,
    claimId: params.claimId,
    reasonText: params.reasonText,
    reasonCode: params.reasonCode,
    deniedAt: new Date().toISOString(),
    recordedBy: params.actor,
  };

  const existing = denialStore.get(params.claimId) ?? [];
  existing.push(record);
  denialStore.set(params.claimId, existing);

  // Phase 146: Write-through to PG
  denialDbRepo
    ?.insert({
      id: randomUUID(),
      tenantId: params.tenantId,
      claimId: params.claimId,
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonText,
      denialDate: record.deniedAt,
      status: 'open',
      createdAt: record.deniedAt,
      updatedAt: record.deniedAt,
    })
    .catch((e) => log.warn('PG write-through failed', { error: String(e) }));

  return record;
}

export async function getDenials(tenantId: string, claimId: string): Promise<DenialRecord[]> {
  const claim = await getClaim(claimId, tenantId);
  if (!claim) return [];
  return (denialStore.get(claimId) ?? []).filter((d) => d.tenantId === tenantId);
}

/* -- Status board summary ------------------------------------- */

export async function getClaimsStatusBoard(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  recentDenials: DenialRecord[];
}> {
  const { claims, total } = await listClaims(tenantId, { limit: 10000 });
  const byStatus: Record<string, number> = {};
  for (const c of claims) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  const recentDenials: DenialRecord[] = [];
  for (const [, records] of denialStore) {
    recentDenials.push(...records.filter((r) => r.tenantId === tenantId));
  }
  recentDenials.sort((a, b) => b.deniedAt.localeCompare(a.deniedAt));

  return {
    total,
    byStatus,
    recentDenials: recentDenials.slice(0, 20),
  };
}
