/**
 * PH Market Dashboard — Phase 97B
 *
 * Aggregated view of the PH HMO market: integration status, capability
 * coverage, contracting progress, and operational readiness.
 *
 * This is a read-only diagnostic service for admin dashboards.
 */

import { generateHmoManifest, type PayerTypeClassification } from "./adapter-manifest.js";
import { getContractingDashboard, type ContractingDashboard } from "./contracting-hub.js";
import { LOA_TEMPLATES } from "./loa-templates.js";
import { CLAIM_PACKET_CONFIGS } from "./claim-packet-config.js";

/* ── Market Summary Types ───────────────────────────────────── */

export interface MarketSummary {
  generatedAt: string;

  /** Total IC-licensed HMOs */
  totalHmos: number;

  /** Breakdown by payer type */
  byPayerType: Record<PayerTypeClassification, number>;

  /** Integration readiness */
  integration: {
    portalAdapterAvailable: number;
    genericManualAdapter: number;
    manualOnly: number;
    totalWithAdapter: number;
    adapterCoveragePct: number;
  };

  /** Capability matrix coverage */
  capabilities: {
    totalCapabilitySlots: number;     // total HMOs * 7 core keys
    knownSlots: number;
    unknownSlots: number;
    coveragePct: number;
  };

  /** LOA template coverage */
  loaTemplates: {
    total: number;
    withPortalSubmission: number;
    withManualSubmission: number;
    withTurnaroundEstimate: number;
  };

  /** Claim packet config coverage */
  claimPackets: {
    total: number;
    withPortalUpload: number;
    withFilingDeadline: number;
    withAppealWindow: number;
  };

  /** Contracting progress */
  contracting: {
    totalTasks: number;
    completedTasks: number;
    progressPct: number;
    byStatus: Record<string, number>;
  };
}

/* ── Generate market summary ────────────────────────────────── */

export function generateMarketSummary(tenantId?: string): MarketSummary {
  const manifest = generateHmoManifest();
  let contracting: ContractingDashboard;
  try {
    contracting = getContractingDashboard(tenantId);
  } catch {
    // DB not available — provide defaults
    contracting = {
      generatedAt: new Date().toISOString(),
      totalPayers: 0,
      totalTasks: 0,
      byStatus: { open: 0, in_progress: 0, blocked: 0, done: 0 },
      payers: [],
    };
  }

  // Integration stats
  const portalAdapterAvailable = manifest.byAdapterStatus["portal_adapter_available"] ?? 0;
  const genericManualAdapter = manifest.byAdapterStatus["generic_manual_adapter"] ?? 0;
  const manualOnly = manifest.byAdapterStatus["manual_only"] ?? 0;
  const totalWithAdapter = portalAdapterAvailable + genericManualAdapter;
  const adapterCoveragePct = manifest.totalHmos > 0
    ? Math.round((totalWithAdapter / manifest.totalHmos) * 100)
    : 0;

  // Capability coverage
  const totalCapabilitySlots = manifest.totalHmos * 7; // 7 core keys
  let knownSlots = 0;
  for (const entry of manifest.entries) {
    knownSlots += entry.capabilityCoverage.known;
  }

  // LOA template stats
  const loaTemplateValues = Object.values(LOA_TEMPLATES);
  const withPortalSubmission = loaTemplateValues.filter(t => t.submissionMethod === "portal").length;
  const withManualSubmission = loaTemplateValues.filter(t => t.submissionMethod === "manual").length;
  const withTurnaroundEstimate = loaTemplateValues.filter(t => t.defaultTurnaroundDays !== null).length;

  // Claim packet stats
  const claimConfigValues = Object.values(CLAIM_PACKET_CONFIGS);
  const withPortalUpload = claimConfigValues.filter(c => c.submissionFormat === "portal_upload").length;
  const withFilingDeadline = claimConfigValues.filter(c => c.filingDeadlineDays !== null).length;
  const withAppealWindow = claimConfigValues.filter(c => c.appealWindowDays !== null).length;

  return {
    generatedAt: new Date().toISOString(),
    totalHmos: manifest.totalHmos,
    byPayerType: manifest.byPayerType,
    integration: {
      portalAdapterAvailable,
      genericManualAdapter,
      manualOnly,
      totalWithAdapter,
      adapterCoveragePct,
    },
    capabilities: {
      totalCapabilitySlots,
      knownSlots,
      unknownSlots: totalCapabilitySlots - knownSlots,
      coveragePct: totalCapabilitySlots > 0
        ? Math.round((knownSlots / totalCapabilitySlots) * 100)
        : 0,
    },
    loaTemplates: {
      total: loaTemplateValues.length,
      withPortalSubmission,
      withManualSubmission,
      withTurnaroundEstimate,
    },
    claimPackets: {
      total: claimConfigValues.length,
      withPortalUpload,
      withFilingDeadline,
      withAppealWindow,
    },
    contracting: {
      totalTasks: contracting.totalTasks,
      completedTasks: contracting.byStatus.done ?? 0,
      progressPct: contracting.totalTasks > 0
        ? Math.round(((contracting.byStatus.done ?? 0) / contracting.totalTasks) * 100)
        : 0,
      byStatus: contracting.byStatus,
    },
  };
}
