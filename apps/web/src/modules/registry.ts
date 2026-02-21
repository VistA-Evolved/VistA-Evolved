/**
 * Web-side Module Registry — Phase 76.
 *
 * Client-side module registry that mirrors the API's module definitions.
 * Provides metadata for UI rendering: labels, icons, descriptions,
 * admin page routes, and system-level module → tab-level mapping.
 *
 * This registry is the single source of truth for:
 *   - Which admin pages exist per module
 *   - Human-readable module labels for the UI
 *   - Module → tab slug mapping for navigation gating
 *   - Dependency descriptions for the admin console
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface WebModuleDefinition {
  /** System-level module ID (matches config/modules.json) */
  id: string;
  /** Human-readable label */
  label: string;
  /** Short description for tooltips / cards */
  description: string;
  /** Icon name (emoji for now; swap to lucide-react when available) */
  icon: string;
  /** Tab slugs this module owns (for tab-strip gating) */
  tabSlugs: string[];
  /** API route prefixes this module owns */
  apiPrefixes: string[];
  /** Admin page path (if any) */
  adminPath?: string;
  /** Module IDs this depends on */
  dependencies: string[];
  /** Whether this module is always enabled (kernel) */
  alwaysEnabled: boolean;
}

/* ------------------------------------------------------------------ */
/* Registry Data                                                       */
/* ------------------------------------------------------------------ */

const MODULE_DEFINITIONS: WebModuleDefinition[] = [
  {
    id: "kernel",
    label: "Platform Kernel",
    description: "Authentication, authorization, audit, observability",
    icon: "\u{1F6E1}",  // shield
    tabSlugs: [],
    apiPrefixes: ["/health", "/ready", "/version", "/auth/", "/admin/", "/audit/"],
    dependencies: [],
    alwaysEnabled: true,
  },
  {
    id: "clinical",
    label: "Clinical CPRS",
    description: "Patient search, allergies, vitals, notes, meds, problems, orders",
    icon: "\u{1FA7A}",  // stethoscope
    tabSlugs: ["cover", "problems", "meds", "orders", "notes", "consults", "surgery", "dcsumm", "labs", "reports", "vitals", "allergies"],
    apiPrefixes: ["/vista/patient", "/vista/allergies", "/vista/vitals", "/vista/notes", "/vista/medications", "/vista/problems", "/vista/consults", "/vista/surgery", "/vista/dc-summaries", "/vista/labs", "/vista/reports", "/vista/orders/", "/vista/meds/", "/vista/default-patient-list", "/vista/icd-search", "/vista/inbox", "/vista/adt", "/vista/nursing", "/vista/tiu-text"],
    adminPath: undefined,
    dependencies: ["kernel"],
    alwaysEnabled: false,
  },
  {
    id: "portal",
    label: "Patient Portal",
    description: "Patient-facing portal with secure messaging and telehealth",
    icon: "\u{1F465}",  // people
    tabSlugs: [],
    apiPrefixes: ["/portal/"],
    adminPath: undefined,
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "telehealth",
    label: "Telehealth",
    description: "Video visits, waiting room, device checks",
    icon: "\u{1F4F9}",  // video camera
    tabSlugs: ["telehealth"],
    apiPrefixes: ["/telehealth/"],
    adminPath: undefined,
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "imaging",
    label: "Imaging",
    description: "DICOM viewing, worklist, device registry, audit",
    icon: "\u{1F4CB}",  // clipboard
    tabSlugs: ["imaging"],
    apiPrefixes: ["/imaging/", "/dicomweb/"],
    adminPath: undefined,
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Operational analytics, dashboards, BI export",
    icon: "\u{1F4CA}",  // chart
    tabSlugs: [],
    apiPrefixes: ["/analytics/"],
    adminPath: "/cprs/admin/analytics",
    dependencies: ["kernel"],
    alwaysEnabled: false,
  },
  {
    id: "interop",
    label: "Interop",
    description: "HL7/HLO, VistA interop telemetry, FHIR bridge",
    icon: "\u{1F517}",  // link
    tabSlugs: [],
    apiPrefixes: ["/vista/interop/", "/admin/registry/"],
    adminPath: "/cprs/admin/integrations",
    dependencies: ["kernel"],
    alwaysEnabled: false,
  },
  {
    id: "intake",
    label: "Intake",
    description: "Patient intake forms, workflow automation",
    icon: "\u{1F4DD}",  // memo
    tabSlugs: ["intake"],
    apiPrefixes: ["/intake/"],
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "ai",
    label: "AI Assist",
    description: "Clinical decision support, NLP, AI-powered features",
    icon: "\u{1F916}",  // robot
    tabSlugs: ["aiassist"],
    apiPrefixes: ["/ai/"],
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "iam",
    label: "IAM",
    description: "Identity & access management, OIDC, passkeys, policy engine",
    icon: "\u{1F512}",  // lock
    tabSlugs: [],
    apiPrefixes: ["/iam/"],
    adminPath: "/cprs/admin/audit-viewer",
    dependencies: ["kernel"],
    alwaysEnabled: false,
  },
  {
    id: "rcm",
    label: "Revenue Cycle",
    description: "Billing, claims, payer connectivity, EDI pipeline",
    icon: "\u{1F4B0}",  // money bag
    tabSlugs: [],
    apiPrefixes: ["/rcm/"],
    adminPath: "/cprs/admin/rcm",
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "scheduling",
    label: "Scheduling",
    description: "Appointment scheduling, waitlists, clinic management",
    icon: "\u{1F4C5}",  // calendar
    tabSlugs: [],
    apiPrefixes: ["/scheduling/"],
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
  {
    id: "migration",
    label: "Migration",
    description: "Data migration tools, import/export, system transition",
    icon: "\u{1F4E6}",  // package
    tabSlugs: [],
    apiPrefixes: ["/migration/"],
    adminPath: "/cprs/admin/migration",
    dependencies: ["kernel", "clinical"],
    alwaysEnabled: false,
  },
];

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

const BY_ID = new Map<string, WebModuleDefinition>(
  MODULE_DEFINITIONS.map((m) => [m.id, m])
);

const TAB_TO_MODULE = new Map<string, string>();
for (const mod of MODULE_DEFINITIONS) {
  for (const slug of mod.tabSlugs) {
    TAB_TO_MODULE.set(slug, mod.id);
  }
}

/** Get all module definitions. */
export function getModuleDefinitions(): WebModuleDefinition[] {
  return MODULE_DEFINITIONS;
}

/** Get a single module definition by ID. */
export function getModuleById(id: string): WebModuleDefinition | undefined {
  return BY_ID.get(id);
}

/** Get the system-level module ID that owns a tab slug. */
export function getModuleForTab(tabSlug: string): string | undefined {
  return TAB_TO_MODULE.get(tabSlug);
}

/** Get all tab slugs owned by a module. */
export function getTabsForModule(moduleId: string): string[] {
  return BY_ID.get(moduleId)?.tabSlugs ?? [];
}

/** Get modules that have admin pages. */
export function getAdminModules(): WebModuleDefinition[] {
  return MODULE_DEFINITIONS.filter((m) => m.adminPath);
}

/**
 * Filter a list of module IDs to only those that are enabled.
 * Always includes kernel.
 */
export function filterEnabledModules(
  allModuleIds: string[],
  enabledIds: Set<string>
): string[] {
  return allModuleIds.filter(
    (id) => enabledIds.has(id) || BY_ID.get(id)?.alwaysEnabled
  );
}

/**
 * Check if a tab should be visible given the set of enabled module IDs.
 * Returns true if the tab's owning module is enabled, or if the tab
 * has no owning module (kernel-level).
 */
export function isTabVisible(tabSlug: string, enabledModuleIds: Set<string>): boolean {
  const moduleId = TAB_TO_MODULE.get(tabSlug);
  if (!moduleId) return true; // no module owns it → always visible
  const def = BY_ID.get(moduleId);
  if (def?.alwaysEnabled) return true;
  return enabledModuleIds.has(moduleId);
}
