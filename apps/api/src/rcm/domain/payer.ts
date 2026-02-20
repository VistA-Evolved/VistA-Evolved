/**
 * RCM Domain — Payer Entity & Integration Modes
 *
 * Phase 38: Payer types for the registry.
 *
 * Integration modes classify how we connect to each payer:
 * - clearinghouse_edi: via EDI 837/835 through a clearinghouse (covers ~95% of US payers)
 * - direct_api: payer exposes a real-time API (rare for claims; common for eligibility)
 * - portal_batch: manual portal submission or batched file upload (legacy payers)
 * - government_portal: government-specific portal (PhilHealth, Medicare DDE, etc.)
 * - fhir_payer: FHIR-based payer API (emerging; prior auth, payer-to-payer)
 * - not_classified: onboarded in registry but integration mode TBD
 */

export type IntegrationMode =
  | "clearinghouse_edi"
  | "direct_api"
  | "portal_batch"
  | "government_portal"
  | "fhir_payer"
  | "not_classified";

export type PayerStatus = "active" | "inactive" | "onboarding" | "suspended";

export type PayerCountry = "US" | "PH" | "AU" | "SG" | "NZ" | "INTL";

export interface PayerEndpoint {
  purpose: "claims" | "eligibility" | "claimStatus" | "remittance" | "priorAuth";
  protocol: "edi_sftp" | "edi_https" | "soap" | "rest" | "portal";
  url?: string;
  receiverId?: string;      // EDI receiver ID (ISA08)
  interchangeQualifier?: string; // ISA05/ISA07
  notes?: string;
}

export interface Payer {
  payerId: string;           // unique; format: "{country}-{code}" e.g. "US-62308", "PH-PHIC"
  name: string;
  country: PayerCountry;
  integrationMode: IntegrationMode;
  status: PayerStatus;
  
  // Identifiers
  clearinghousePayerId?: string; // the ID used by the clearinghouse
  naic?: string;                 // National Association of Insurance Commissioners code (US)
  philhealthCode?: string;       // PhilHealth accreditation code (PH)
  
  // Endpoints
  endpoints: PayerEndpoint[];
  
  // Onboarding metadata
  enrollmentRequired: boolean;
  enrollmentNotes?: string;
  enrollmentUrl?: string;
  
  // Validation
  lastValidatedAt?: string;
  validationNotes?: string;
  
  // Metadata
  category?: string;         // "commercial", "government", "hmo", "workers_comp", etc.
  parentOrg?: string;        // parent payer/holding company
  aliases?: string[];        // alternative names
  
  createdAt: string;
  updatedAt: string;
}

/* ── Payer search / filter helpers ──────────────────────────── */

export interface PayerFilter {
  country?: PayerCountry;
  integrationMode?: IntegrationMode;
  status?: PayerStatus;
  category?: string;
  search?: string;           // free-text search on name/aliases
  limit?: number;
  offset?: number;
}

export function matchesPayer(payer: Payer, filter: PayerFilter): boolean {
  if (filter.country && payer.country !== filter.country) return false;
  if (filter.integrationMode && payer.integrationMode !== filter.integrationMode) return false;
  if (filter.status && payer.status !== filter.status) return false;
  if (filter.category && payer.category !== filter.category) return false;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    const haystack = [payer.name, payer.payerId, ...(payer.aliases ?? [])].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
