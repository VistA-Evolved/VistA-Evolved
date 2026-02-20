/**
 * actionRegistry.ts -- Maps every CPRS web UI action to its backing RPC(s).
 *
 * Purpose:
 *   - NO DEAD CLICKS: every button/action in the CPRS UI must map to a known RPC
 *     or explicitly declare "integration-pending" with the target RPC name.
 *   - Machine-checkable: the verify script cross-references this against rpcRegistry.
 *   - Dev-visible: the RpcDebugPanel shows these mappings at runtime (admin only).
 */

export type ActionStatus = "wired" | "integration-pending" | "stub";

export interface CprsAction {
  /** Unique ID for this action */
  actionId: string;
  /** Human-readable label */
  label: string;
  /** UI location: which tab/panel/dialog contains this action */
  location: string;
  /** Capability name (matches module/capability system) */
  capability: string;
  /** RPC(s) this action calls when wired */
  rpcs: string[];
  /** Current implementation status */
  status: ActionStatus;
  /** For integration-pending: what needs to happen next */
  pendingNote?: string;
  /** API endpoint this action fetches from (Phase 56) */
  endpoint?: string;
}

/**
 * Master action registry for CPRS web UI.
 *
 * Organized by panel/tab. Keep sorted by location, then actionId.
 */
export const ACTION_REGISTRY: CprsAction[] = [
  // --- Cover Sheet ---
  {
    actionId: "cover.load-allergies",
    label: "Load Allergies",
    location: "CoverSheet",
    capability: "clinical.allergies.read",
    rpcs: ["ORQQAL LIST"],
    status: "wired",
    endpoint: "/vista/allergies",
  },
  {
    actionId: "cover.load-problems",
    label: "Load Problems",
    location: "CoverSheet",
    capability: "clinical.problems.read",
    rpcs: ["ORWCH PROBLEM LIST"],
    status: "wired",
    endpoint: "/vista/problems",
  },
  {
    actionId: "cover.load-vitals",
    label: "Load Vitals",
    location: "CoverSheet",
    capability: "clinical.vitals.read",
    rpcs: ["ORQQVI VITALS"],
    status: "wired",
    endpoint: "/vista/vitals",
  },
  {
    actionId: "cover.load-meds",
    label: "Load Medications",
    location: "CoverSheet",
    capability: "clinical.medications.read",
    rpcs: ["ORWPS ACTIVE"],
    status: "wired",
    endpoint: "/vista/medications",
  },
  {
    actionId: "cover.load-labs",
    label: "Load Recent Labs",
    location: "CoverSheet",
    capability: "clinical.labs.read",
    rpcs: ["ORWLRR INTERIM"],
    status: "wired",
    endpoint: "/vista/labs",
  },
  {
    actionId: "cover.load-orders",
    label: "Load Orders Summary",
    location: "CoverSheet",
    capability: "clinical.orders.read",
    rpcs: ["ORWORB UNSIG ORDERS"],
    status: "wired",
    endpoint: "/vista/cprs/orders-summary",
  },
  {
    actionId: "cover.load-appointments",
    label: "Load Appointments",
    location: "CoverSheet",
    capability: "clinical.scheduling.read",
    rpcs: [],
    status: "integration-pending",
    pendingNote: "SD API APPOINTMENTS BY DFN / SDOE GET APPOINTMENTS -- scheduling RPCs not available in WorldVistA sandbox",
    endpoint: "/vista/cprs/appointments",
  },
  {
    actionId: "cover.load-reminders",
    label: "Load Clinical Reminders",
    location: "CoverSheet",
    capability: "clinical.reminders.read",
    rpcs: [],
    status: "integration-pending",
    pendingNote: "ORQQPX REMINDERS LIST / ORQQPX REMINDER DETAIL -- PXRM package config needed in sandbox",
    endpoint: "/vista/cprs/reminders",
  },

  // --- Patient Search ---
  {
    actionId: "patient.search",
    label: "Search Patients",
    location: "PatientSearch",
    capability: "clinical.patients.read",
    rpcs: ["ORWPT LIST ALL"],
    status: "wired",
    endpoint: "/vista/patient-search",
  },
  {
    actionId: "patient.select",
    label: "Select Patient",
    location: "PatientSearch",
    capability: "clinical.patients.read",
    rpcs: ["ORWPT SELECT"],
    status: "wired",
    endpoint: "/vista/patient-search",
  },
  {
    actionId: "patient.default-list",
    label: "Load Default Patient List",
    location: "PatientSearch",
    capability: "clinical.patients.read",
    rpcs: ["ORQPT DEFAULT PATIENT LIST"],
    status: "wired",
    endpoint: "/vista/default-patient-list",
  },

  // --- Problems ---
  {
    actionId: "problems.list",
    label: "Load Problem List",
    location: "Problems",
    capability: "clinical.problems.read",
    rpcs: ["ORQQPL PROBLEM LIST"],
    status: "wired",
    endpoint: "/vista/problems",
  },
  {
    actionId: "problems.search-icd",
    label: "ICD/Lexicon Search",
    location: "Problems",
    capability: "clinical.problems.read",
    rpcs: ["ORQQPL4 LEX"],
    status: "wired",
    endpoint: "/vista/cprs/problems/icd-search",
  },
  {
    actionId: "problems.add",
    label: "Add Problem",
    location: "Problems",
    capability: "clinical.problems.write",
    rpcs: ["ORQQPL ADD SAVE"],
    status: "wired",
  },
  {
    actionId: "problems.edit",
    label: "Edit Problem",
    location: "Problems",
    capability: "clinical.problems.write",
    rpcs: ["ORQQPL EDIT SAVE"],
    status: "wired",
  },

  // --- Medications ---
  {
    actionId: "meds.list-active",
    label: "Load Active Medications",
    location: "Meds",
    capability: "clinical.medications.read",
    rpcs: ["ORWPS ACTIVE"],
    status: "wired",
    endpoint: "/vista/medications",
  },
  {
    actionId: "meds.order-detail",
    label: "View Order Detail",
    location: "Meds",
    capability: "clinical.medications.read",
    rpcs: ["ORWORR GETTXT"],
    status: "wired",
    endpoint: "/vista/cprs/meds/detail",
  },
  {
    actionId: "meds.quick-order",
    label: "Quick Order Medication",
    location: "Meds",
    capability: "clinical.medications.write",
    rpcs: ["ORWDX LOCK", "ORWDXM AUTOACK", "ORWDX UNLOCK"],
    status: "wired",
  },

  // --- Allergies ---
  {
    actionId: "allergies.list",
    label: "Load Allergies",
    location: "Allergies",
    capability: "clinical.allergies.read",
    rpcs: ["ORQQAL LIST"],
    status: "wired",
  },
  {
    actionId: "allergies.search",
    label: "Search Allergy Reactants",
    location: "Allergies",
    capability: "clinical.allergies.read",
    rpcs: ["ORWDAL32 ALLERGY MATCH"],
    status: "wired",
  },
  {
    actionId: "allergies.add",
    label: "Add Allergy",
    location: "Allergies",
    capability: "clinical.allergies.write",
    rpcs: ["ORWDAL32 SAVE ALLERGY"],
    status: "wired",
  },

  // --- Notes ---
  {
    actionId: "notes.list",
    label: "Load Notes",
    location: "Notes",
    capability: "clinical.notes.read",
    rpcs: ["TIU DOCUMENTS BY CONTEXT"],
    status: "wired",
    endpoint: "/vista/notes",
  },
  {
    actionId: "notes.read-text",
    label: "Read Note Text",
    location: "Notes",
    capability: "clinical.notes.read",
    rpcs: ["TIU GET RECORD TEXT"],
    status: "wired",
    endpoint: "/vista/tiu-text",
  },
  {
    actionId: "notes.create",
    label: "Create Note",
    location: "Notes",
    capability: "clinical.notes.write",
    rpcs: ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"],
    status: "wired",
  },

  // --- Orders ---
  {
    actionId: "orders.save",
    label: "Save Order",
    location: "Orders",
    capability: "clinical.orders.write",
    rpcs: ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"],
    status: "wired",
  },
  {
    actionId: "orders.verify",
    label: "Verify Order",
    location: "Orders",
    capability: "clinical.orders.write",
    rpcs: ["ORWDXA VERIFY"],
    status: "wired",
  },
  {
    actionId: "orders.dc",
    label: "Discontinue Order",
    location: "Orders",
    capability: "clinical.orders.write",
    rpcs: ["ORWDXA DC"],
    status: "stub",
    pendingNote: "DC endpoint exists in write-backs but needs full UI wiring",
  },
  {
    actionId: "orders.flag",
    label: "Flag Order",
    location: "Orders",
    capability: "clinical.orders.write",
    rpcs: ["ORWDXA FLAG"],
    status: "stub",
    pendingNote: "Flag endpoint exists in write-backs but needs full UI wiring",
  },

  // --- Consults ---
  {
    actionId: "consults.list",
    label: "Load Consults",
    location: "Consults",
    capability: "clinical.consults.read",
    rpcs: ["ORQQCN LIST"],
    status: "wired",
    endpoint: "/vista/consults",
  },
  {
    actionId: "consults.detail",
    label: "View Consult Detail",
    location: "Consults",
    capability: "clinical.consults.read",
    rpcs: ["ORQQCN DETAIL"],
    status: "wired",
  },
  {
    actionId: "consults.complete",
    label: "Complete Consult",
    location: "Consults",
    capability: "clinical.consults.write",
    rpcs: ["ORQQCN2 MED RESULTS"],
    status: "wired",
  },

  // --- Labs ---
  {
    actionId: "labs.interim",
    label: "Load Interim Lab Results",
    location: "Labs",
    capability: "clinical.labs.read",
    rpcs: ["ORWLRR INTERIM"],
    status: "wired",
    endpoint: "/vista/labs",
  },
  {
    actionId: "labs.ack",
    label: "Acknowledge Lab Result",
    location: "Labs",
    capability: "clinical.labs.write",
    rpcs: ["ORWLRR ACK"],
    status: "wired",
  },

  // --- Surgery ---
  {
    actionId: "surgery.list",
    label: "Load Surgery Cases",
    location: "Surgery",
    capability: "clinical.surgery.read",
    rpcs: ["ORWSR LIST"],
    status: "wired",
    endpoint: "/vista/surgery",
  },

  // --- DC Summaries ---
  {
    actionId: "dcsumm.list",
    label: "Load DC Summaries",
    location: "DCSumm",
    capability: "clinical.dcSumm.read",
    rpcs: ["TIU DOCUMENTS BY CONTEXT"],
    status: "wired",
    endpoint: "/vista/dc-summaries",
  },

  // --- Reports ---
  {
    actionId: "reports.list",
    label: "Load Report Lists",
    location: "Reports",
    capability: "clinical.reports.read",
    rpcs: ["ORWRP REPORT LISTS"],
    status: "wired",
    endpoint: "/vista/reports",
  },
  {
    actionId: "reports.text",
    label: "View Report Text",
    location: "Reports",
    capability: "clinical.reports.read",
    rpcs: ["ORWRP REPORT TEXT"],
    status: "wired",
    endpoint: "/vista/reports/text",
  },

  // --- Imaging ---
  {
    actionId: "imaging.radiology-report",
    label: "View Radiology Report",
    location: "Imaging",
    capability: "imaging.view",
    rpcs: ["RA DETAILED REPORT"],
    status: "wired",
  },
  {
    actionId: "imaging.patient-images",
    label: "Load Patient Images",
    location: "Imaging",
    capability: "imaging.view",
    rpcs: ["MAG4 PAT GET IMAGES"],
    status: "wired",
  },
  {
    actionId: "imaging.patient-photos",
    label: "Load Patient Photos",
    location: "Imaging",
    capability: "imaging.view",
    rpcs: ["MAGG PAT PHOTOS"],
    status: "wired",
  },

  // --- Vitals ---
  {
    actionId: "vitals.list",
    label: "Load Vitals",
    location: "Vitals",
    capability: "clinical.vitals.read",
    rpcs: ["ORQQVI VITALS"],
    status: "wired",
    endpoint: "/vista/vitals",
  },
  {
    actionId: "vitals.add",
    label: "Add Vital Measurement",
    location: "Vitals",
    capability: "clinical.vitals.write",
    rpcs: ["GMV ADD VM"],
    status: "wired",
  },

  // --- Inbox ---
  {
    actionId: "inbox.unsigned-orders",
    label: "Load Unsigned Orders",
    location: "Inbox",
    capability: "clinical.inbox.read",
    rpcs: ["ORWORB UNSIG ORDERS"],
    status: "wired",
  },
  {
    actionId: "inbox.user-info",
    label: "Load User Notification Info",
    location: "Inbox",
    capability: "clinical.inbox.read",
    rpcs: ["ORWORB FASTUSER"],
    status: "wired",
  },

  // --- Interop ---
  {
    actionId: "interop.hl7-links",
    label: "View HL7 Logical Links",
    location: "Admin/Integrations",
    capability: "interop.hl7.read",
    rpcs: ["VE INTEROP HL7 LINKS"],
    status: "wired",
  },
  {
    actionId: "interop.hl7-msgs",
    label: "View HL7 Messages",
    location: "Admin/Integrations",
    capability: "interop.hl7.read",
    rpcs: ["VE INTEROP HL7 MSGS"],
    status: "wired",
  },
  {
    actionId: "interop.hlo-status",
    label: "View HLO Status",
    location: "Admin/Integrations",
    capability: "interop.hlo.read",
    rpcs: ["VE INTEROP HLO STATUS"],
    status: "wired",
  },
  {
    actionId: "interop.queue-depth",
    label: "View Queue Depths",
    location: "Admin/Integrations",
    capability: "interop.queue.read",
    rpcs: ["VE INTEROP QUEUE DEPTH"],
    status: "wired",
  },

  // --- RCM / Billing ---
  {
    actionId: "rcm.encounters",
    label: "Load PCE Encounters",
    location: "RCM/VistA Billing",
    capability: "rcm.billing.read",
    rpcs: ["ORWPCE VISIT"],
    status: "wired",
  },
  {
    actionId: "rcm.insurance",
    label: "Query Patient Insurance",
    location: "RCM/VistA Billing",
    capability: "rcm.billing.read",
    rpcs: ["IBCN INSURANCE QUERY"],
    status: "wired",
  },
  {
    actionId: "rcm.icd-search",
    label: "ICD Search (Billing)",
    location: "RCM/VistA Billing",
    capability: "rcm.billing.read",
    rpcs: ["ORWPCE4 LEX"],
    status: "wired",
  },

  // --- RPC Catalog ---
  {
    actionId: "catalog.list-rpcs",
    label: "List All Registered RPCs",
    location: "Admin/RPC Catalog",
    capability: "admin.rpc-catalog",
    rpcs: ["VE LIST RPCS"],
    status: "wired",
  },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Get all actions for a given UI location.
 */
export function getActionsByLocation(location: string): CprsAction[] {
  return ACTION_REGISTRY.filter((a) => a.location === location);
}

/**
 * Get all actions that reference a given RPC.
 */
export function getActionsByRpc(rpcName: string): CprsAction[] {
  const upper = rpcName.toUpperCase();
  return ACTION_REGISTRY.filter((a) =>
    a.rpcs.some((r) => r.toUpperCase() === upper)
  );
}

/**
 * Get all unique RPC names referenced by actions.
 */
export function getAllActionRpcNames(): string[] {
  const set = new Set<string>();
  for (const action of ACTION_REGISTRY) {
    for (const rpc of action.rpcs) set.add(rpc);
  }
  return [...set].sort();
}

/**
 * Get all integration-pending actions.
 */
export function getPendingActions(): CprsAction[] {
  return ACTION_REGISTRY.filter((a) => a.status === "integration-pending" || a.status === "stub");
}

/**
 * Get action by ID.
 */
export function getAction(actionId: string): CprsAction | undefined {
  return ACTION_REGISTRY.find((a) => a.actionId === actionId);
}

/**
 * Summary statistics for the action registry.
 */
export function getActionRegistryStats(): {
  total: number;
  wired: number;
  pending: number;
  stub: number;
  uniqueRpcs: number;
  locations: string[];
} {
  const total = ACTION_REGISTRY.length;
  const wired = ACTION_REGISTRY.filter((a) => a.status === "wired").length;
  const pending = ACTION_REGISTRY.filter((a) => a.status === "integration-pending").length;
  const stub = ACTION_REGISTRY.filter((a) => a.status === "stub").length;
  const uniqueRpcs = getAllActionRpcNames().length;
  const locations = [...new Set(ACTION_REGISTRY.map((a) => a.location))].sort();
  return { total, wired, pending, stub, uniqueRpcs, locations };
}
