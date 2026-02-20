#!/usr/bin/env node
/**
 * Phase 56 -- Build Wave 56 Plan
 *
 * Reads parity-matrix.json + delphi extractions + Vivian + action registry
 * Produces wave56-plan.json defining every screen/action in Wave 1.
 *
 * Usage: npx tsx scripts/cprs/buildWave56Plan.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts", "cprs");

interface Wave1Screen {
  screenId: string;
  label: string;
  location: string;
  actions: Wave1Action[];
}

interface Wave1Action {
  actionId: string;
  label: string;
  endpoint: string;
  method: "GET" | "POST";
  rpcUsed: string[];
  vivianPresence: "present" | "absent" | "exception";
  pendingTargets?: string[];
  expectedResponseModel: string;
  status: "wired" | "integration-pending";
}

// Vivian lookup
function loadVivianSet(): Set<string> {
  const path = join(ROOT, "data", "vista", "vivian", "rpc_index.json");
  if (!existsSync(path)) return new Set();
  const data = JSON.parse(readFileSync(path, "utf-8"));
  return new Set((data.rpcs ?? []).map((r: { name: string }) => r.name.toUpperCase()));
}

// RPC exception set
function loadExceptions(): Set<string> {
  const path = join(ROOT, "apps", "api", "src", "vista", "rpcRegistry.ts");
  if (!existsSync(path)) return new Set();
  const src = readFileSync(path, "utf-8");
  const excBlock = src.indexOf("RPC_EXCEPTIONS");
  if (excBlock < 0) return new Set();
  const excs = new Set<string>();
  for (const m of src.slice(excBlock).matchAll(/name:\s*"([^"]+)"/g)) {
    excs.add(m[1].toUpperCase());
  }
  return excs;
}

function vivianStatus(rpc: string, vivian: Set<string>, exceptions: Set<string>): Wave1Action["vivianPresence"] {
  if (vivian.has(rpc.toUpperCase())) return "present";
  if (exceptions.has(rpc.toUpperCase())) return "exception";
  return "absent";
}

function main() {
  const vivian = loadVivianSet();
  const exceptions = loadExceptions();
  mkdirSync(ARTIFACTS, { recursive: true });

  const screens: Wave1Screen[] = [
    // --- COVER SHEET ---
    {
      screenId: "cover-sheet",
      label: "Cover Sheet",
      location: "CoverSheet",
      actions: [
        {
          actionId: "cover.load-problems",
          label: "Load Active Problems",
          endpoint: "/vista/problems",
          method: "GET",
          rpcUsed: ["ORQQPL PROBLEM LIST"],
          vivianPresence: vivianStatus("ORQQPL PROBLEM LIST", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Problem[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-allergies",
          label: "Load Allergies",
          endpoint: "/vista/allergies",
          method: "GET",
          rpcUsed: ["ORQQAL LIST"],
          vivianPresence: vivianStatus("ORQQAL LIST", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Allergy[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-meds",
          label: "Load Active Medications",
          endpoint: "/vista/medications",
          method: "GET",
          rpcUsed: ["ORWPS ACTIVE"],
          vivianPresence: vivianStatus("ORWPS ACTIVE", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Medication[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-vitals",
          label: "Load Vitals",
          endpoint: "/vista/vitals",
          method: "GET",
          rpcUsed: ["ORQQVI VITALS"],
          vivianPresence: vivianStatus("ORQQVI VITALS", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Vital[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-notes",
          label: "Load Recent Notes",
          endpoint: "/vista/notes",
          method: "GET",
          rpcUsed: ["TIU DOCUMENTS BY CONTEXT"],
          vivianPresence: vivianStatus("TIU DOCUMENTS BY CONTEXT", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Note[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-labs",
          label: "Load Recent Labs",
          endpoint: "/vista/labs",
          method: "GET",
          rpcUsed: ["ORWLRR INTERIM"],
          vivianPresence: vivianStatus("ORWLRR INTERIM", vivian, exceptions),
          expectedResponseModel: "{ ok, results: LabResult[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-orders",
          label: "Load Orders Summary",
          endpoint: "/vista/cprs/orders-summary",
          method: "GET",
          rpcUsed: ["ORWORB UNSIG ORDERS"],
          vivianPresence: vivianStatus("ORWORB UNSIG ORDERS", vivian, exceptions),
          expectedResponseModel: "{ ok, unsigned: number, recent: Order[] }",
          status: "wired",
        },
        {
          actionId: "cover.load-appointments",
          label: "Load Appointments",
          endpoint: "/vista/cprs/appointments",
          method: "GET",
          rpcUsed: [],
          vivianPresence: "absent",
          pendingTargets: ["SD API APPOINTMENTS BY DFN", "SDOE GET APPOINTMENTS"],
          expectedResponseModel: "{ ok, results: Appointment[] }",
          status: "integration-pending",
        },
        {
          actionId: "cover.load-reminders",
          label: "Load Clinical Reminders",
          endpoint: "/vista/cprs/reminders",
          method: "GET",
          rpcUsed: [],
          vivianPresence: "absent",
          pendingTargets: ["ORQQPX REMINDERS LIST", "ORQQPX REMINDER DETAIL"],
          expectedResponseModel: "{ ok, results: Reminder[] }",
          status: "integration-pending",
        },
      ],
    },
    // --- PROBLEMS TAB ---
    {
      screenId: "problems-tab",
      label: "Problems",
      location: "Problems",
      actions: [
        {
          actionId: "problems.list",
          label: "Load Problem List",
          endpoint: "/vista/problems",
          method: "GET",
          rpcUsed: ["ORQQPL PROBLEM LIST"],
          vivianPresence: vivianStatus("ORQQPL PROBLEM LIST", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Problem[] }",
          status: "wired",
        },
        {
          actionId: "problems.search-icd",
          label: "ICD/Lexicon Search",
          endpoint: "/vista/cprs/problems/icd-search",
          method: "GET",
          rpcUsed: ["ORQQPL4 LEX"],
          vivianPresence: vivianStatus("ORQQPL4 LEX", vivian, exceptions),
          expectedResponseModel: "{ ok, results: LexEntry[] }",
          status: "wired",
        },
      ],
    },
    // --- MEDS TAB ---
    {
      screenId: "meds-tab",
      label: "Medications",
      location: "Meds",
      actions: [
        {
          actionId: "meds.list-active",
          label: "Load Active Medications",
          endpoint: "/vista/medications",
          method: "GET",
          rpcUsed: ["ORWPS ACTIVE"],
          vivianPresence: vivianStatus("ORWPS ACTIVE", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Medication[] }",
          status: "wired",
        },
        {
          actionId: "meds.order-detail",
          label: "View Order Detail",
          endpoint: "/vista/cprs/meds/detail",
          method: "GET",
          rpcUsed: ["ORWORR GETTXT"],
          vivianPresence: vivianStatus("ORWORR GETTXT", vivian, exceptions),
          expectedResponseModel: "{ ok, text: string }",
          status: "wired",
        },
      ],
    },
    // --- ORDERS TAB ---
    {
      screenId: "orders-tab",
      label: "Orders",
      location: "Orders",
      actions: [
        {
          actionId: "orders.list",
          label: "Load Orders",
          endpoint: "/vista/cprs/orders-summary",
          method: "GET",
          rpcUsed: ["ORWORB UNSIG ORDERS"],
          vivianPresence: vivianStatus("ORWORB UNSIG ORDERS", vivian, exceptions),
          expectedResponseModel: "{ ok, unsigned: number, recent: Order[] }",
          status: "wired",
        },
      ],
    },
    // --- NOTES TAB ---
    {
      screenId: "notes-tab",
      label: "Notes",
      location: "Notes",
      actions: [
        {
          actionId: "notes.list",
          label: "Load Notes",
          endpoint: "/vista/notes",
          method: "GET",
          rpcUsed: ["TIU DOCUMENTS BY CONTEXT"],
          vivianPresence: vivianStatus("TIU DOCUMENTS BY CONTEXT", vivian, exceptions),
          expectedResponseModel: "{ ok, results: Note[] }",
          status: "wired",
        },
        {
          actionId: "notes.read-text",
          label: "Read Note Text",
          endpoint: "/vista/tiu-text",
          method: "GET",
          rpcUsed: ["TIU GET RECORD TEXT"],
          vivianPresence: vivianStatus("TIU GET RECORD TEXT", vivian, exceptions),
          expectedResponseModel: "{ ok, text: string }",
          status: "wired",
        },
      ],
    },
    // --- LABS/RESULTS TAB ---
    {
      screenId: "labs-tab",
      label: "Labs / Results",
      location: "Labs",
      actions: [
        {
          actionId: "labs.interim",
          label: "Load Interim Lab Results",
          endpoint: "/vista/labs",
          method: "GET",
          rpcUsed: ["ORWLRR INTERIM"],
          vivianPresence: vivianStatus("ORWLRR INTERIM", vivian, exceptions),
          expectedResponseModel: "{ ok, results: LabResult[] }",
          status: "wired",
        },
        {
          actionId: "labs.chart",
          label: "Load Lab Chart Data",
          endpoint: "/vista/cprs/labs/chart",
          method: "GET",
          rpcUsed: ["ORWLRR CHART"],
          vivianPresence: vivianStatus("ORWLRR CHART", vivian, exceptions),
          expectedResponseModel: "{ ok, data: LabChartPoint[] }",
          status: "wired",
        },
      ],
    },
  ];

  // Flatten for summary
  const allActions = screens.flatMap((s) => s.actions);
  const wired = allActions.filter((a) => a.status === "wired").length;
  const pending = allActions.filter((a) => a.status === "integration-pending").length;

  const plan = {
    _meta: {
      phase: 56,
      generatedAt: new Date().toISOString(),
      description: "Wave 1 (READ) wiring plan -- authoritative source for screens, actions, endpoints, RPCs",
      totalScreens: screens.length,
      totalActions: allActions.length,
      wired,
      pending,
    },
    screens,
  };

  writeFileSync(join(ARTIFACTS, "wave56-plan.json"), JSON.stringify(plan, null, 2));
  console.log(`Wave 56 plan: ${screens.length} screens, ${allActions.length} actions (${wired} wired, ${pending} pending)`);
  console.log(`Output: artifacts/cprs/wave56-plan.json`);
}

main();
