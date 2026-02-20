/**
 * buildClaimDraftFromVista.ts -- Phase 42: Claim Draft Builder from VistA Data
 *
 * Gathers encounter data from VistA RPCs (ORWPCE VISIT, ORWPCE DIAG,
 * ORWPCE PROC, IBCN INSURANCE QUERY) and builds claim draft candidates.
 *
 * VistA-first: uses live RPCs where data exists, annotates missing fields
 * with `missingFields[]` and `sourceMissing[]` for honest reporting.
 *
 * This module is deterministic and testable -- all VistA calls go through
 * an injectable `RpcCaller` interface so tests can stub responses.
 */

import type { Claim, DiagnosisCode, ClaimLine, ProcedureCode } from '../domain/claim.js';
import { createDraftClaim } from '../domain/claim.js';

/* ── RPC Caller abstraction (injectable for testing) ──────── */

export interface RpcCaller {
  call(rpcName: string, params: string[]): Promise<string[]>;
}

/* ── Types ────────────────────────────────────────────────── */

export interface VistaEncounter {
  visitIen: string;
  dateTime: string;
  location: string;
  service: string;
  visitType: string;
  status: string;
}

export interface VistaDiagnosis {
  code: string;
  description: string;
  qualifier: 'principal' | 'admitting' | 'other';
  visitIen: string;
}

export interface VistaProcedure {
  cptCode: string;
  description: string;
  modifiers: string[];
  visitIen: string;
}

export interface VistaInsurance {
  policyId: string;
  insuranceName: string;
  groupNumber: string;
  subscriberId: string;
  effectiveDate: string;
  expirationDate: string;
  status: string;
}

export interface ClaimDraftCandidate {
  claim: Claim;
  encounter: VistaEncounter;
  missingFields: string[];
  sourceMissing: Array<{
    field: string;
    vistaSource: string;
    reason: string;
  }>;
  rpcsCalled: string[];
}

export interface ClaimDraftResult {
  ok: boolean;
  candidates: ClaimDraftCandidate[];
  encountersFound: number;
  errors: string[];
  rpcsCalled: string[];
}

/* ── Encounter parsing ───────────────────────────────────── */

export function parseEncounters(lines: string[]): VistaEncounter[] {
  return lines
    .filter(line => line && line.trim().length > 0)
    .map(line => {
      const parts = line.split('^');
      return {
        visitIen: (parts[0] || '').trim(),
        dateTime: (parts[1] || '').trim(),
        location: (parts[2] || '').trim(),
        service: (parts[3] || '').trim(),
        visitType: (parts[4] || '').trim(),
        status: (parts[5] || '').trim(),
      };
    })
    .filter(e => e.visitIen);
}

export function parseDiagnoses(lines: string[], visitIen: string): VistaDiagnosis[] {
  return lines
    .filter(line => line && line.trim().length > 0)
    .map((line, idx) => {
      const parts = line.split('^');
      return {
        code: (parts[0] || '').trim(),
        description: (parts[1] || '').trim(),
        qualifier: idx === 0 ? 'principal' as const : 'other' as const,
        visitIen,
      };
    })
    .filter(d => d.code);
}

export function parseProcedures(lines: string[], visitIen: string): VistaProcedure[] {
  return lines
    .filter(line => line && line.trim().length > 0)
    .map(line => {
      const parts = line.split('^');
      return {
        cptCode: (parts[0] || '').trim(),
        description: (parts[1] || '').trim(),
        modifiers: (parts[2] || '').trim() ? (parts[2] || '').trim().split(',') : [],
        visitIen,
      };
    })
    .filter(p => p.cptCode);
}

export function parseInsurance(lines: string[]): VistaInsurance[] {
  return lines
    .filter(line => line && line.trim().length > 0)
    .map(line => {
      const parts = line.split('^');
      return {
        policyId: (parts[0] || '').trim(),
        insuranceName: (parts[1] || '').trim(),
        groupNumber: (parts[2] || '').trim(),
        subscriberId: (parts[3] || '').trim(),
        effectiveDate: (parts[4] || '').trim(),
        expirationDate: (parts[5] || '').trim(),
        status: (parts[6] || '').trim(),
      };
    })
    .filter(p => p.policyId || p.insuranceName);
}

/* ── Date filter helper ──────────────────────────────────── */

function isInDateRange(dateStr: string, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  // VistA dates are often in FM format (YYYMMDD.HHMMSS) or human readable
  // Try ISO comparison if possible
  const d = dateStr.replace(/\s+/g, '');
  if (from && d < from.replace(/-/g, '')) return false;
  if (to && d > to.replace(/-/g, '')) return false;
  return true;
}

/* ── Main builder ────────────────────────────────────────── */

export async function buildClaimDraftFromVista(
  rpc: RpcCaller,
  patientDfn: string,
  actor: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    encounterId?: string;  // specific visit IEN
    payerId?: string;
    tenantId?: string;
  },
): Promise<ClaimDraftResult> {
  const rpcsCalled: string[] = [];
  const errors: string[] = [];

  // 1. Get encounter list
  let encounters: VistaEncounter[];
  try {
    const visitLines = await rpc.call('ORWPCE VISIT', [patientDfn]);
    rpcsCalled.push('ORWPCE VISIT');
    encounters = parseEncounters(visitLines);
  } catch (err: any) {
    return {
      ok: false,
      candidates: [],
      encountersFound: 0,
      errors: [`Failed to fetch encounters: ${err.message}`],
      rpcsCalled,
    };
  }

  // Filter by date range if specified
  if (options?.dateFrom || options?.dateTo) {
    encounters = encounters.filter(e =>
      isInDateRange(e.dateTime, options?.dateFrom, options?.dateTo)
    );
  }

  // Filter to specific encounter if specified
  if (options?.encounterId) {
    encounters = encounters.filter(e => e.visitIen === options.encounterId);
  }

  if (encounters.length === 0) {
    return {
      ok: true,
      candidates: [],
      encountersFound: 0,
      errors: ['No encounters found for the given criteria'],
      rpcsCalled,
    };
  }

  // 2. Get insurance info (once per patient)
  let insurance: VistaInsurance[] = [];
  try {
    const insLines = await rpc.call('IBCN INSURANCE QUERY', [patientDfn]);
    rpcsCalled.push('IBCN INSURANCE QUERY');
    insurance = parseInsurance(insLines);
  } catch {
    errors.push('Insurance query failed -- proceeding without coverage data');
  }

  // 3. Build claim draft for each encounter
  const candidates: ClaimDraftCandidate[] = [];

  for (const enc of encounters.slice(0, 20)) { // cap at 20 encounters
    const missingFields: string[] = [];
    const sourceMissing: ClaimDraftCandidate['sourceMissing'] = [];
    const candidateRpcs = [...rpcsCalled];

    // 3a. Get diagnoses for this encounter
    let diagnoses: VistaDiagnosis[] = [];
    try {
      const diagLines = await rpc.call('ORWPCE DIAG', [enc.visitIen]);
      candidateRpcs.push('ORWPCE DIAG');
      diagnoses = parseDiagnoses(diagLines, enc.visitIen);
    } catch {
      errors.push(`Diagnoses fetch failed for visit ${enc.visitIen}`);
    }

    if (diagnoses.length === 0) {
      missingFields.push('diagnoses');
      sourceMissing.push({
        field: 'diagnoses',
        vistaSource: 'ORWPCE DIAG / ^AUPNVPOV(9000010.07)',
        reason: 'No diagnoses linked to this encounter',
      });
    }

    // 3b. Get procedures for this encounter
    let procedures: VistaProcedure[] = [];
    try {
      const procLines = await rpc.call('ORWPCE PROC', [enc.visitIen]);
      candidateRpcs.push('ORWPCE PROC');
      procedures = parseProcedures(procLines, enc.visitIen);
    } catch {
      errors.push(`Procedures fetch failed for visit ${enc.visitIen}`);
    }

    if (procedures.length === 0) {
      missingFields.push('procedures');
      sourceMissing.push({
        field: 'procedures',
        vistaSource: 'ORWPCE PROC / ^AUPNVCPT(9000010.18)',
        reason: 'No CPT codes linked to this encounter',
      });
    }

    // 3c. Check insurance
    const primaryIns = insurance[0];
    if (!primaryIns) {
      missingFields.push('subscriberId');
      sourceMissing.push({
        field: 'subscriberId',
        vistaSource: 'IBCN INSURANCE QUERY / ^DPT(DFN,.312)',
        reason: 'No insurance policy found for this patient',
      });
      missingFields.push('payerName');
    }

    // 3d. Always-missing in sandbox: IB charge amount
    missingFields.push('ibChargeAmount');
    sourceMissing.push({
      field: 'ibChargeAmount',
      vistaSource: '^IB(350) IB ACTION file',
      reason: 'IB billing empty in WorldVistA sandbox',
    });

    // 3e. Build the claim draft
    const claimDiagnoses: DiagnosisCode[] = diagnoses.map(dx => ({
      code: dx.code,
      codeSystem: 'ICD10' as const,
      qualifier: dx.qualifier,
      description: dx.description,
    }));

    const claimLines: ClaimLine[] = procedures.map((proc, idx) => ({
      lineNumber: idx + 1,
      procedure: {
        code: proc.cptCode,
        codeSystem: 'CPT' as const,
        modifiers: proc.modifiers.length > 0 ? proc.modifiers : undefined,
        units: 1,
        charge: 0, // $0 placeholder -- IB charges not available in sandbox
        dateOfService: enc.dateTime,
        description: proc.description,
      } as ProcedureCode,
      diagnoses: claimDiagnoses.slice(0, 4),
    }));

    const payerId = options?.payerId || primaryIns?.policyId || 'UNASSIGNED';

    const claim = createDraftClaim({
      tenantId: options?.tenantId ?? 'default',
      patientDfn,
      payerId,
      claimType: 'professional',
      dateOfService: enc.dateTime,
      diagnoses: claimDiagnoses,
      lines: claimLines,
      totalCharge: 0, // placeholder
      payerName: primaryIns?.insuranceName,
      subscriberId: primaryIns?.subscriberId,
      actor,
    });

    candidates.push({
      claim,
      encounter: enc,
      missingFields,
      sourceMissing,
      rpcsCalled: candidateRpcs,
    });
  }

  return {
    ok: true,
    candidates,
    encountersFound: encounters.length,
    errors,
    rpcsCalled: [...new Set(rpcsCalled)],
  };
}

/* ── Coverage lookup helper ──────────────────────────────── */

export async function getVistaCoverage(
  rpc: RpcCaller,
  patientDfn: string,
): Promise<{
  ok: boolean;
  policies: VistaInsurance[];
  rpcUsed: string;
  errors: string[];
}> {
  try {
    const lines = await rpc.call('IBCN INSURANCE QUERY', [patientDfn]);
    const policies = parseInsurance(lines);
    return {
      ok: true,
      policies,
      rpcUsed: 'IBCN INSURANCE QUERY',
      errors: [],
    };
  } catch (err: any) {
    return {
      ok: false,
      policies: [],
      rpcUsed: 'IBCN INSURANCE QUERY',
      errors: [err.message],
    };
  }
}
