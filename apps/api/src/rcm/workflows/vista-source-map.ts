/**
 * VistA Source Map — Phase 94: PH HMO Workflow Automation
 *
 * Maps every workflow data field to its VistA source (RPC, file, routine)
 * or marks it as "integration_pending" with the target RPC/routine to
 * implement. This is the single reference for VistA-first provenance.
 *
 * Categories:
 *   - LOA fields (patient, encounter, codes, provider, facility)
 *   - Claim fields (charges, billing provider, payer)
 *   - Remittance fields (payment, adjustment, denial)
 */

export interface VistaSourceEntry {
  field: string;
  category: "loa" | "claim" | "remittance" | "common";
  vistaSource: string | null;
  rpcName?: string;
  vistaFile?: string;
  status: "available" | "integration_pending" | "not_applicable";
  targetRpc?: string;
  targetRoutine?: string;
  sandboxNote?: string;
}

export const VISTA_SOURCE_MAP: VistaSourceEntry[] = [
  // ─── Common (Patient) ────────────────────────────────────
  {
    field: "patientDfn",
    category: "common",
    vistaSource: "ORWPT LIST ALL / ORWPT FULLSSN",
    rpcName: "ORWPT LIST ALL",
    vistaFile: "^DPT(DFN)",
    status: "available",
    sandboxNote: "Available in WorldVistA sandbox",
  },
  {
    field: "patientName",
    category: "common",
    vistaSource: "ORWPT LIST ALL / ORWPT SELECT",
    rpcName: "ORWPT SELECT",
    vistaFile: "^DPT(DFN,0)",
    status: "available",
  },
  {
    field: "patientDob",
    category: "common",
    vistaSource: "ORWPT SELECT (DOB field)",
    rpcName: "ORWPT SELECT",
    vistaFile: "^DPT(DFN,0) piece 3",
    status: "available",
  },

  // ─── LOA Fields ──────────────────────────────────────────
  {
    field: "encounterDate",
    category: "loa",
    vistaSource: "ORWCV VST (visit context)",
    rpcName: "ORWCV VST",
    vistaFile: "^AUPNVSIT",
    status: "available",
    sandboxNote: "Visits available in sandbox via PCE",
  },
  {
    field: "encounterIen",
    category: "loa",
    vistaSource: "ORWCV VST (visit IEN)",
    rpcName: "ORWCV VST",
    vistaFile: "^AUPNVSIT(IEN)",
    status: "available",
  },
  {
    field: "diagnosisCodes",
    category: "loa",
    vistaSource: "ORWPCE PCE4NOTE (diagnosis entries)",
    rpcName: "ORWPCE PCE4NOTE",
    vistaFile: "^AUPNVPOV",
    status: "available",
    sandboxNote: "ICD-10 diagnoses from PCE encounters",
  },
  {
    field: "procedureCodes",
    category: "loa",
    vistaSource: "ORWPCE PCE4NOTE (procedure entries)",
    rpcName: "ORWPCE PCE4NOTE",
    vistaFile: "^AUPNVCPT",
    status: "available",
    sandboxNote: "CPT codes from PCE encounters",
  },
  {
    field: "providerName",
    category: "loa",
    vistaSource: "ORWU NEWPERS (provider lookup)",
    rpcName: "ORWU NEWPERS",
    vistaFile: "^VA(200,DUZ)",
    status: "available",
  },
  {
    field: "providerDuz",
    category: "loa",
    vistaSource: "Session DUZ from authentication",
    status: "available",
  },
  {
    field: "facilityName",
    category: "loa",
    vistaSource: "ORWU PARAM (institution name)",
    rpcName: "ORWU PARAM",
    vistaFile: "^DIC(4,IEN)",
    status: "available",
  },
  {
    field: "memberId",
    category: "loa",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "IBCNS INSURED INFO",
    targetRoutine: "IBCNSP",
    sandboxNote: "Insurance data in ^DPT(DFN,.312) -- IB subsystem present but insurance entries empty in sandbox",
  },

  // ─── Claim Fields ────────────────────────────────────────
  {
    field: "totalCharge",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "IBD GET CHARGES",
    targetRoutine: "IBDCR",
    vistaFile: "^IB(350)",
    sandboxNote: "IB charges file empty in WorldVistA sandbox",
  },
  {
    field: "billingProviderNpi",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "XUSNPI GET NPI",
    targetRoutine: "XUSNPI",
    vistaFile: "^VA(200,DUZ,'NPI')",
    sandboxNote: "NPI field exists in New Person file but may not be populated in sandbox",
  },
  {
    field: "renderingProviderNpi",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "XUSNPI GET NPI",
    targetRoutine: "XUSNPI",
    sandboxNote: "Same as billingProviderNpi -- from New Person file",
  },
  {
    field: "facilityNpi",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "XUSNPI GET NPI",
    vistaFile: "^DIC(4,IEN,'NPI')",
    sandboxNote: "Institution NPI -- may not be populated in sandbox",
  },
  {
    field: "subscriberId",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "IBCNS INSURED INFO",
    targetRoutine: "IBCNSP",
    vistaFile: "^DPT(DFN,.312)",
    sandboxNote: "Insurance subscriber ID from patient insurance file",
  },
  {
    field: "vistaChargeIen",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "IBD GET CHARGES",
    vistaFile: "^IB(350,IEN)",
    sandboxNote: "IB charges file empty in sandbox",
  },
  {
    field: "vistaArIen",
    category: "claim",
    vistaSource: null,
    status: "integration_pending",
    targetRpc: "RCDPE GET ACCOUNT",
    vistaFile: "^PRCA(430,IEN)",
    sandboxNote: "AR transactions file empty in sandbox",
  },
  {
    field: "dateOfService",
    category: "claim",
    vistaSource: "ORWCV VST",
    rpcName: "ORWCV VST",
    vistaFile: "^AUPNVSIT",
    status: "available",
  },

  // ─── Remittance Fields ───────────────────────────────────
  {
    field: "paidAmount",
    category: "remittance",
    vistaSource: null,
    status: "not_applicable",
    sandboxNote: "Remittance data comes from payer (EOB/SOA), not from VistA. Posted to VistA AR after reconciliation.",
  },
  {
    field: "adjustmentAmount",
    category: "remittance",
    vistaSource: null,
    status: "not_applicable",
    sandboxNote: "Payer-side adjustment -- posted to VistA via PRCA RECEIPTS after reconciliation",
  },
  {
    field: "denialReason",
    category: "remittance",
    vistaSource: null,
    status: "not_applicable",
    sandboxNote: "Denial reason from payer EOB. Mapped to denial library for analytics.",
  },
  {
    field: "patientResponsibility",
    category: "remittance",
    vistaSource: null,
    status: "not_applicable",
    sandboxNote: "Patient portion from payer EOB -- posted to VistA patient billing",
  },
];

/* ── Queries ────────────────────────────────────────────────── */

export function getVistaSourceMap(category?: string): VistaSourceEntry[] {
  if (!category) return VISTA_SOURCE_MAP;
  return VISTA_SOURCE_MAP.filter(e => e.category === category);
}

export function getVistaSourceForField(field: string): VistaSourceEntry | undefined {
  return VISTA_SOURCE_MAP.find(e => e.field === field);
}

export function getVistaSourceStats(): {
  total: number;
  available: number;
  integrationPending: number;
  notApplicable: number;
  byCategory: Record<string, { available: number; pending: number; na: number }>;
} {
  const stats = { total: 0, available: 0, integrationPending: 0, notApplicable: 0, byCategory: {} as Record<string, { available: number; pending: number; na: number }> };

  for (const entry of VISTA_SOURCE_MAP) {
    stats.total++;
    if (entry.status === "available") stats.available++;
    else if (entry.status === "integration_pending") stats.integrationPending++;
    else stats.notApplicable++;

    if (!stats.byCategory[entry.category]) {
      stats.byCategory[entry.category] = { available: 0, pending: 0, na: 0 };
    }
    const cat = stats.byCategory[entry.category];
    if (entry.status === "available") cat.available++;
    else if (entry.status === "integration_pending") cat.pending++;
    else cat.na++;
  }

  return stats;
}
