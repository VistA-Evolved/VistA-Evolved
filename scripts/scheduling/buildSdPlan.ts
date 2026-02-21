/**
 * buildSdPlan.ts — Phase 63 SD Scheduling Plan Builder
 *
 * Scans Vivian snapshot + sandbox rpc_present for SD, SDOE, SDEC, SC RPCs,
 * classifies by scheduling capability, and writes sd-plan.json.
 *
 * Run: npx tsx scripts/scheduling/buildSdPlan.ts
 * Output: artifacts/phase63/sd-plan.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const VIVIAN_PATH = resolve(ROOT, "data/vista/vivian/rpc_index.json");
const PRESENT_PATH = resolve(ROOT, "data/vista/vista_instance/rpc_present.json");
const OUTPUT_DIR = resolve(ROOT, "artifacts/phase63");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "sd-plan.json");

/* ------------------------------------------------------------------ */
/* RPC capability classification                                        */
/* ------------------------------------------------------------------ */

interface RpcEntry {
  name: string;
  package?: string;
  inVivian: boolean;
  inSandbox: boolean;
  capability: string;
  notes: string;
}

const CAPABILITY_MAP: [RegExp, string, string][] = [
  // Encounter / appointment listing
  [/^SDOE LIST ENCOUNTERS/, "list_encounters", "List patient/date encounters"],
  [/^SDOE GET/, "encounter_detail", "Get encounter data fields"],
  [/^SDOE FIND/, "encounter_find", "Find encounter records"],
  [/^SDOE ASSIGNED/, "encounter_assignment", "Get assigned providers/diagnoses"],
  [/^SDOE PARSE/, "encounter_parse", "Parse encounter data"],

  // SDEC appointment management (Vivian — not in sandbox)
  [/^SDEC APPADD$/, "book_appointment", "Add appointment (SDEC)"],
  [/^SDEC APPDEL$/, "cancel_appointment", "Delete/cancel appointment (SDEC)"],
  [/^SDEC APPSLOTS$/, "slot_availability", "Get available appointment slots"],
  [/^SDEC APPT STATUS$/, "appointment_status", "Get appointment status"],
  [/^SDEC CHECKIN$/, "checkin", "Check in patient"],
  [/^SDEC CHECKOUT$/, "checkout", "Check out patient"],
  [/^SDEC EDITAPPT$/, "edit_appointment", "Edit existing appointment"],
  [/^SDEC CLIN/, "clinic_management", "Clinic configuration/lookup"],
  [/^SDEC CANC/, "cancel_reasons", "Cancellation check-out/reasons"],
  [/^SDEC CANREAS/, "cancel_reasons", "Cancel reason codes"],
  [/^SDEC APPTYPES$/, "appointment_types", "Appointment type codes"],
  [/^SDEC BOOKHLDY$/, "booking_holidays", "Holiday blocking for booking"],
  [/^SDEC ELIG/, "eligibility", "Patient eligibility check"],
  [/^SDEC CREATE WALKIN/, "walkin", "Create walk-in appointment"],
  [/^SDEC ARGET$/, "access_rules", "Access rule retrieval"],
  [/^SDEC ARSET$/, "access_rules", "Access rule management"],
  [/^SDEC/, "sdec_other", "Other SDEC scheduling function"],

  // Wait list
  [/^SD W\/L RETRIVE/, "waitlist_read", "Wait list data retrieval"],
  [/^SD W\/L CREATE/, "waitlist_write", "Wait list entry creation"],
  [/^SD W\/L/, "waitlist_other", "Wait list metadata"],

  // SC team/patient management
  [/^SC BLD PAT APT LIST$/, "patient_appointment_list", "Build patient appointment list"],
  [/^SC BLD PAT/, "patient_list", "Build patient list"],
  [/^SC PATIENT LOOKUP$/, "patient_lookup", "Patient search"],
  [/^SC TEAM LIST$/, "team_list", "Team roster"],
  [/^SC POSITION/, "team_positions", "Team position data"],
  [/^SC PRIMARY CARE TEAM$/, "primary_care", "Primary care team assignment"],
  [/^SC PC PROVIDER$/, "primary_care", "Primary care provider"],
  [/^SC/, "sc_other", "Other SC team/scheduling function"],

  // DVBAB appointment list
  [/^DVBAB APPOINTMENT LIST$/, "appointment_list", "C&P appointment list"],

  // Consult scheduling
  [/^ORQQCN2 SCHEDULE CONSULT$/, "consult_schedule", "Schedule a consult"],
  [/^ORQQCN/, "consult_other", "Consult management"],

  // SD general
  [/^SD VSE/, "vse_reporting", "VSE reporting/filtering"],
];

function classifyRpc(name: string): { capability: string; notes: string } {
  for (const [pattern, cap, note] of CAPABILITY_MAP) {
    if (pattern.test(name)) return { capability: cap, notes: note };
  }
  return { capability: "unclassified", notes: "" };
}

/* ------------------------------------------------------------------ */
/* Main                                                                  */
/* ------------------------------------------------------------------ */

function main() {
  // Load data
  const vivianData = JSON.parse(readFileSync(VIVIAN_PATH, "utf-8"));
  const presentData = JSON.parse(readFileSync(PRESENT_PATH, "utf-8"));

  const vivianRpcs: { name: string; package?: string }[] = vivianData.rpcs;
  const presentSet = new Set<string>(presentData.rpcs);

  // Filter to scheduling-relevant RPCs
  const SD_PREFIXES = ["SD", "SDEC", "SDOE", "SC ", "SC\t", "DVBAB APPOINTMENT", "ORQQCN"];
  function isSchedulingRelevant(name: string): boolean {
    return SD_PREFIXES.some((p) => name.startsWith(p));
  }

  // Build inventory from Vivian
  const inventory: RpcEntry[] = [];
  const seen = new Set<string>();

  for (const rpc of vivianRpcs) {
    if (!isSchedulingRelevant(rpc.name)) continue;
    seen.add(rpc.name);
    const { capability, notes } = classifyRpc(rpc.name);
    inventory.push({
      name: rpc.name,
      package: rpc.package,
      inVivian: true,
      inSandbox: presentSet.has(rpc.name),
      capability,
      notes,
    });
  }

  // Add any sandbox RPCs not in Vivian
  for (const name of presentData.rpcs) {
    if (!isSchedulingRelevant(name) || seen.has(name)) continue;
    const { capability, notes } = classifyRpc(name);
    inventory.push({
      name,
      inVivian: false,
      inSandbox: true,
      capability,
      notes,
    });
  }

  inventory.sort((a, b) => a.name.localeCompare(b.name));

  // Summary stats
  const totalVivian = inventory.filter((r) => r.inVivian).length;
  const totalSandbox = inventory.filter((r) => r.inSandbox).length;
  const capSummary: Record<string, { vivian: number; sandbox: number }> = {};
  for (const r of inventory) {
    if (!capSummary[r.capability]) capSummary[r.capability] = { vivian: 0, sandbox: 0 };
    if (r.inVivian) capSummary[r.capability].vivian++;
    if (r.inSandbox) capSummary[r.capability].sandbox++;
  }

  // Identify key sequences
  const keySequences = {
    listPatientAppointments: {
      description: "List appointments for a patient",
      primaryRpc: "SDOE LIST ENCOUNTERS FOR PAT",
      available: presentSet.has("SDOE LIST ENCOUNTERS FOR PAT"),
      fallback: presentSet.has("DVBAB APPOINTMENT LIST") ? "DVBAB APPOINTMENT LIST" : null,
      prerequisites: ["Patient DFN", "Date range (optional)"],
    },
    listByDateRange: {
      description: "List clinic encounters by date range",
      primaryRpc: "SDOE LIST ENCOUNTERS FOR DATES",
      available: presentSet.has("SDOE LIST ENCOUNTERS FOR DATES"),
      prerequisites: ["Start date", "End date", "Clinic IEN (optional)"],
    },
    getEncounterDetail: {
      description: "Get full encounter data",
      primaryRpc: "SDOE GET GENERAL DATA",
      available: presentSet.has("SDOE GET GENERAL DATA"),
      prerequisites: ["Encounter IEN from list call"],
    },
    getProviders: {
      description: "Get providers assigned to encounter",
      primaryRpc: "SDOE GET PROVIDERS",
      available: presentSet.has("SDOE GET PROVIDERS"),
      prerequisites: ["Encounter IEN"],
    },
    getDiagnoses: {
      description: "Get diagnoses for encounter",
      primaryRpc: "SDOE GET DIAGNOSES",
      available: presentSet.has("SDOE GET DIAGNOSES"),
      prerequisites: ["Encounter IEN"],
    },
    clinicLookup: {
      description: "List hospital locations / clinics",
      primaryRpc: "SD W/L RETRIVE HOSP LOC(#44)",
      available: presentSet.has("SD W/L RETRIVE HOSP LOC(#44)"),
      prerequisites: ["None — returns all locations"],
    },
    providerLookup: {
      description: "List providers (Person file #200)",
      primaryRpc: "SD W/L RETRIVE PERSON(200)",
      available: presentSet.has("SD W/L RETRIVE PERSON(200)"),
      prerequisites: ["None — returns all providers"],
    },
    patientAppointmentList: {
      description: "Build patient appointment list (SC module)",
      primaryRpc: "SC BLD PAT APT LIST",
      available: presentSet.has("SC BLD PAT APT LIST"),
      prerequisites: ["Patient DFN or team context"],
    },
    bookAppointment: {
      description: "Book/create appointment",
      primaryRpc: "SDEC APPADD",
      available: presentSet.has("SDEC APPADD"),
      fallbackTarget: "SDEC APPADD (not in sandbox — request flow only)",
      prerequisites: ["Patient DFN", "Clinic IEN", "Date/time", "Provider DUZ", "Appointment length"],
    },
    cancelAppointment: {
      description: "Cancel/delete appointment",
      primaryRpc: "SDEC APPDEL",
      available: presentSet.has("SDEC APPDEL"),
      fallbackTarget: "SDEC APPDEL (not in sandbox — cancel request only)",
      prerequisites: ["Appointment IEN", "Cancel reason IEN"],
    },
    getSlots: {
      description: "Get available time slots",
      primaryRpc: "SDEC APPSLOTS",
      available: presentSet.has("SDEC APPSLOTS"),
      fallbackTarget: "SDEC APPSLOTS (not in sandbox — shows pending)",
      prerequisites: ["Clinic IEN", "Date range"],
    },
    waitlistCreate: {
      description: "Create wait list entry (alternative to direct booking)",
      primaryRpc: "SD W/L CREATE FILE",
      available: presentSet.has("SD W/L CREATE FILE"),
      prerequisites: ["Patient DFN", "Clinic", "Priority", "Desired date"],
    },
    waitlistRead: {
      description: "Read wait list data",
      primaryRpc: "SD W/L RETRIVE FULL DATA",
      available: presentSet.has("SD W/L RETRIVE FULL DATA"),
      prerequisites: ["Wait list entry IEN or filter"],
    },
  };

  const plan = {
    _meta: {
      generatedAt: new Date().toISOString(),
      phase: 63,
      description: "VistA SD Scheduling RPC Plan — Vivian + sandbox cross-reference",
    },
    summary: {
      totalSchedulingRpcsInVivian: totalVivian,
      totalSchedulingRpcsInSandbox: totalSandbox,
      sandboxAvailabilityPercent: Math.round((totalSandbox / totalVivian) * 100),
    },
    capabilitySummary: capSummary,
    keySequences,
    implementationStrategy: {
      phase63: {
        description: "Use available SDOE + SD W/L RPCs for reads. Request-flow for writes.",
        liveCapabilities: [
          "SDOE LIST ENCOUNTERS FOR PAT — patient appointment/encounter list",
          "SDOE LIST ENCOUNTERS FOR DATES — date-range appointment list",
          "SDOE GET GENERAL DATA — encounter detail",
          "SDOE GET PROVIDERS — provider assignments",
          "SD W/L RETRIVE HOSP LOC(#44) — clinic lookup",
          "SD W/L RETRIVE PERSON(200) — provider lookup",
          "SD W/L RETRIVE FULL DATA — wait list data",
          "SD W/L CREATE FILE — wait list entry creation",
          "DVBAB APPOINTMENT LIST — C&P appointment fallback",
          "SC BLD PAT APT LIST — team-based patient appointment list",
        ],
        pendingCapabilities: [
          "SDEC APPADD — direct appointment booking (absent from sandbox)",
          "SDEC APPDEL — appointment cancellation (absent from sandbox)",
          "SDEC APPSLOTS — slot availability (absent from sandbox)",
          "SDEC EDITAPPT — appointment editing (absent from sandbox)",
          "SDEC CHECKIN / CHECKOUT — check-in/out (absent from sandbox)",
        ],
        strategy: "Real reads via SDOE/SD W/L. Request-flow for booking (stored as wait list entry). Cancel/reschedule as request with explicit SDEC targets.",
      },
    },
    inventory,
  };

  // Write output
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(plan, null, 2));
  console.log(`[OK] SD plan written to ${OUTPUT_PATH}`);
  console.log(`     Vivian: ${totalVivian} RPCs | Sandbox: ${totalSandbox} RPCs`);
  console.log(`     Key sequences: ${Object.keys(keySequences).length}`);
}

main();
