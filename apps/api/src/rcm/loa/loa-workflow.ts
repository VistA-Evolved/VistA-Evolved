/**
 * LOA Workflow — Phase 94: PH HMO Workflow Automation
 *
 * Orchestrates LOA request lifecycle with payer-specific adapter
 * behaviors. Delegates packet generation to Phase 93 adapters.
 *
 * VistA-first: encounter/order data comes from VistA RPCs when available.
 * If VistA integration is incomplete, surfaces "integration-pending"
 * with target RPC documentation.
 */

import { getPhHmo, initPhHmoRegistry } from '../payers/ph-hmo-registry.js';
import { createLoaRequestPacket } from '../payers/ph-hmo-adapter.js';
import { createLoaRequest, getLoaRequest, transitionLoa } from './loa-store.js';
import type { LoaRequest, LoaSubmissionMode } from './loa-types.js';

/* ── Ensure registry loaded ─────────────────────────────────── */

let registryInitDone = false;
function ensureRegistry(): void {
  if (!registryInitDone) {
    initPhHmoRegistry();
    registryInitDone = true;
  }
}

/* ── Resolve submission mode from payer ─────────────────────── */

export function resolveSubmissionMode(payerId: string): {
  mode: LoaSubmissionMode;
  portalUrl?: string;
  instructions: string[];
} {
  ensureRegistry();
  const hmo = getPhHmo(payerId);
  if (!hmo) {
    return { mode: 'manual', instructions: ['Unknown payer -- use manual submission'] };
  }

  if (hmo.integrationMode === 'portal') {
    const portalEvidence = hmo.evidence.find((e) => e.kind === 'provider_portal');
    return {
      mode: 'portal',
      portalUrl: portalEvidence?.url,
      instructions: [
        `Open provider portal: ${portalEvidence?.url ?? 'URL not available'}`,
        'Log in with facility credentials (NOT stored in system)',
        'Navigate to LOA / Letter of Authorization section',
        'Fill in required fields from LOA packet',
        'Submit and record the LOA reference number',
      ],
    };
  }

  if (hmo.integrationMode === 'email') {
    return {
      mode: 'email',
      instructions: [
        `Prepare email to ${hmo.legalName}`,
        'Attach LOA packet with all required fields',
        'Include clinical justification documents',
        'Send and track response',
      ],
    };
  }

  return {
    mode: 'manual',
    instructions: [
      `Contact ${hmo.legalName} through their designated channel`,
      'Provide all required fields from LOA packet',
      'Request LOA reference number',
      'Document response in system',
    ],
  };
}

/* ── Create LOA with payer-aware defaults ───────────────────── */

export function createLoaWithPayerDefaults(params: {
  tenantId: string;
  patientDfn: string;
  patientName?: string;
  encounterDate: string;
  encounterIen?: string;
  diagnosisCodes?: LoaRequest['diagnosisCodes'];
  procedureCodes?: LoaRequest['procedureCodes'];
  providerName?: string;
  providerDuz?: string;
  facilityName?: string;
  payerId: string;
  memberId?: string;
  createdBy: string;
}): LoaRequest {
  ensureRegistry();

  const hmo = getPhHmo(params.payerId);
  const resolved = resolveSubmissionMode(params.payerId);

  return createLoaRequest({
    ...params,
    payerName: hmo?.legalName,
    submissionMode: resolved.mode,
    portalUrl: resolved.portalUrl,
  });
}

/* ── Generate LOA packet for existing request ───────────────── */

export function generateLoaPacketForRequest(loaId: string): {
  ok: boolean;
  packet?: ReturnType<typeof createLoaRequestPacket>;
  instructions: string[];
  error?: string;
} {
  const loa = getLoaRequest(loaId);
  if (!loa) return { ok: false, instructions: [], error: 'LOA request not found' };

  ensureRegistry();
  const packet = createLoaRequestPacket(loa.payerId);
  const resolved = resolveSubmissionMode(loa.payerId);

  if (!packet) {
    return {
      ok: false,
      instructions: resolved.instructions,
      error: `No packet template for payer ${loa.payerId}`,
    };
  }

  return { ok: true, packet, instructions: resolved.instructions };
}

/* ── Submit LOA (transition + audit) ────────────────────────── */

export function submitLoa(loaId: string, actor: string, detail?: string): LoaRequest {
  return transitionLoa(loaId, 'submitted', actor, detail ?? 'LOA submitted to payer');
}

/* ── Record payer response ──────────────────────────────────── */

export function recordLoaApproval(
  loaId: string,
  loaReferenceNumber: string,
  approvedDate: string,
  expirationDate: string | undefined,
  actor: string
): LoaRequest {
  return transitionLoa(loaId, 'approved', actor, `Approved: ${loaReferenceNumber}`, {
    loaReferenceNumber,
    approvedDate,
    expirationDate,
  });
}

export function recordLoaDenial(loaId: string, denialReason: string, actor: string): LoaRequest {
  return transitionLoa(loaId, 'denied', actor, `Denied: ${denialReason}`, {
    denialReason,
  });
}
