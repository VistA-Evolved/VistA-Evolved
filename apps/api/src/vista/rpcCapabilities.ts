/**
 * VistA RPC Capability Discovery + Cache — Phase 14A.
 *
 * Detects which RPCs are available on the connected VistA instance at runtime.
 * Provides helpers:
 *   - discoverCapabilities() — probes all known RPCs, caches results
 *   - requireRpc(name) — throws structured error if RPC unavailable
 *   - optionalRpc(name) — returns { available, fallback } without throwing
 *   - getCapabilities() — returns cached capability map
 *   - isRpcAvailable(name) — quick check from cache
 *
 * Cache lifecycle:
 *   - Populated on first call to discoverCapabilities()
 *   - Refreshed via GET /vista/rpc-capabilities?refresh=true
 *   - TTL configurable via VISTA_CAPABILITY_TTL_MS env var (default: 5 min)
 */

import { connect, disconnect, callRpc } from "./rpcBrokerClient.js";
import { validateCredentials } from "./config.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RpcCapability {
  rpcName: string;
  available: boolean;
  /** Null if available, otherwise the error message from VistA */
  error?: string;
  /** Timestamp when this RPC was last probed */
  probedAt: string;
}

export interface CapabilityMap {
  /** VistA instance identifier (from XUS GET USER INFO) */
  instanceId: string;
  /** ISO timestamp of last full discovery */
  discoveredAt: string;
  /** Individual RPC availability */
  rpcs: Record<string, RpcCapability>;
  /** RPCs that are known to be missing on this distro */
  expectedMissing: string[];
  /** RPCs that were found available */
  availableList: string[];
  /** RPCs that were not found */
  missingList: string[];
}

export interface RpcCheck {
  available: boolean;
  rpcName: string;
  error?: string;
  fallbackBehavior?: string;
}

/* ------------------------------------------------------------------ */
/* RPC error detection (reused from inbox.ts pattern)                   */
/* ------------------------------------------------------------------ */

/**
 * Patterns that mean the RPC genuinely does NOT exist on the server.
 * Note: %YDB-E-LVUNDEF and "M  ERROR" with LVUNDEF indicate the RPC EXISTS
 * but was called with insufficient parameters — that's a positive availability
 * signal (the M routine ran). We only flag "doesn't exist" responses.
 */
const RPC_NOT_FOUND_PATTERNS = [
  "doesn't exist",
  "doesn\u0027t exist",
  "not found",
];

function isRpcMissing(response: string[]): boolean {
  const first = response[0] || "";
  // "CRemote Procedure 'X' doesn't exist" — server-level rejection
  if (first.startsWith("CRemote")) return true;
  return RPC_NOT_FOUND_PATTERNS.some((pat) => first.includes(pat));
}

/* ------------------------------------------------------------------ */
/* Known RPCs to probe                                                  */
/* ------------------------------------------------------------------ */

/**
 * RPCs we attempt to discover. Grouped by domain.
 * Some have known fallback alternatives.
 */
export const KNOWN_RPCS: { rpc: string; domain: string; fallback?: string; description: string }[] = [
  // Core patient
  { rpc: "ORWPT LIST ALL", domain: "patient", description: "Patient search" },
  { rpc: "ORWPT SELECT", domain: "patient", description: "Patient demographics" },

  // Default patient list
  { rpc: "ORQPT DEFAULT PATIENT LIST", domain: "patient", description: "Default patient list" },

  // Allergies
  { rpc: "ORQQAL LIST", domain: "allergies", description: "List allergies" },
  { rpc: "ORWDAL32 ALLERGY MATCH", domain: "allergies", description: "Allergy reactant search" },
  { rpc: "ORWDAL32 SAVE ALLERGY", domain: "allergies", description: "Write-back: save allergy" },

  // Vitals
  { rpc: "ORQQVI VITALS", domain: "vitals", description: "Read vitals" },
  { rpc: "GMV ADD VM", domain: "vitals", description: "Write-back: add vitals" },

  // Notes (TIU)
  { rpc: "TIU DOCUMENTS BY CONTEXT", domain: "notes", description: "List notes" },
  { rpc: "TIU CREATE RECORD", domain: "notes", description: "Write-back: create note" },
  { rpc: "TIU SET RECORD TEXT", domain: "notes", description: "Write-back: set note text" },
  { rpc: "TIU GET RECORD TEXT", domain: "notes", description: "Get note text" },

  // Medications
  { rpc: "ORWPS ACTIVE", domain: "medications", description: "Active medications" },
  { rpc: "ORWORR GETTXT", domain: "medications", description: "Order detail text" },
  { rpc: "ORWDXM AUTOACK", domain: "medications", description: "Write-back: quick-order med" },

  // Problems
  { rpc: "ORQQPL PROBLEM LIST", domain: "problems", description: "Problem list" },
  { rpc: "ORQQPL4 LEX", domain: "problems", description: "ICD/lexicon search" },
  { rpc: "ORQQPL ADD SAVE", domain: "problems", description: "Write-back: add problem" },
  { rpc: "ORQQPL EDIT SAVE", domain: "problems", description: "Write-back: edit problem" },

  // Orders
  { rpc: "ORWDX SAVE", domain: "orders", description: "Write-back: save order" },
  { rpc: "ORWDXA DC", domain: "orders", description: "Discontinue order" },
  { rpc: "ORWDXA FLAG", domain: "orders", description: "Flag order" },
  { rpc: "ORWDXA VERIFY", domain: "orders", description: "Verify order" },

  // Consults
  { rpc: "ORQQCN LIST", domain: "consults", description: "List consults" },
  { rpc: "ORQQCN DETAIL", domain: "consults", description: "Consult detail" },
  { rpc: "ORQQCN2 MED RESULTS", domain: "consults", description: "Write-back: consult result entry" },

  // Surgery
  { rpc: "ORWSR LIST", domain: "surgery", description: "List surgeries" },
  { rpc: "ORWSR RPTLIST", domain: "surgery", description: "Surgery report list" },

  // D/C Summaries (reuse TIU with class 244)
  { rpc: "TIU DOCUMENTS BY CONTEXT", domain: "dcSummaries", description: "D/C summary list (class 244)" },

  // Labs
  { rpc: "ORWLRR INTERIM", domain: "labs", description: "Interim lab results" },
  { rpc: "ORWLRR ACK", domain: "labs", description: "Write-back: acknowledge lab result" },
  { rpc: "ORWLRR CHART", domain: "labs", description: "Lab charting data" },

  // Reports
  { rpc: "ORWRP REPORT LISTS", domain: "reports", description: "Report definitions" },
  { rpc: "ORWRP REPORT TEXT", domain: "reports", description: "Report text content" },

  // Inbox / Notifications
  { rpc: "ORWORB UNSIG ORDERS", domain: "inbox", fallback: "ORWPS ACTIVE", description: "Unsigned orders (notifications)" },
  { rpc: "ORWORB FASTUSER", domain: "inbox", fallback: "disabled", description: "Fast user notifications" },

  // Remote data
  { rpc: "ORWCIRN FACILITIES", domain: "remote", description: "Remote facility list" },

  // Imaging
  { rpc: "MAG4 REMOTE PROCEDURE", domain: "imaging", description: "VistA Imaging gateway" },
  { rpc: "RA DETAILED REPORT", domain: "imaging", description: "Radiology report" },

  // Encounter
  { rpc: "ORWPCE SAVE", domain: "encounter", description: "Write-back: save encounter" },

  // Phase 39: Billing Grounding — encounter/PCE reads
  { rpc: "ORWPCE VISIT", domain: "billing", description: "Visit details for patient" },
  { rpc: "ORWPCE GET VISIT", domain: "billing", description: "Get encounter data for visit" },
  { rpc: "ORWPCE DIAG", domain: "billing", description: "Diagnoses for encounter" },
  { rpc: "ORWPCE PROC", domain: "billing", description: "Procedures for encounter" },
  { rpc: "ORWPCE PCE4NOTE", domain: "billing", description: "PCE data linked to note" },
  { rpc: "ORWPCE HASVISIT", domain: "billing", description: "Check if note has visit" },
  { rpc: "ORWPCE GETSVC", domain: "billing", description: "Service-connected conditions" },
  { rpc: "ORWPCE4 LEX", domain: "billing", description: "ICD-10 lexicon search" },
  { rpc: "ORWPCE LEXCODE", domain: "billing", description: "Get code for lexicon entry" },
  { rpc: "ORWPCE ACTIVE CODE", domain: "billing", description: "Check ICD code active" },

  // Phase 39: Billing Grounding — insurance
  { rpc: "IBCN INSURANCE QUERY", domain: "billing", description: "Query patient insurance coverage" },

  // Phase 39: Billing Grounding — IB forms + pharmacy billing
  { rpc: "IBD GET ALL PCE DATA", domain: "billing", description: "All PCE data for billing" },
  { rpc: "IBD GET FORMSPEC", domain: "billing", description: "Billing form specification" },
  { rpc: "IBARXM QUERY ONLY", domain: "billing", description: "Pharmacy billing query" },
  { rpc: "IBO MT LTC COPAY QUERY", domain: "billing", description: "Means test / LTC copay" },

  // Phase 155: Custom VistA-Evolved RPCs (provisioned via install-vista-routines.ps1)
  { rpc: "VE INTEROP HL7 LINKS",   domain: "interop",    description: "List HL7 logical links (ZVEMIOP)" },
  { rpc: "VE INTEROP HL7 MSGS",    domain: "interop",    description: "List recent HL7 messages (ZVEMIOP)" },
  { rpc: "VE INTEROP HLO STATUS",  domain: "interop",    description: "HLO application status (ZVEMIOP)" },
  { rpc: "VE INTEROP QUEUE DEPTH", domain: "interop",    description: "HL7 queue depths (ZVEMIOP)" },
  { rpc: "VE INTEROP MSG LIST",    domain: "interop",    description: "List HL7 messages with filters (ZVEMIOP)" },
  { rpc: "VE INTEROP MSG DETAIL",  domain: "interop",    description: "HL7 message detail (ZVEMIOP)" },
  { rpc: "ZVE MAIL FOLDERS",       domain: "messaging",  description: "MailMan folders (ZVEMSGR)" },
  { rpc: "ZVE MAIL LIST",          domain: "messaging",  description: "MailMan message list (ZVEMSGR)" },
  { rpc: "ZVE MAIL GET",           domain: "messaging",  description: "Get MailMan message (ZVEMSGR)" },
  { rpc: "ZVE MAIL SEND",          domain: "messaging",  description: "Write-back: send MailMan message (ZVEMSGR)" },
  { rpc: "ZVE MAIL MANAGE",        domain: "messaging",  description: "Write-back: manage MailMan folders (ZVEMSGR)" },
  { rpc: "VE LIST RPCS",           domain: "catalog",    description: "List installed RPCs (ZVERPC)" },
  { rpc: "VE RCM PROVIDER INFO",   domain: "rcm",        description: "Provider info for RCM (ZVERCMP)" },
  { rpc: "ZVEADT WARDS",           domain: "adt",        description: "Ward census (ZVEADT)" },
  { rpc: "ZVEADT BEDS",            domain: "adt",        description: "Bed board (ZVEADT)" },
  { rpc: "ZVEADT MVHIST",          domain: "adt",        description: "Movement history (ZVEADT)" },

  // Phase 482 (W33-P2): Tier-0 hospital writeback RPCs — probed for capability evidence
  // ADT write RPCs (DGPM package)
  { rpc: "DGPM NEW ADMISSION",     domain: "adt",        description: "Write-back: admit patient (DGPM)" },
  { rpc: "DGPM NEW TRANSFER",      domain: "adt",        description: "Write-back: transfer patient (DGPM)" },
  { rpc: "DGPM NEW DISCHARGE",     domain: "adt",        description: "Write-back: discharge patient (DGPM)" },
  // BCMA / eMAR write RPCs (PSB/PSJ packages)
  { rpc: "PSB MED LOG",            domain: "emar",       description: "Write-back: BCMA medication log (PSB)" },
  { rpc: "PSB ALLERGY",            domain: "emar",       description: "BCMA allergy check at scan (PSB)" },
  { rpc: "PSB VALIDATE ORDER",     domain: "emar",       description: "BCMA order validation at scan (PSB)" },
  { rpc: "PSJBCMA",                domain: "emar",       description: "Write-back: barcode-to-med lookup (PSJ)" },
  // Nursing task / assessment RPCs (NURS package)
  { rpc: "NURS TASK LIST",         domain: "nursing",    description: "Nursing task list (NURS)" },
  { rpc: "NURS ASSESSMENTS",       domain: "nursing",    description: "Nursing assessments (NURS)" },
  // Lab write RPCs (LR package)
  { rpc: "LR VERIFY",              domain: "labs",       description: "Write-back: verify lab result (LR)" },
];

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = Number(process.env.VISTA_CAPABILITY_TTL_MS || 300_000); // 5 min default
let cachedCapabilities: CapabilityMap | null = null;
let cacheTimestamp: number = 0;

/**
 * WorldVistA Docker sandbox — RPCs that return "doesn't exist" (truly absent).
 * Note: RPCs that return LVUNDEF are NOT on this list — those exist on the
 * server, they just fail when called with empty params. We only list RPCs
 * whose XWB response contains "Remote Procedure 'X' doesn't exist".
 */
const WORLDVISTA_EXPECTED_MISSING = [
  "ORQQPL EDIT SAVE",      // Returns CRemote "doesn't exist" (not installed)
  // All other RPCs that error with LVUNDEF are actually available.
  // The list is intentionally short — only genuinely absent RPCs.
];

/* ------------------------------------------------------------------ */
/* Discovery engine                                                     */
/* ------------------------------------------------------------------ */

/**
 * Probe all known RPCs against the connected VistA instance.
 * Uses a lightweight probe: calls each RPC with minimal params and checks
 * whether the response is an "RPC doesn't exist" error.
 *
 * This is done with a single connection for efficiency.
 */
export async function discoverCapabilities(forceRefresh = false): Promise<CapabilityMap> {
  const now = Date.now();
  if (!forceRefresh && cachedCapabilities && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedCapabilities;
  }

  validateCredentials();

  const rpcs: Record<string, RpcCapability> = {};
  const availableList: string[] = [];
  const missingList: string[] = [];
  const probedAt = new Date().toISOString();

  // Deduplicate RPCs (TIU DOCUMENTS BY CONTEXT appears twice for different domains)
  const uniqueRpcs = [...new Set(KNOWN_RPCS.map((r) => r.rpc))];

  try {
    await connect();

    for (const rpcName of uniqueRpcs) {
      try {
        // Probe with empty/minimal params — we only care about "exists" vs "doesn't exist"
        const resp = await callRpc(rpcName, []);
        if (isRpcMissing(resp)) {
          rpcs[rpcName] = { rpcName, available: false, error: resp[0]?.substring(0, 200), probedAt };
          missingList.push(rpcName);
        } else {
          // RPC exists — even if response contains M ERROR / LVUNDEF, the
          // underlying routine ran, which means the RPC is registered.
          rpcs[rpcName] = { rpcName, available: true, probedAt };
          availableList.push(rpcName);
        }
      } catch (err: any) {
        // Connection errors, timeouts — treat as unavailable but don't stop
        rpcs[rpcName] = { rpcName, available: false, error: err.message?.substring(0, 200), probedAt };
        missingList.push(rpcName);
      }
    }

    disconnect();
  } catch (err: any) {
    // Connection-level failure — mark everything unknown
    disconnect();
    throw new Error(`RPC capability discovery failed: ${err.message}`);
  }

  // Determine which missing RPCs are expected for this distro
  const expectedMissing = missingList.filter((r) => WORLDVISTA_EXPECTED_MISSING.includes(r));

  const map: CapabilityMap = {
    instanceId: "worldvista-docker",
    discoveredAt: new Date().toISOString(),
    rpcs,
    expectedMissing,
    availableList,
    missingList,
  };

  cachedCapabilities = map;
  cacheTimestamp = now;
  return map;
}

/* ------------------------------------------------------------------ */
/* Public helpers                                                       */
/* ------------------------------------------------------------------ */

/** Get cached capabilities (returns null if not yet discovered). */
export function getCapabilities(): CapabilityMap | null {
  return cachedCapabilities;
}

/** Quick check from cache. Returns false if not yet discovered. */
export function isRpcAvailable(rpcName: string): boolean {
  if (!cachedCapabilities) return true; // Assume available if not checked
  return cachedCapabilities.rpcs[rpcName]?.available ?? false;
}

/**
 * Require an RPC to be available. Throws a structured error if not.
 * Use this in endpoints that must have the RPC to function.
 */
export function requireRpc(rpcName: string): RpcCheck {
  if (!cachedCapabilities) {
    // Not yet discovered — allow through optimistically
    return { available: true, rpcName };
  }
  const cap = cachedCapabilities.rpcs[rpcName];
  if (!cap) {
    return { available: true, rpcName }; // Unknown RPC, allow
  }
  if (!cap.available) {
    const known = KNOWN_RPCS.find((r) => r.rpc === rpcName);
    const isExpected = WORLDVISTA_EXPECTED_MISSING.includes(rpcName);
    throw Object.assign(
      new Error(`RPC "${rpcName}" is not available on this VistA instance`),
      {
        code: "RPC_UNAVAILABLE",
        rpcName,
        expectedMissing: isExpected,
        fallback: known?.fallback,
        domain: known?.domain,
      }
    );
  }
  return { available: true, rpcName };
}

/**
 * Check an RPC optionally — returns availability info without throwing.
 * Use this in endpoints that can gracefully degrade.
 */
export function optionalRpc(rpcName: string): RpcCheck {
  if (!cachedCapabilities) {
    return { available: true, rpcName };
  }
  const cap = cachedCapabilities.rpcs[rpcName];
  if (!cap) {
    return { available: true, rpcName };
  }
  const known = KNOWN_RPCS.find((r) => r.rpc === rpcName);
  if (!cap.available) {
    return {
      available: false,
      rpcName,
      error: cap.error,
      fallbackBehavior: known?.fallback ?? "feature-disabled",
    };
  }
  return { available: true, rpcName };
}

/**
 * Get a summary of capability status for a domain.
 */
export function getDomainCapabilities(domain: string): {
  domain: string;
  readAvailable: boolean;
  writeAvailable: boolean;
  rpcs: RpcCheck[];
} {
  const domainRpcs = KNOWN_RPCS.filter((r) => r.domain === domain);
  const checks = domainRpcs.map((r) => optionalRpc(r.rpc));
  const readRpcs = domainRpcs.filter((r) => !r.description.startsWith("Write-back"));
  const writeRpcs = domainRpcs.filter((r) => r.description.startsWith("Write-back"));

  return {
    domain,
    readAvailable: readRpcs.some((r) => optionalRpc(r.rpc).available),
    writeAvailable: writeRpcs.length === 0 || writeRpcs.some((r) => optionalRpc(r.rpc).available),
    rpcs: checks,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 424: Drift detection — compare live vs baseline               */
/* ------------------------------------------------------------------ */

export interface DriftReport {
  /** Timestamp of comparison */
  comparedAt: string;
  /** Instance being compared */
  instanceId: string;
  /** RPCs that were in baseline but are now missing */
  regressions: string[];
  /** RPCs that are now available but were not in baseline */
  newlyAvailable: string[];
  /** RPCs that match baseline */
  unchanged: string[];
  /** Whether any regressions were found */
  hasDrift: boolean;
  /** Summary message */
  summary: string;
}

/**
 * Compare current discovered capabilities against a baseline snapshot.
 * Baseline format: { availableList: string[], missingList: string[] }
 *
 * Use this to detect when a VistA instance loses RPCs after an update,
 * or gains new ones after routine installation.
 */
export function compareToBaseline(baseline: {
  availableList: string[];
  missingList: string[];
  instanceId?: string;
}): DriftReport | null {
  if (!cachedCapabilities) return null;

  const baselineSet = new Set(baseline.availableList);
  const currentSet = new Set(cachedCapabilities.availableList);

  const regressions: string[] = [];
  const newlyAvailable: string[] = [];
  const unchanged: string[] = [];

  // Check each baseline-available RPC against current
  for (const rpc of baseline.availableList) {
    if (currentSet.has(rpc)) {
      unchanged.push(rpc);
    } else {
      regressions.push(rpc);
    }
  }

  // Check for newly available RPCs
  for (const rpc of cachedCapabilities.availableList) {
    if (!baselineSet.has(rpc)) {
      newlyAvailable.push(rpc);
    }
  }

  const hasDrift = regressions.length > 0;
  const parts: string[] = [];
  if (regressions.length > 0) parts.push(`${regressions.length} regression(s)`);
  if (newlyAvailable.length > 0) parts.push(`${newlyAvailable.length} newly available`);
  if (parts.length === 0) parts.push("no drift detected");

  return {
    comparedAt: new Date().toISOString(),
    instanceId: baseline.instanceId ?? cachedCapabilities.instanceId,
    regressions,
    newlyAvailable,
    unchanged,
    hasDrift,
    summary: parts.join(", "),
  };
}

/**
 * Get all unique domains from the KNOWN_RPCS list.
 */
export function getAllDomains(): string[] {
  return [...new Set(KNOWN_RPCS.map((r) => r.domain))];
}

/**
 * Build a full runtime matrix combining capabilities, adapter status,
 * and domain requirements. Used by the /vista/runtime-matrix endpoint.
 */
export function buildRuntimeMatrix(): {
  instanceId: string;
  discoveredAt: string | null;
  domains: Record<string, ReturnType<typeof getDomainCapabilities>>;
  totalAvailable: number;
  totalMissing: number;
  totalKnown: number;
} {
  const domains: Record<string, ReturnType<typeof getDomainCapabilities>> = {};
  for (const domain of getAllDomains()) {
    domains[domain] = getDomainCapabilities(domain);
  }

  return {
    instanceId: cachedCapabilities?.instanceId ?? "unknown",
    discoveredAt: cachedCapabilities?.discoveredAt ?? null,
    domains,
    totalAvailable: cachedCapabilities?.availableList.length ?? 0,
    totalMissing: cachedCapabilities?.missingList.length ?? 0,
    totalKnown: [...new Set(KNOWN_RPCS.map((r) => r.rpc))].length,
  };
}
