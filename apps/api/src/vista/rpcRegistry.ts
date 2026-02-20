/**
 * rpcRegistry.ts -- Single authoritative mapping of every RPC used by VistA-Evolved.
 *
 * Every callRpc / safeCallRpc / callRpcWithList invocation in the codebase MUST
 * reference an RPC that is either:
 *   (a) present in the Vivian index (data/vista/vivian/rpc_index.json), OR
 *   (b) explicitly allowlisted in RPC_EXCEPTIONS below with a required explanation.
 *
 * The verify script (scripts/verify-phase41-rpc-catalog.ps1) enforces this as a
 * hard gate: unknown RPCs = build FAIL.
 *
 * Tags: "read" (no side effects), "write" (mutates VistA data), "auth" (broker protocol).
 */

export type RpcTag = "read" | "write" | "auth" | "custom";

export interface RpcDefinition {
  /** Canonical RPC name exactly as registered in File 8994 */
  name: string;
  /** Functional domain */
  domain: string;
  /** Side-effect classification */
  tag: RpcTag;
  /** Brief description */
  description: string;
}

/* ------------------------------------------------------------------ */
/*  MASTER REGISTRY                                                    */
/*  Keep sorted by domain, then name.                                 */
/* ------------------------------------------------------------------ */
export const RPC_REGISTRY: RpcDefinition[] = [
  // --- Auth / Broker Protocol ---
  { name: "XUS SIGNON SETUP",         domain: "auth",       tag: "auth",  description: "Broker sign-on handshake" },
  { name: "XUS AV CODE",              domain: "auth",       tag: "auth",  description: "Access/verify code authentication" },
  { name: "XWB CREATE CONTEXT",       domain: "auth",       tag: "auth",  description: "Set application context" },
  { name: "XUS GET USER INFO",        domain: "auth",       tag: "auth",  description: "Get authenticated user metadata" },

  // --- Allergies ---
  { name: "ORQQAL LIST",              domain: "allergies",  tag: "read",  description: "List patient allergies" },
  { name: "ORWDAL32 ALLERGY MATCH",   domain: "allergies",  tag: "read",  description: "Search allergy reactants" },
  { name: "ORWDAL32 SAVE ALLERGY",    domain: "allergies",  tag: "write", description: "Save new allergy" },

  // --- Billing / PCE ---
  { name: "IBCN INSURANCE QUERY",     domain: "billing",    tag: "read",  description: "Query patient insurance" },
  { name: "IBD GET ALL PCE DATA",     domain: "billing",    tag: "read",  description: "Get all PCE encounter data" },
  { name: "IBD GET FORMSPEC",         domain: "billing",    tag: "read",  description: "Get encounter form specification" },
  { name: "IBARXM QUERY ONLY",       domain: "billing",    tag: "read",  description: "Pharmacy billing query" },
  { name: "IBO MT LTC COPAY QUERY",  domain: "billing",    tag: "read",  description: "Means Test / LTC copay query" },
  { name: "ORWPCE VISIT",            domain: "billing",    tag: "read",  description: "Get PCE visit data" },
  { name: "ORWPCE GET VISIT",        domain: "billing",    tag: "read",  description: "Get detailed visit" },
  { name: "ORWPCE DIAG",             domain: "billing",    tag: "read",  description: "Get PCE diagnoses" },
  { name: "ORWPCE PROC",             domain: "billing",    tag: "read",  description: "Get PCE procedures" },
  { name: "ORWPCE PCE4NOTE",         domain: "billing",    tag: "read",  description: "Get PCE data for note" },
  { name: "ORWPCE HASVISIT",         domain: "billing",    tag: "read",  description: "Check if visit exists" },
  { name: "ORWPCE GETSVC",           domain: "billing",    tag: "read",  description: "Get service connected data" },
  { name: "ORWPCE4 LEX",             domain: "billing",    tag: "read",  description: "Lexicon search (PCE)" },
  { name: "ORWPCE LEXCODE",          domain: "billing",    tag: "read",  description: "Get lexicon code" },
  { name: "ORWPCE ACTIVE CODE",      domain: "billing",    tag: "read",  description: "Check if code is active" },
  { name: "ORWPCE SAVE",             domain: "billing",    tag: "write", description: "Save PCE encounter" },

  // --- Consults ---
  { name: "ORQQCN LIST",              domain: "consults",   tag: "read",  description: "List consults for patient" },
  { name: "ORQQCN DETAIL",            domain: "consults",   tag: "read",  description: "Get consult detail" },
  { name: "ORQQCN2 MED RESULTS",      domain: "consults",   tag: "write", description: "Complete consult with results" },

  // --- Custom VE RPCs ---
  { name: "VE LIST RPCS",             domain: "catalog",    tag: "custom", description: "List all registered RPCs from File 8994" },
  { name: "VE INTEROP HL7 LINKS",     domain: "interop",    tag: "custom", description: "List HL7 logical links" },
  { name: "VE INTEROP HL7 MSGS",      domain: "interop",    tag: "custom", description: "List recent HL7 messages" },
  { name: "VE INTEROP HLO STATUS",    domain: "interop",    tag: "custom", description: "HLO application status" },
  { name: "VE INTEROP QUEUE DEPTH",   domain: "interop",    tag: "custom", description: "HL7 queue depths" },

  // --- Imaging ---
  { name: "MAG4 REMOTE PROCEDURE",    domain: "imaging",    tag: "read",  description: "Imaging remote procedure call" },
  { name: "MAG4 PAT GET IMAGES",      domain: "imaging",    tag: "read",  description: "Get patient images list" },
  { name: "MAGG PAT PHOTOS",          domain: "imaging",    tag: "read",  description: "Get patient photos" },
  { name: "RA DETAILED REPORT",       domain: "imaging",    tag: "read",  description: "Radiology detailed report" },

  // --- Inbox ---
  { name: "ORWORB UNSIG ORDERS",      domain: "inbox",      tag: "read",  description: "Get unsigned orders notifications" },
  { name: "ORWORB FASTUSER",          domain: "inbox",      tag: "read",  description: "Get user notification info" },

  // --- Labs ---
  { name: "ORWLRR INTERIM",           domain: "labs",       tag: "read",  description: "Interim lab results" },
  { name: "ORWLRR ACK",               domain: "labs",       tag: "write", description: "Acknowledge lab result" },
  { name: "ORWLRR CHART",             domain: "labs",       tag: "read",  description: "Lab chart data" },

  // --- Medications ---
  { name: "ORWPS ACTIVE",             domain: "medications", tag: "read",  description: "Active medications list" },
  { name: "ORWORR GETTXT",            domain: "medications", tag: "read",  description: "Order result text" },
  { name: "ORWDXM AUTOACK",           domain: "medications", tag: "write", description: "Quick-order medication auto-acknowledge" },

  // --- Notes / DC Summaries ---
  { name: "TIU DOCUMENTS BY CONTEXT", domain: "notes",      tag: "read",  description: "List documents by context" },
  { name: "TIU CREATE RECORD",        domain: "notes",      tag: "write", description: "Create new TIU record" },
  { name: "TIU SET DOCUMENT TEXT",     domain: "notes",      tag: "write", description: "Set document text body" },
  { name: "TIU SET RECORD TEXT",       domain: "notes",      tag: "write", description: "Set record text body" },
  { name: "TIU GET RECORD TEXT",       domain: "notes",      tag: "read",  description: "Get record text" },

  // --- Orders ---
  { name: "ORWDX LOCK",               domain: "orders",     tag: "write", description: "Lock patient for ordering" },
  { name: "ORWDX UNLOCK",             domain: "orders",     tag: "write", description: "Unlock patient after ordering" },
  { name: "ORWDX SAVE",               domain: "orders",     tag: "write", description: "Save order" },
  { name: "ORWDXA DC",                domain: "orders",     tag: "write", description: "Discontinue order" },
  { name: "ORWDXA FLAG",              domain: "orders",     tag: "write", description: "Flag order" },
  { name: "ORWDXA VERIFY",            domain: "orders",     tag: "write", description: "Verify order" },

  // --- Patients ---
  { name: "ORQPT DEFAULT PATIENT LIST", domain: "patients", tag: "read", description: "Default patient list" },
  { name: "ORWPT LIST ALL",           domain: "patients",   tag: "read",  description: "Search all patients" },
  { name: "ORWPT SELECT",             domain: "patients",   tag: "read",  description: "Select patient demographics" },

  // --- Problems ---
  { name: "ORQQPL PROBLEM LIST",       domain: "problems",  tag: "read",  description: "Get problem list" },
  { name: "ORQQPL4 LEX",              domain: "problems",   tag: "read",  description: "ICD/Lexicon search" },
  { name: "ORQQPL ADD SAVE",          domain: "problems",   tag: "write", description: "Add problem" },
  { name: "ORQQPL EDIT SAVE",         domain: "problems",   tag: "write", description: "Edit problem" },
  { name: "ORWCH PROBLEM LIST",       domain: "problems",   tag: "read",  description: "Chart problem list" },

  // --- Remote Data ---
  { name: "ORWCIRN FACILITIES",        domain: "remote",    tag: "read",  description: "Remote facility list" },

  // --- Reports ---
  { name: "ORWRP REPORT LISTS",       domain: "reports",    tag: "read",  description: "Available report lists" },
  { name: "ORWRP REPORT TEXT",        domain: "reports",    tag: "read",  description: "Get report text" },

  // --- Surgery ---
  { name: "ORWSR LIST",               domain: "surgery",    tag: "read",  description: "Surgery case list" },
  { name: "ORWSR RPTLIST",            domain: "surgery",    tag: "read",  description: "Surgery report list" },

  // --- Vitals ---
  { name: "GMV ADD VM",               domain: "vitals",     tag: "write", description: "Add vital measurement" },
  { name: "ORQQVI VITALS",            domain: "vitals",     tag: "read",  description: "Get patient vitals" },
];

/**
 * Exceptions: RPCs used in VistA-Evolved that are NOT in the Vivian index.
 * Each must have an explanation of why it exists outside the index.
 */
export const RPC_EXCEPTIONS: Array<{ name: string; reason: string }> = [
  { name: "VE LIST RPCS", reason: "Custom RPC installed by VistA-Evolved (ZVERPC.m) for File 8994 catalog listing" },
  { name: "VE INTEROP HL7 LINKS", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 telemetry" },
  { name: "VE INTEROP HL7 MSGS", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 telemetry" },
  { name: "VE INTEROP HLO STATUS", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HLO status" },
  { name: "VE INTEROP QUEUE DEPTH", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for queue monitoring" },
  { name: "ORWCH PROBLEM LIST", reason: "Chart-specific problem list variant; may be absent from some Vivian snapshots" },
  { name: "ORQQCN2 MED RESULTS", reason: "Consult med results RPC; present in CPRS source but absent from Vivian cross-reference" },
  { name: "MAG4 REMOTE PROCEDURE", reason: "VistA Imaging remote procedure; absent from Vivian (MAG4 package has 27 other RPCs)" },
  { name: "RA DETAILED REPORT", reason: "Radiology detailed report; absent from Vivian snapshot (RA package underrepresented)" },
  { name: "ORWORB UNSIG ORDERS", reason: "Unsigned order notifications; Vivian has ORWORB UNSIG ORDERS FOLLOWUP but not this variant" },
  { name: "ORWLRR ACK", reason: "Lab result acknowledgment; absent from Vivian (ORWLRR has 20 other RPCs)" },
  { name: "TIU SET RECORD TEXT", reason: "TIU note text writer; absent from Vivian snapshot despite being core CPRS functionality" },
  { name: "ORWCIRN FACILITIES", reason: "Remote facility list; Vivian has ORWCIRN FACLIST but not this exact name variant" },
  { name: "VE RCM PROVIDER INFO", reason: "Custom RPC installed by VistA-Evolved (ZVERCMP.m) for provider NPI + facility identifiers (Phase 42)" },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

/** Set of all registered RPC names (uppercase for case-insensitive lookup) */
const REGISTRY_SET = new Set(RPC_REGISTRY.map((r) => r.name.toUpperCase()));

/** Set of exception RPC names (uppercase) */
const EXCEPTION_SET = new Set(RPC_EXCEPTIONS.map((e) => e.name.toUpperCase()));

/**
 * Look up an RPC definition by name.
 * Returns undefined if not in registry.
 */
export function lookupRpc(name: string): RpcDefinition | undefined {
  return RPC_REGISTRY.find((r) => r.name.toUpperCase() === name.toUpperCase());
}

/**
 * Assert an RPC name is known (in registry or exceptions).
 * Throws if unknown -- use this at build/test time.
 */
export function assertKnownRpc(name: string): RpcDefinition {
  const upper = name.toUpperCase();
  const def = RPC_REGISTRY.find((r) => r.name.toUpperCase() === upper);
  if (def) return def;
  if (EXCEPTION_SET.has(upper)) {
    return { name, domain: "exception", tag: "custom", description: "Allowlisted exception" };
  }
  throw new Error(
    `UNKNOWN RPC: "${name}" is not in rpcRegistry.ts or RPC_EXCEPTIONS. ` +
    `Add it to the registry or allowlist it with an explanation.`
  );
}

/**
 * Check if an RPC is known (without throwing).
 */
export function isKnownRpc(name: string): boolean {
  const upper = name.toUpperCase();
  return REGISTRY_SET.has(upper) || EXCEPTION_SET.has(upper);
}

/**
 * Get all RPCs by domain.
 */
export function getRpcsByDomain(domain: string): RpcDefinition[] {
  return RPC_REGISTRY.filter((r) => r.domain === domain);
}

/**
 * Get all RPCs by tag.
 */
export function getRpcsByTag(tag: RpcTag): RpcDefinition[] {
  return RPC_REGISTRY.filter((r) => r.tag === tag);
}

/**
 * Get all registered RPC names as a sorted array.
 */
export function getAllRegisteredRpcNames(): string[] {
  return RPC_REGISTRY.map((r) => r.name).sort();
}

/**
 * Get the full registry + exceptions for verification.
 */
export function getFullRpcInventory(): { registry: RpcDefinition[]; exceptions: typeof RPC_EXCEPTIONS } {
  return { registry: RPC_REGISTRY, exceptions: RPC_EXCEPTIONS };
}
