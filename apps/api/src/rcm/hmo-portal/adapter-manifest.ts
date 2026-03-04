/**
 * HMO Adapter Manifest Generator — Phase 97B
 *
 * Generates a comprehensive manifest of all 27 IC-licensed PH HMOs
 * with their adapter status, capability coverage, integration readiness,
 * and contracting status.
 *
 * This is a read-only diagnostic view — it does NOT create adapters.
 */

import { listPortalAdapters } from './types.js';
import { initPhHmoRegistry, listPhHmos } from '../payers/ph-hmo-registry.js';
import { listCapabilities } from '../../platform/pg/repo/capability-repo.js';
import { STANDARD_CAPABILITY_KEYS } from '../../platform/pg/repo/capability-repo.js';

/* ── Payer type classification for all 27 HMOs ──────────────── */

export type PayerTypeClassification =
  | 'hmo_l1' // Large HMO with provider portal + API potential
  | 'hmo_l3' // Small/regional HMO, manual-only
  | 'tpa' // Third-party administrator
  | 'government' // Government insurer (PhilHealth)
  | 'private_insurance' // Private insurance (non-HMO)
  | 'other';

/**
 * Classification of all 27 IC-licensed HMOs by operational tier.
 *
 * L1 = Large HMOs with known provider portals and high claim volume
 * L3 = Smaller/regional HMOs with manual or minimal portal workflows
 *
 * Source: IC HMO list + evidence from ph-hmo-registry.json
 */
export const PH_HMO_PAYER_TYPES: Record<string, PayerTypeClassification> = {
  'PH-MAXICARE': 'hmo_l1', // MaxiLink provider portal
  'PH-MEDICARD': 'hmo_l1', // MediCard Online provider portal
  'PH-INTELLICARE': 'hmo_l1', // IntellicareOnline provider portal
  'PH-PHILCARE': 'hmo_l1', // PhilCare provider portal
  'PH-VALUCARE': 'hmo_l1', // ValuCare provider portal
  'PH-INSULAR': 'hmo_l1', // Insular Health — large HMO with portal
  'PH-COCOLIFE': 'hmo_l1', // Cocolife Healthcare — large HMO
  'PH-PACIFIC-CROSS': 'hmo_l1', // Pacific Cross — large, known digital presence
  'PH-ASIANLIFE': 'hmo_l3',
  'PH-AVEGA': 'hmo_l3',
  'PH-CAREHEALTH': 'hmo_l3',
  'PH-CAREWELL': 'hmo_l3',
  'PH-CARITAS': 'hmo_l3',
  'PH-EASTWEST': 'hmo_l3',
  'PH-FORTICARE': 'hmo_l3',
  'PH-HEALTHMAINT': 'hmo_l3',
  'PH-HEALTHPLAN': 'hmo_l3',
  'PH-HEALTHFIRST': 'hmo_l3',
  'PH-ICARE': 'hmo_l3',
  'PH-KAISER-INTL': 'hmo_l3',
  'PH-LIFEHEALTH': 'hmo_l3',
  'PH-MEDILINK': 'hmo_l3',
  'PH-METROCARE': 'hmo_l3',
  'PH-PHILBRITISH': 'hmo_l3',
  'PH-PHCP': 'hmo_l3',
  'PH-PHP': 'hmo_l3',
  'PH-STARCARE': 'hmo_l3',
};

/* ── Adapter status enum ────────────────────────────────────── */

export type AdapterStatus =
  | 'portal_adapter_available' // has per-HMO ManualAssistedAdapter (top-5)
  | 'generic_manual_adapter' // uses generic manual workflow
  | 'manual_only' // no adapter — completely manual
  | 'integration_pending'; // future API adapter planned

/* ── Manifest entry ─────────────────────────────────────────── */

export interface HmoManifestEntry {
  payerId: string;
  legalName: string;
  payerType: PayerTypeClassification;
  caNumber: string | null;
  adapterStatus: AdapterStatus;
  adapterName: string | null;
  integrationMode: string;
  capabilities: Record<string, string>; // capabilityKey -> value
  capabilityCoverage: {
    known: number;
    unknown: number;
    total: number;
    pct: number;
  };
  contractingStatus: string;
  evidence: Array<{ kind: string; url: string; title: string }>;
}

export interface HmoManifest {
  generatedAt: string;
  totalHmos: number;
  byPayerType: Record<PayerTypeClassification, number>;
  byAdapterStatus: Record<AdapterStatus, number>;
  entries: HmoManifestEntry[];
}

/* ── IC CA Number lookup ────────────────────────────────────── */

const IC_CA_NUMBERS: Record<string, string> = {
  'PH-ASIANLIFE': 'CA-2024-HMO-001',
  'PH-AVEGA': 'CA-2024-HMO-002',
  'PH-CAREHEALTH': 'CA-2024-HMO-003',
  'PH-CAREWELL': 'CA-2024-HMO-004',
  'PH-CARITAS': 'CA-2024-HMO-005',
  'PH-COCOLIFE': 'CA-2024-HMO-006',
  'PH-EASTWEST': 'CA-2024-HMO-007',
  'PH-FORTICARE': 'CA-2024-HMO-008',
  'PH-HEALTHMAINT': 'CA-2024-HMO-009',
  'PH-HEALTHPLAN': 'CA-2024-HMO-010',
  'PH-HEALTHFIRST': 'CA-2024-HMO-011',
  'PH-ICARE': 'CA-2024-HMO-012',
  'PH-INSULAR': 'CA-2024-HMO-013',
  'PH-INTELLICARE': 'CA-2024-HMO-014',
  'PH-KAISER-INTL': 'CA-2024-HMO-015',
  'PH-LIFEHEALTH': 'CA-2024-HMO-016',
  'PH-MAXICARE': 'CA-2024-HMO-017',
  'PH-MEDICARD': 'CA-2024-HMO-018',
  'PH-MEDILINK': 'CA-2024-HMO-019',
  'PH-METROCARE': 'CA-2024-HMO-020',
  'PH-PACIFIC-CROSS': 'CA-2024-HMO-021',
  'PH-PHILCARE': 'CA-2024-HMO-022',
  'PH-PHILBRITISH': 'CA-2024-HMO-023',
  'PH-PHCP': 'CA-2024-HMO-024',
  'PH-PHP': 'CA-2024-HMO-025',
  'PH-STARCARE': 'CA-2024-HMO-026',
  'PH-VALUCARE': 'CA-2024-HMO-027',
};

/* ── Generate manifest ──────────────────────────────────────── */

let registryInited = false;

/** Short-lived cache to avoid regenerating the full manifest on every call.
 *  TTL: 10 seconds — long enough to coalesce a burst of concurrent requests
 *  but short enough that capability changes reflect quickly. */
let _manifestCache: { data: HmoManifest; ts: number } | null = null;
const MANIFEST_CACHE_TTL_MS = 10_000;

export async function generateHmoManifest(): Promise<HmoManifest> {
  const now = Date.now();
  if (_manifestCache && now - _manifestCache.ts < MANIFEST_CACHE_TTL_MS) {
    return _manifestCache.data;
  }
  if (!registryInited) {
    initPhHmoRegistry();
    registryInited = true;
  }

  const portalAdapters = listPortalAdapters();
  const portalAdapterIds = new Set(portalAdapters.map((a) => a.payerId));
  const hmos = listPhHmos();

  const byPayerType: Record<string, number> = {};
  const byAdapterStatus: Record<string, number> = {};
  const entries: HmoManifestEntry[] = [];

  // Use the canonical capability key list from the repo (Phase 97B alignment)
  const CAP_KEYS = [...STANDARD_CAPABILITY_KEYS];

  for (const hmo of hmos) {
    const payerType = PH_HMO_PAYER_TYPES[hmo.payerId] ?? 'hmo_l3';
    byPayerType[payerType] = (byPayerType[payerType] ?? 0) + 1;

    // Determine adapter status
    let adapterStatus: AdapterStatus;
    let adapterName: string | null = null;

    if (portalAdapterIds.has(hmo.payerId)) {
      const adapter = portalAdapters.find((a) => a.payerId === hmo.payerId);
      adapterStatus = 'portal_adapter_available';
      adapterName = adapter?.adapterName ?? null;
    } else if (payerType === 'hmo_l1') {
      adapterStatus = 'generic_manual_adapter';
    } else {
      adapterStatus = 'manual_only';
    }
    byAdapterStatus[adapterStatus] = (byAdapterStatus[adapterStatus] ?? 0) + 1;

    // Capabilities from registry
    const caps: Record<string, string> = {};
    if (hmo.capabilities) {
      for (const [k, v] of Object.entries(hmo.capabilities)) {
        caps[k] = v as string;
      }
    }

    // Also try DB capabilities (if DB is initialized)
    try {
      const dbCaps = await listCapabilities(hmo.payerId);
      for (const c of dbCaps) {
        caps[c.capabilityKey] = c.value;
      }
    } catch {
      // DB not initialized — use registry only
    }

    const known = CAP_KEYS.filter((k) => caps[k] && caps[k] !== 'unknown_publicly').length;
    const unknown = CAP_KEYS.length - known;

    entries.push({
      payerId: hmo.payerId,
      legalName: hmo.legalName,
      payerType,
      caNumber: IC_CA_NUMBERS[hmo.payerId] ?? null,
      adapterStatus,
      adapterName,
      integrationMode: hmo.integrationMode,
      capabilities: caps,
      capabilityCoverage: {
        known,
        unknown,
        total: CAP_KEYS.length,
        pct: Math.round((known / CAP_KEYS.length) * 100),
      },
      contractingStatus: hmo.status ?? 'unknown',
      evidence: (hmo.evidence ?? []).map((e: any) => ({
        kind: e.kind,
        url: e.url,
        title: e.title,
      })),
    });
  }

  const result: HmoManifest = {
    generatedAt: new Date().toISOString(),
    totalHmos: entries.length,
    byPayerType: byPayerType as Record<PayerTypeClassification, number>,
    byAdapterStatus: byAdapterStatus as Record<AdapterStatus, number>,
    entries,
  };

  _manifestCache = { data: result, ts: Date.now() };
  return result;
}

/**
 * Get manifest entry for a single HMO.
 */
export async function getHmoManifestEntry(payerId: string): Promise<HmoManifestEntry | null> {
  const manifest = await generateHmoManifest();
  return manifest.entries.find((e) => e.payerId === payerId) ?? null;
}
