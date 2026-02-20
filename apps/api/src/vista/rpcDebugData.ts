/**
 * rpcDebugData.ts -- Server-side copy of the CPRS action registry data.
 *
 * This file duplicates the action registry from apps/web/src/actions/actionRegistry.ts
 * to avoid cross-app imports. The verify script ensures both stay in sync.
 *
 * Phase 41: Vivian Snapshot Integration + RPC Catalog
 */

export type ActionStatus = "wired" | "integration-pending" | "stub";

export interface CprsAction {
  actionId: string;
  label: string;
  location: string;
  capability: string;
  rpcs: string[];
  status: ActionStatus;
  pendingNote?: string;
}

export const ACTION_REGISTRY_DATA: CprsAction[] = [
  // --- Cover Sheet ---
  { actionId: "cover.load-allergies", label: "Load Allergies", location: "CoverSheet", capability: "clinical.allergies.read", rpcs: ["ORQQAL LIST"], status: "wired" },
  { actionId: "cover.load-problems", label: "Load Problems", location: "CoverSheet", capability: "clinical.problems.read", rpcs: ["ORWCH PROBLEM LIST"], status: "wired" },
  { actionId: "cover.load-vitals", label: "Load Vitals", location: "CoverSheet", capability: "clinical.vitals.read", rpcs: ["ORQQVI VITALS"], status: "wired" },
  { actionId: "cover.load-meds", label: "Load Medications", location: "CoverSheet", capability: "clinical.medications.read", rpcs: ["ORWPS ACTIVE"], status: "wired" },

  // --- Patient Search ---
  { actionId: "patient.search", label: "Search Patients", location: "PatientSearch", capability: "clinical.patients.read", rpcs: ["ORWPT LIST ALL"], status: "wired" },
  { actionId: "patient.select", label: "Select Patient", location: "PatientSearch", capability: "clinical.patients.read", rpcs: ["ORWPT SELECT"], status: "wired" },
  { actionId: "patient.default-list", label: "Load Default Patient List", location: "PatientSearch", capability: "clinical.patients.read", rpcs: ["ORQPT DEFAULT PATIENT LIST"], status: "wired" },

  // --- Problems ---
  { actionId: "problems.list", label: "Load Problem List", location: "Problems", capability: "clinical.problems.read", rpcs: ["ORQQPL PROBLEM LIST"], status: "wired" },
  { actionId: "problems.search-icd", label: "ICD/Lexicon Search", location: "Problems", capability: "clinical.problems.read", rpcs: ["ORQQPL4 LEX"], status: "wired" },
  { actionId: "problems.add", label: "Add Problem", location: "Problems", capability: "clinical.problems.write", rpcs: ["ORQQPL ADD SAVE"], status: "wired" },
  { actionId: "problems.edit", label: "Edit Problem", location: "Problems", capability: "clinical.problems.write", rpcs: ["ORQQPL EDIT SAVE"], status: "wired" },

  // --- Medications ---
  { actionId: "meds.list-active", label: "Load Active Medications", location: "Meds", capability: "clinical.medications.read", rpcs: ["ORWPS ACTIVE"], status: "wired" },
  { actionId: "meds.order-detail", label: "View Order Detail", location: "Meds", capability: "clinical.medications.read", rpcs: ["ORWORR GETTXT"], status: "wired" },
  { actionId: "meds.quick-order", label: "Quick Order Medication", location: "Meds", capability: "clinical.medications.write", rpcs: ["ORWDX LOCK", "ORWDXM AUTOACK", "ORWDX UNLOCK"], status: "wired" },

  // --- Allergies ---
  { actionId: "allergies.list", label: "Load Allergies", location: "Allergies", capability: "clinical.allergies.read", rpcs: ["ORQQAL LIST"], status: "wired" },
  { actionId: "allergies.search", label: "Search Allergy Reactants", location: "Allergies", capability: "clinical.allergies.read", rpcs: ["ORWDAL32 ALLERGY MATCH"], status: "wired" },
  { actionId: "allergies.add", label: "Add Allergy", location: "Allergies", capability: "clinical.allergies.write", rpcs: ["ORWDAL32 SAVE ALLERGY"], status: "wired" },

  // --- Notes ---
  { actionId: "notes.list", label: "Load Notes", location: "Notes", capability: "clinical.notes.read", rpcs: ["TIU DOCUMENTS BY CONTEXT"], status: "wired" },
  { actionId: "notes.read-text", label: "Read Note Text", location: "Notes", capability: "clinical.notes.read", rpcs: ["TIU GET RECORD TEXT"], status: "wired" },
  { actionId: "notes.create", label: "Create Note", location: "Notes", capability: "clinical.notes.write", rpcs: ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"], status: "wired" },

  // --- Orders ---
  { actionId: "orders.save", label: "Save Order", location: "Orders", capability: "clinical.orders.write", rpcs: ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"], status: "wired" },
  { actionId: "orders.verify", label: "Verify Order", location: "Orders", capability: "clinical.orders.write", rpcs: ["ORWDXA VERIFY"], status: "wired" },
  { actionId: "orders.dc", label: "Discontinue Order", location: "Orders", capability: "clinical.orders.write", rpcs: ["ORWDXA DC"], status: "stub", pendingNote: "DC endpoint exists in write-backs but needs full UI wiring" },
  { actionId: "orders.flag", label: "Flag Order", location: "Orders", capability: "clinical.orders.write", rpcs: ["ORWDXA FLAG"], status: "stub", pendingNote: "Flag endpoint exists in write-backs but needs full UI wiring" },

  // --- Consults ---
  { actionId: "consults.list", label: "Load Consults", location: "Consults", capability: "clinical.consults.read", rpcs: ["ORQQCN LIST"], status: "wired" },
  { actionId: "consults.detail", label: "View Consult Detail", location: "Consults", capability: "clinical.consults.read", rpcs: ["ORQQCN DETAIL"], status: "wired" },
  { actionId: "consults.complete", label: "Complete Consult", location: "Consults", capability: "clinical.consults.write", rpcs: ["ORQQCN2 MED RESULTS"], status: "wired" },

  // --- Labs ---
  { actionId: "labs.interim", label: "Load Interim Lab Results", location: "Labs", capability: "clinical.labs.read", rpcs: ["ORWLRR INTERIM"], status: "wired" },
  { actionId: "labs.ack", label: "Acknowledge Lab Result", location: "Labs", capability: "clinical.labs.write", rpcs: ["ORWLRR ACK"], status: "wired" },

  // --- Surgery ---
  { actionId: "surgery.list", label: "Load Surgery Cases", location: "Surgery", capability: "clinical.surgery.read", rpcs: ["ORWSR LIST"], status: "wired" },

  // --- DC Summaries ---
  { actionId: "dcsumm.list", label: "Load DC Summaries", location: "DCSumm", capability: "clinical.dcSumm.read", rpcs: ["TIU DOCUMENTS BY CONTEXT"], status: "wired" },

  // --- Reports ---
  { actionId: "reports.list", label: "Load Report Lists", location: "Reports", capability: "clinical.reports.read", rpcs: ["ORWRP REPORT LISTS"], status: "wired" },
  { actionId: "reports.text", label: "View Report Text", location: "Reports", capability: "clinical.reports.read", rpcs: ["ORWRP REPORT TEXT"], status: "wired" },

  // --- Imaging ---
  { actionId: "imaging.radiology-report", label: "View Radiology Report", location: "Imaging", capability: "imaging.view", rpcs: ["RA DETAILED REPORT"], status: "wired" },
  { actionId: "imaging.patient-images", label: "Load Patient Images", location: "Imaging", capability: "imaging.view", rpcs: ["MAG4 PAT GET IMAGES"], status: "wired" },
  { actionId: "imaging.patient-photos", label: "Load Patient Photos", location: "Imaging", capability: "imaging.view", rpcs: ["MAGG PAT PHOTOS"], status: "wired" },

  // --- Vitals ---
  { actionId: "vitals.list", label: "Load Vitals", location: "Vitals", capability: "clinical.vitals.read", rpcs: ["ORQQVI VITALS"], status: "wired" },
  { actionId: "vitals.add", label: "Add Vital Measurement", location: "Vitals", capability: "clinical.vitals.write", rpcs: ["GMV ADD VM"], status: "wired" },

  // --- Inbox ---
  { actionId: "inbox.unsigned-orders", label: "Load Unsigned Orders", location: "Inbox", capability: "clinical.inbox.read", rpcs: ["ORWORB UNSIG ORDERS"], status: "wired" },
  { actionId: "inbox.user-info", label: "Load User Notification Info", location: "Inbox", capability: "clinical.inbox.read", rpcs: ["ORWORB FASTUSER"], status: "wired" },

  // --- Interop ---
  { actionId: "interop.hl7-links", label: "View HL7 Logical Links", location: "Admin/Integrations", capability: "interop.hl7.read", rpcs: ["VE INTEROP HL7 LINKS"], status: "wired" },
  { actionId: "interop.hl7-msgs", label: "View HL7 Messages", location: "Admin/Integrations", capability: "interop.hl7.read", rpcs: ["VE INTEROP HL7 MSGS"], status: "wired" },
  { actionId: "interop.hlo-status", label: "View HLO Status", location: "Admin/Integrations", capability: "interop.hlo.read", rpcs: ["VE INTEROP HLO STATUS"], status: "wired" },
  { actionId: "interop.queue-depth", label: "View Queue Depths", location: "Admin/Integrations", capability: "interop.queue.read", rpcs: ["VE INTEROP QUEUE DEPTH"], status: "wired" },

  // --- RCM / Billing ---
  { actionId: "rcm.encounters", label: "Load PCE Encounters", location: "RCM/VistA Billing", capability: "rcm.billing.read", rpcs: ["ORWPCE VISIT"], status: "wired" },
  { actionId: "rcm.insurance", label: "Query Patient Insurance", location: "RCM/VistA Billing", capability: "rcm.billing.read", rpcs: ["IBCN INSURANCE QUERY"], status: "wired" },
  { actionId: "rcm.icd-search", label: "ICD Search (Billing)", location: "RCM/VistA Billing", capability: "rcm.billing.read", rpcs: ["ORWPCE4 LEX"], status: "wired" },

  // --- RPC Catalog ---
  { actionId: "catalog.list-rpcs", label: "List All Registered RPCs", location: "Admin/RPC Catalog", capability: "admin.rpc-catalog", rpcs: ["VE LIST RPCS"], status: "wired" },
];
