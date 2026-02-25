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
  { name: "VE INTEROP MSG LIST",      domain: "interop",    tag: "custom", description: "List HL7 messages with filters" },
  { name: "VE INTEROP MSG DETAIL",    domain: "interop",    tag: "custom", description: "HL7 message metadata + segment summary" },

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
  { name: "ORWLRR INTERIMG",          domain: "labs",       tag: "read",  description: "Interim lab results (imaging context)" },

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
  // Phase 60: TIU notes parity additions
  { name: "TIU SIGN RECORD",          domain: "notes",      tag: "write", description: "Electronically sign TIU document" },
  { name: "TIU LOCK RECORD",          domain: "notes",      tag: "write", description: "Lock TIU document for editing/signing" },
  { name: "TIU UNLOCK RECORD",        domain: "notes",      tag: "write", description: "Unlock TIU document" },
  { name: "TIU CREATE ADDENDUM RECORD", domain: "notes",    tag: "write", description: "Create addendum to TIU document" },
  { name: "TIU REQUIRES COSIGNATURE", domain: "notes",      tag: "read",  description: "Check if document requires cosignature" },
  { name: "TIU PERSONAL TITLE LIST",  domain: "notes",      tag: "read",  description: "Get user personal note title list" },

  // --- Orders ---
  { name: "ORWDX LOCK",               domain: "orders",     tag: "write", description: "Lock patient for ordering" },
  { name: "ORWDX UNLOCK",             domain: "orders",     tag: "write", description: "Unlock patient after ordering" },
  { name: "ORWDX SAVE",               domain: "orders",     tag: "write", description: "Save order" },
  { name: "ORWDXA DC",                domain: "orders",     tag: "write", description: "Discontinue order" },
  { name: "ORWDXA FLAG",              domain: "orders",     tag: "write", description: "Flag order" },
  { name: "ORWDXA VERIFY",            domain: "orders",     tag: "write", description: "Verify order" },
  // Phase 59: CPOE parity additions
  { name: "ORWORR AGET",              domain: "orders",     tag: "read",  description: "Get active orders by display group" },
  { name: "ORWOR1 SIG",               domain: "orders",     tag: "write", description: "Electronically sign order(s)" },
  { name: "ORWDXC ACCEPT",            domain: "orders",     tag: "read",  description: "Accept/get order check results" },
  { name: "ORWDXC DISPLAY",           domain: "orders",     tag: "read",  description: "Display order check text" },
  { name: "ORWDXC SAVECHK",           domain: "orders",     tag: "write", description: "Save/acknowledge order checks" },
  { name: "ORWDX WRLST",              domain: "orders",     tag: "read",  description: "Write/order list for patient" },

  // --- Patients ---
  { name: "ORQPT DEFAULT PATIENT LIST", domain: "patients", tag: "read", description: "Default patient list" },
  { name: "ORQPT DEFAULT LIST SOURCE",  domain: "patients", tag: "read", description: "Default patient list source configuration" },
  { name: "ORWPT LIST ALL",           domain: "patients",   tag: "read",  description: "Search all patients" },
  { name: "ORWPT SELECT",             domain: "patients",   tag: "read",  description: "Select patient demographics" },
  { name: "ORWPT ID INFO",            domain: "patients",   tag: "read",  description: "Patient ID info (SSN, DOB, etc.)" },
  { name: "ORWPT16 ID INFO",          domain: "patients",   tag: "read",  description: "Extended patient ID info" },

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
  { name: "GMV V/M ALLDATA",           domain: "vitals",     tag: "read",  description: "All vitals/measurements data" },
  { name: "GMV ADD VM",               domain: "vitals",     tag: "write", description: "Add vital measurement" },
  { name: "ORQQVI VITALS",            domain: "vitals",     tag: "read",  description: "Get patient vitals" },
  { name: "ORQQVI VITALS FOR DATE RANGE", domain: "vitals", tag: "read",  description: "Vitals for date range (shift-based nursing view)" },

  // --- ADT / Inpatient (Phase 67: VistA-first ADT + inpatient lists) ---
  { name: "ORQPT WARDS",                domain: "adt",            tag: "read",  description: "List all wards" },
  { name: "ORQPT WARD PATIENTS",         domain: "adt",            tag: "read",  description: "Census: patients on a ward" },
  { name: "ORQPT PROVIDER PATIENTS",     domain: "adt",            tag: "read",  description: "Provider inpatient list" },
  { name: "ORQPT TEAMS",                 domain: "adt",            tag: "read",  description: "List available teams" },
  { name: "ORQPT TEAM PATIENTS",         domain: "adt",            tag: "read",  description: "Team patient list" },
  { name: "ORQPT SPECIALTIES",           domain: "adt",            tag: "read",  description: "List treating specialties" },
  { name: "ORQPT SPECIALTY PATIENTS",    domain: "adt",            tag: "read",  description: "Specialty patient list" },
  { name: "ORWU1 NEWLOC",               domain: "adt",            tag: "read",  description: "Location search/lookup" },
  { name: "ORWPT16 ADMITLST",            domain: "adt",            tag: "read",  description: "Patient admission history list" },

  // --- Phase 137: ZVEADT custom RPCs (expected missing until ZVEADT.m installed) ---
  { name: "ZVEADT WARDS",               domain: "adt",            tag: "read",  description: "Ward census with bed counts (custom)" },
  { name: "ZVEADT BEDS",                domain: "adt",            tag: "read",  description: "Bed-level occupancy for a ward (custom)" },
  { name: "ZVEADT MVHIST",              domain: "adt",            tag: "read",  description: "Patient movement history from File 405 (custom)" },

  // --- Clinical Reminders (Phase 78: VistA-first reminder evaluation) ---
  { name: "ORQQPX REMINDERS LIST",       domain: "reminders",      tag: "read",  description: "Evaluate clinical reminders for patient (due/applicable list)" },
  { name: "ORQQPX REMINDER DETAIL",      domain: "reminders",      tag: "read",  description: "Detailed info for a single clinical reminder" },

  // --- Immunizations (Phase 65: VistA-first immunization history) ---
  { name: "ORQQPX IMMUN LIST",          domain: "immunizations", tag: "read",  description: "Patient immunization history list" },
  { name: "PXVIMM IMM SHORT LIST",       domain: "immunizations", tag: "read",  description: "Immunization type picker (short list)" },

  // --- Messaging (Phase 70: ZVEMSGR.m MailMan RPC bridge) ---
  { name: "ORQQXMB MAIL GROUPS",      domain: "messaging",  tag: "read",  description: "List MailMan mail groups for recipient selection" },
  { name: "ZVE MAIL FOLDERS",         domain: "messaging",  tag: "read",  description: "List MailMan baskets/folders with counts (ZVEMSGR.m)" },
  { name: "ZVE MAIL LIST",            domain: "messaging",  tag: "read",  description: "List messages in a MailMan basket (ZVEMSGR.m)" },
  { name: "ZVE MAIL GET",             domain: "messaging",  tag: "read",  description: "Read MailMan message header+body+recipients (ZVEMSGR.m)" },
  { name: "ZVE MAIL SEND",            domain: "messaging",  tag: "write", description: "Send MailMan message via XMXSEND with inline delivery (ZVEMSGR.m)" },
  { name: "ZVE MAIL MANAGE",          domain: "messaging",  tag: "write", description: "Mark read/delete/move MailMan message (ZVEMSGR.m)" },

  // --- Scheduling (Phase 37C: VistA scheduling adapter, enhanced Phase 123) ---
  { name: "SDOE LIST ENCOUNTERS FOR PAT",   domain: "scheduling",  tag: "read",  description: "List encounters/appointments for patient" },
  { name: "SD W/L RETRIVE HOSP LOC(#44)",   domain: "scheduling",  tag: "read",  description: "Retrieve hospital locations for scheduling" },
  { name: "SD W/L RETRIVE PERSON(200)",      domain: "scheduling",  tag: "read",  description: "Retrieve person file entries for scheduling" },
  { name: "SDOE LIST ENCOUNTERS FOR DATES",  domain: "scheduling",  tag: "read",  description: "List encounters for date range" },
  // Phase 123: SD* integration pack — new RPCs
  { name: "SDOE GET GENERAL DATA",           domain: "scheduling",  tag: "read",  description: "Get encounter general data fields (date, clinic, type)" },
  { name: "SDOE GET PROVIDERS",              domain: "scheduling",  tag: "read",  description: "Get providers assigned to an encounter" },
  { name: "SDOE GET DIAGNOSES",              domain: "scheduling",  tag: "read",  description: "Get diagnoses associated with an encounter" },
  { name: "SD W/L CREATE FILE",              domain: "scheduling",  tag: "write", description: "Create wait-list entry in VistA SD package" },
  { name: "SD W/L RETRIVE FULL DATA",        domain: "scheduling",  tag: "read",  description: "Retrieve full wait-list data" },
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
  { name: "VE INTEROP MSG LIST", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 message listing (Phase 58)" },
  { name: "VE INTEROP MSG DETAIL", reason: "Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 message detail (Phase 58)" },
  { name: "ORWCH PROBLEM LIST", reason: "Chart-specific problem list variant; may be absent from some Vivian snapshots" },
  { name: "ORQQCN2 MED RESULTS", reason: "Consult med results RPC; present in CPRS source but absent from Vivian cross-reference" },
  { name: "MAG4 REMOTE PROCEDURE", reason: "VistA Imaging remote procedure; absent from Vivian (MAG4 package has 27 other RPCs)" },
  { name: "RA DETAILED REPORT", reason: "Radiology detailed report; absent from Vivian snapshot (RA package underrepresented)" },
  { name: "ORWORB UNSIG ORDERS", reason: "Unsigned order notifications; Vivian has ORWORB UNSIG ORDERS FOLLOWUP but not this variant" },
  { name: "ORWLRR ACK", reason: "Lab result acknowledgment; absent from Vivian (ORWLRR has 20 other RPCs)" },
  { name: "TIU SET RECORD TEXT", reason: "TIU note text writer; absent from Vivian snapshot despite being core CPRS functionality" },
  { name: "ORWCIRN FACILITIES", reason: "Remote facility list; Vivian has ORWCIRN FACLIST but not this exact name variant" },
  { name: "VE RCM PROVIDER INFO", reason: "Custom RPC installed by VistA-Evolved (ZVERCMP.m) for provider NPI + facility identifiers (Phase 42)" },
  { name: "ZVE MAIL FOLDERS", reason: "Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan basket listing (Phase 70)" },
  { name: "ZVE MAIL LIST", reason: "Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message listing (Phase 70)" },
  { name: "ZVE MAIL GET", reason: "Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message detail (Phase 70)" },
  { name: "ZVE MAIL SEND", reason: "Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message send (Phase 70)" },
  { name: "ZVE MAIL MANAGE", reason: "Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message management (Phase 70)" },
  { name: "ORWPT16 ADMITLST", reason: "Admission list RPC; present in CPRS Delphi source but absent from some Vivian snapshots" },
  { name: "ORWLRR INTERIMG", reason: "Interim lab results imaging variant; absent from Vivian snapshot (ORWLRR has 20+ RPCs)" },
  { name: "ORWPT ID INFO", reason: "Patient ID info; present in CPRS source but absent from some Vivian snapshots" },
  { name: "ORWPT16 ID INFO", reason: "Extended patient ID info; present in CPRS source but absent from Vivian" },
  { name: "SDOE LIST ENCOUNTERS FOR PAT", reason: "Scheduling encounter list; SD package RPCs underrepresented in Vivian" },
  { name: "SD W/L RETRIVE HOSP LOC(#44)", reason: "Scheduling hospital location lookup; SD package RPCs underrepresented in Vivian" },
  { name: "SD W/L RETRIVE PERSON(200)", reason: "Scheduling person lookup; SD package RPCs underrepresented in Vivian" },
  { name: "SDOE LIST ENCOUNTERS FOR DATES", reason: "Scheduling encounter date range list; SD package RPCs underrepresented in Vivian" },
  // Phase 123: SD* integration pack — new exception entries
  { name: "SDOE GET GENERAL DATA", reason: "SDOE encounter detail; SD package RPCs underrepresented in Vivian" },
  { name: "SDOE GET PROVIDERS", reason: "SDOE encounter providers; SD package RPCs underrepresented in Vivian" },
  { name: "SDOE GET DIAGNOSES", reason: "SDOE encounter diagnoses; SD package RPCs underrepresented in Vivian" },
  { name: "SD W/L CREATE FILE", reason: "SD wait-list write; SD package RPCs underrepresented in Vivian" },
  { name: "SD W/L RETRIVE FULL DATA", reason: "SD wait-list full data retrieval; SD package RPCs underrepresented in Vivian" },
  // Phase 137: ZVEADT custom RPCs — expected missing until ZVEADT.m installed
  { name: "ZVEADT WARDS", reason: "Custom RPC installed by VistA-Evolved (ZVEADT.m) for ward census with bed counts (Phase 137)" },
  { name: "ZVEADT BEDS", reason: "Custom RPC installed by VistA-Evolved (ZVEADT.m) for bed-level occupancy (Phase 137)" },
  { name: "ZVEADT MVHIST", reason: "Custom RPC installed by VistA-Evolved (ZVEADT.m) for patient movement history from File 405 (Phase 137)" },
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
