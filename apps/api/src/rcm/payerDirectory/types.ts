/**
 * Payer Directory — Canonical Types & Interfaces
 *
 * Phase 44: Global Payer Directory Engine + Jurisdiction Packs
 *
 * DirectoryPayer is the enriched canonical schema on top of the base Payer entity.
 * Importers produce DirectoryPayer[] from authoritative sources.
 * The normalization pipeline merges them into the runtime registry.
 */

import type { IntegrationMode, PayerCountry, PayerStatus } from '../domain/payer.js';

/* ── Payer Type ─────────────────────────────────────────────── */

export type PayerType = 'NATIONAL' | 'PRIVATE' | 'NETWORK' | 'CLEARINGHOUSE' | 'GOVERNMENT';

/* ── Channel ────────────────────────────────────────────────── */

export interface PayerChannel {
  type: 'EDI_CLEARINGHOUSE' | 'DIRECT_API' | 'PORTAL_BATCH' | 'NATIONAL_GATEWAY' | 'FHIR_R4';
  connectorId?: string;      // maps to RcmConnector registry
  receiverId?: string;       // e.g. ISA08 for EDI
  endpoint?: string;         // URL or SFTP host
  notes?: string;
}

/* ── Supported Transactions ─────────────────────────────────── */

export type TransactionType =
  | '837P' | '837I' | '837D'                  // claims
  | '835'                                      // remittance
  | '270' | '271'                              // eligibility
  | '276' | '277'                              // claim status
  | '278'                                      // prior auth
  | '999' | 'TA1'                              // ack
  | 'CF1' | 'CF2' | 'CF3' | 'CF4'             // PH eClaims
  | 'ACC_CLAIM' | 'ACC_STATUS'                 // NZ ACC
  | 'ECLIPSE_CLAIM' | 'ECLIPSE_REMIT';         // AU Medicare

/* ── Regulatory Source ──────────────────────────────────────── */

export interface RegulatorySource {
  authority: string;          // e.g. "Insurance Commission", "APRA", "CMS"
  documentTitle?: string;     // e.g. "List of HMOs with Certificates of Authority"
  documentDate?: string;      // ISO date of source document
  documentUrl?: string;       // URL of authoritative source
  snapshotHash?: string;      // SHA-256 of snapshot file
  snapshotPath?: string;      // path in repo (reference/payer-sources/...)
}

/* ── Network IDs ────────────────────────────────────────────── */

export interface NetworkIds {
  availityPayerId?: string;
  officeAllyPayerId?: string;
  stediPayerId?: string;
  cmsPayerId?: string;         // CMS PECOS / NPI crosswalk
  naicCode?: string;           // NAIC company code
  philhealthCode?: string;
  apraCode?: string;           // APRA registration number
}

/* ── Canonical Directory Payer ──────────────────────────────── */

export interface DirectoryPayer {
  payerId: string;            // stable, format: "{CC}-{CODE}" e.g. "PH-MAXICARE"
  displayName: string;
  country: PayerCountry;
  payerType: PayerType;

  channels: PayerChannel[];
  supportedTransactions: TransactionType[];
  payerIdsByNetwork: NetworkIds;
  regulatorySource?: RegulatorySource;

  // Integration
  integrationMode: IntegrationMode;
  status: PayerStatus;

  // Metadata
  category?: string;          // commercial, government, hmo, etc.
  parentOrg?: string;
  aliases?: string[];
  notes?: string;
  lastRefreshedAt?: string;   // ISO timestamp of last directory refresh

  createdAt: string;
  updatedAt: string;
}

/* ── Importer Interface ─────────────────────────────────────── */

export interface ImportResult {
  importerId: string;
  country: PayerCountry;
  payers: DirectoryPayer[];
  source: RegulatorySource;
  importedAt: string;
  errors: string[];
}

export interface PayerImporter {
  /** Unique importer ID, e.g. "PH_InsuranceCommission_HMO" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Target country */
  country: PayerCountry;
  /** Run import from snapshot data. Returns normalized payers. */
  importFromSnapshot(): ImportResult;
  /** Optional: run import from raw file upload (CSV/JSON) */
  importFromFile?(data: string, format: 'csv' | 'json'): ImportResult;
}

/* ── Diff Result ────────────────────────────────────────────── */

export interface PayerDiffEntry {
  payerId: string;
  displayName: string;
  change: 'added' | 'removed' | 'modified';
  fields?: string[];          // which fields changed (for 'modified')
}

export interface DirectoryDiffResult {
  importerId: string;
  timestamp: string;
  added: PayerDiffEntry[];
  removed: PayerDiffEntry[];
  modified: PayerDiffEntry[];
  unchanged: number;
}

/* ── Enrollment Packet ──────────────────────────────────────── */

export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'TESTING' | 'LIVE' | 'SUSPENDED';

export interface EnrollmentContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface EnrollmentChecklist {
  step: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface EnrollmentPacket {
  payerId: string;
  networkId?: string;         // clearinghouse or network entity
  orgIdentifiers: {
    npi?: string;
    taxId?: string;
    tradingPartnerId?: string;
    submitterId?: string;
  };
  certRequirements?: string[];
  goLiveChecklist: EnrollmentChecklist[];
  contacts: EnrollmentContact[];
  testingSteps?: string[];
  enrollmentStatus: EnrollmentStatus;
  enrollmentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Routing ────────────────────────────────────────────────── */

export interface RouteSelection {
  payerId: string;
  jurisdiction: PayerCountry;
  connectorId: string;
  channel: PayerChannel;
  confidence: 'exact' | 'inferred' | 'fallback';
  notes?: string;
}

export interface RouteNotFound {
  code: 'ROUTE_NOT_FOUND';
  payerId: string;
  jurisdiction: PayerCountry;
  remediation: string[];
}
