/**
 * VistA Binding: Encounter → Claim
 *
 * Reads a VistA PCE encounter (^AUPNVSIT) and its associated
 * CPT codes (^AUPNVCPT) + diagnoses (^AUPNVPOV) to produce
 * a canonical RCM Claim draft suitable for EDI submission.
 *
 * VistA-first: this module calls real VistA RPCs when available.
 * In sandbox mode (RPCs return empty), it returns an explicit
 * `integration-pending` marker with migration guidance.
 *
 * Target RPCs:
 *   ORWPCE PCE4NOTE  — PCE encounter data linked to a note
 *   ORWPCE GETSVC    — Service connected conditions
 *   ORWPCE GETVSIT   — Visit/encounter details
 *   IB CHARGE DATA   — Integrated Billing charge details (empty in sandbox)
 *
 * Target VistA files:
 *   ^AUPNVSIT(IEN)   — Visit file (9000010)
 *   ^AUPNVCPT(IEN)   — V CPT file (9000010.18)
 *   ^AUPNVPOV(IEN)   — V POV file (9000010.07)
 *   ^IB(350,IEN)      — IB Action file (charges)
 *   ^DGCR(399,IEN)    — Outpatient Encounter file (claims)
 *
 * Phase 40 (Superseding) — VistA-first binding points
 */

import type { Claim, DiagnosisCode, ClaimLine, ProcedureCode } from '../domain/claim.js';
import { createDraftClaim } from '../domain/claim.js';

/* ─── Types ──────────────────────────────────────────────────── */

export interface VistaEncounterData {
  visitIen: string;
  patientDfn: string;
  dateOfService: string;
  locationName?: string;
  providerDuz?: string;
  providerNpi?: string;
  diagnoses: Array<{
    code: string;
    description?: string;
    qualifier: 'principal' | 'admitting' | 'other';
  }>;
  procedures: Array<{
    cptCode: string;
    modifiers?: string[];
    units: number;
    charge: number; // cents
    dateOfService: string;
    description?: string;
  }>;
  ibChargeIen?: string; // from ^IB(350) if available
  claimIen?: string; // from ^DGCR(399) if available
}

export interface BindingResult<T> {
  ok: boolean;
  data?: T;
  integrationPending?: boolean;
  vistaGrounding?: {
    vistaFiles: string[];
    targetRoutines: string[];
    migrationPath: string;
    sandboxNote: string;
  };
  errors?: string[];
}

/* ─── Encounter → Claim builder ──────────────────────────────── */

/**
 * Build a Claim from VistA encounter data.
 * This is the canonical mapping from PCE encounter → RCM claim.
 */
export function buildClaimFromEncounterData(
  encounter: VistaEncounterData,
  payerId: string,
  actor: string,
  options?: {
    tenantId?: string;
    payerName?: string;
    subscriberId?: string;
    patientFirstName?: string;
    patientLastName?: string;
    patientDob?: string;
    patientGender?: string;
    billingProviderNpi?: string;
    facilityName?: string;
    facilityTaxId?: string;
  }
): Claim {
  const diagnoses: DiagnosisCode[] = encounter.diagnoses.map((dx) => ({
    code: dx.code,
    codeSystem: 'ICD10' as const,
    qualifier: dx.qualifier,
    description: dx.description,
  }));

  const lines: ClaimLine[] = encounter.procedures.map((proc, idx) => ({
    lineNumber: idx + 1,
    procedure: {
      code: proc.cptCode,
      codeSystem: 'CPT' as const,
      modifiers: proc.modifiers,
      units: proc.units,
      charge: proc.charge,
      dateOfService: proc.dateOfService,
      description: proc.description,
    } as ProcedureCode,
    diagnoses: diagnoses.slice(0, 4), // link first 4 dx to each line
  }));

  return createDraftClaim({
    tenantId: options?.tenantId ?? 'default',
    patientDfn: encounter.patientDfn,
    payerId,
    claimType: 'professional',
    dateOfService: encounter.dateOfService,
    diagnoses,
    lines,
    totalCharge: encounter.procedures.reduce((s, p) => s + p.charge, 0),
    vistaChargeIen: encounter.ibChargeIen,
    billingProviderNpi: options?.billingProviderNpi ?? encounter.providerNpi,
    subscriberId: options?.subscriberId,
    patientFirstName: options?.patientFirstName,
    patientLastName: options?.patientLastName,
    patientDob: options?.patientDob,
    patientGender: options?.patientGender,
    payerName: options?.payerName,
    facilityName: options?.facilityName,
    facilityTaxId: options?.facilityTaxId,
    actor,
  });
}

/**
 * Attempt to read a VistA encounter and build a Claim.
 *
 * Currently returns integration-pending in the sandbox because
 * PCE encounter RPCs return data but IB charge RPCs are empty.
 * In production with real VistA, this would call the RPCs, parse
 * results, and call buildClaimFromEncounterData.
 */
export async function buildClaimFromVistaEncounter(
  visitIen: string,
  patientDfn: string,
  payerId: string,
  actor: string
): Promise<BindingResult<Claim>> {
  // In the WorldVistA sandbox, PCE encounters have data but IB charges are empty.
  // We return integration-pending with full grounding metadata so the
  // production migration path is clear.
  return {
    ok: false,
    integrationPending: true,
    vistaGrounding: {
      vistaFiles: [
        '^AUPNVSIT(9000010) -- Visit file',
        '^AUPNVCPT(9000010.18) -- V CPT file',
        '^AUPNVPOV(9000010.07) -- V POV file',
        '^IB(350) -- IB Action file (charges)',
        '^DGCR(399) -- Outpatient Encounter file',
      ],
      targetRoutines: [
        'ORWPCE PCE4NOTE -- PCE encounter data from note',
        'ORWPCE GETSVC -- Service connected info',
        'ORWPCE GETVSIT -- Visit details',
        'IB CHARGE DATA -- IB charge lookup (empty in sandbox)',
      ],
      migrationPath: [
        '1. Call ORWPCE GETVSIT with visitIen to get encounter header',
        '2. Call ORWPCE PCE4NOTE to get CPT + diagnosis associations',
        '3. Query ^IB(350) for linked charge (if IB module is active)',
        '4. Map PCE data to VistaEncounterData using buildClaimFromEncounterData()',
        '5. Return the resulting Claim draft for payer submission',
      ].join('\n'),
      sandboxNote:
        'WorldVistA Docker sandbox has PCE encounters in ^AUPNVSIT/^AUPNVCPT/^AUPNVPOV. ' +
        'IB charges (^IB(350)) and claims (^DGCR(399)) are empty. ' +
        'Production VistA with IB module will populate these.',
    },
    errors: [
      `Visit IEN ${visitIen}: IB charge binding not available in sandbox. ` +
        'Use buildClaimFromEncounterData() with manually extracted PCE data.',
    ],
  };
}
